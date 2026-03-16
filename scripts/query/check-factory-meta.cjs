#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const FACTORY_META_ROOTS = ['src'];
const FACTORY_META_EXTENSIONS = new Set(['.ts', '.tsx']);
const REPO_CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs']);
const FACTORY_CALLS = new Set([
  'createListQueryV2',
  'createSingleQueryV2',
  'createPaginatedListQueryV2',
  'createInfiniteQueryV2',
  'createMultiQueryV2',
  'createSuspenseQueryV2',
  'createSuspenseInfiniteQueryV2',
  'createSuspenseMultiQueryV2',
  'createMutationV2',
  'createCreateMutationV2',
  'createUpdateMutationV2',
  'createDeleteMutationV2',
  'createSaveMutationV2',
  'createOptimisticMutationV2',
  'useEnsureQueryDataV2',
  'usePrefetchQueryV2',
  'useFetchQueryV2',
  'ensureQueryDataV2',
  'fetchQueryV2',
  'prefetchQueryV2',
]);
const MULTI_QUERY_CALLS = new Set(['createMultiQueryV2', 'createSuspenseMultiQueryV2']);

const FACTORY_META_IGNORED_DIRS = new Set(['node_modules', '.next', '__tests__', 'dist']);
const REPO_SCAN_IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'public',
  'tmp',
  'temp',
]);
const FACTORY_META_IGNORED_FILES = new Set(['src/shared/lib/query-factories-v2.ts']);
const RAW_QUERY_EXECUTION_ALLOWLIST = new Set([
  'src/shared/lib/query-factories-v2.ts',
  'src/shared/lib/tanstack-factory-v2/executors.ts',
]);
const RAW_QUERY_EXECUTION_METHODS = new Set(['fetchQuery', 'prefetchQuery', 'ensureQueryData']);
const LOW_SIGNAL_DESCRIPTION_PATTERNS = [
  /^Handles query and mutation requests\.$/,
  /^(Loads|Creates|Updates|Deletes|Runs|Uploads) (list|detail|create|update|delete|action|upload)\.$/,
];

const unwrapExpression = (expression) => {
  let current = expression;
  while (
    current &&
    (ts.isAsExpression(current) ||
      ts.isParenthesizedExpression(current) ||
      (typeof ts.isSatisfiesExpression === 'function' && ts.isSatisfiesExpression(current)))
  ) {
    current = current.expression;
  }
  return current;
};

// Config: force all createMutationV2 to use 'action' if STRICT_GENERIC_ACTION is true.
// Otherwise they can use any operation.
const STRICT_GENERIC_ACTION = true;

// Config: force all operation-specific aliases to match their intended operation.
const STRICT_ALIAS_OPERATION = true;

const OPERATION_EXPECTATIONS = {
  createListQueryV2: new Set(['list', 'search', 'polling']),
  createSingleQueryV2: new Set(['detail', 'info', 'check', 'exists', 'polling']),
  createPaginatedListQueryV2: new Set(['list', 'search']),
  createInfiniteQueryV2: new Set(['list', 'search', 'infinite']),
  createSuspenseQueryV2: new Set(['detail', 'info', 'check', 'exists', 'list']),
  createSuspenseInfiniteQueryV2: new Set(['list', 'search', 'infinite']),
  createMutationV2: new Set(['create', 'update', 'delete', 'sync', 'action', 'bulk', 'upload']),
  createCreateMutationV2: new Set(['create']),
  createUpdateMutationV2: new Set(['update', 'sync', 'action']),
  createDeleteMutationV2: new Set(['delete', 'bulk']),
  createSaveMutationV2: new Set(['create', 'update', 'sync', 'action', 'save']),
};

const normalizePath = (value) => value.replace(/\\/g, '/').replace(/^\.\//, '');

const isIgnoredDirName = (name, ignoredDirs) => name.startsWith('.next') || ignoredDirs.has(name);

const getScriptKindForFile = (filePath) => {
  switch (path.extname(filePath)) {
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.js':
    case '.mjs':
    case '.cjs':
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
};

const getCallName = (callExpression) => {
  const expression = callExpression.expression;
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  return null;
};

const getLineNumber = (sourceFile, node) => {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  return line + 1;
};

const findObjectProperty = (objectLiteral, propertyName) => {
  return objectLiteral.properties.find((prop) => {
    if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
      const name = prop.name;
      if (ts.isIdentifier(name) && name.text === propertyName) {
        return true;
      }
      if (ts.isStringLiteral(name) && name.text === propertyName) {
        return true;
      }
    }
    return false;
  });
};

const readStringLiteralValue = (expression) => {
  if (ts.isStringLiteral(expression)) {
    return expression.text;
  }
  if (ts.isAsExpression(expression) && ts.isStringLiteral(expression.expression)) {
    return expression.expression.text;
  }
  return null;
};

const extractMetaObject = (metaProperty) => {
  if (!metaProperty) return null;
  if (ts.isPropertyAssignment(metaProperty)) {
    const init = metaProperty.initializer;
    if (ts.isObjectLiteralExpression(init)) {
      return init;
    }
  }
  return null;
};

const isLowSignalDescription = (descriptionValue) =>
  LOW_SIGNAL_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(descriptionValue));

const isFactoryMetaPlaceholderQueryKey = (expression) => {
  const unwrapped = unwrapExpression(expression);
  if (!unwrapped || !ts.isArrayLiteralExpression(unwrapped)) return false;
  const [firstElement] = unwrapped.elements;
  return Boolean(firstElement && readStringLiteralValue(firstElement) === 'factory-meta');
};

const collectQueryDescriptorObjects = (expression, acc = []) => {
  const current = unwrapExpression(expression);
  if (!current) return acc;

  if (ts.isObjectLiteralExpression(current)) {
    acc.push(current);
    return acc;
  }

  if (ts.isArrayLiteralExpression(current)) {
    current.elements.forEach((element) => collectQueryDescriptorObjects(element, acc));
    return acc;
  }

  if (
    ts.isCallExpression(current) &&
    ts.isPropertyAccessExpression(current.expression) &&
    current.expression.name.text === 'map'
  ) {
    const callback = current.arguments[0];
    if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
      collectQueryDescriptorObjects(callback.body, acc);
    }
    return acc;
  }

  if (ts.isBlock(current)) {
    current.statements.forEach((statement) => {
      if (ts.isReturnStatement(statement) && statement.expression) {
        collectQueryDescriptorObjects(statement.expression, acc);
      }
    });
    return acc;
  }

  if (ts.isConditionalExpression(current)) {
    collectQueryDescriptorObjects(current.whenTrue, acc);
    collectQueryDescriptorObjects(current.whenFalse, acc);
  }

  return acc;
};

const inspectMultiQueryDescriptor = (descriptorObject, sourceFile, relFilePath, callName, issues) => {
  const line = getLineNumber(sourceFile, descriptorObject);
  const queryKeyProperty = findObjectProperty(descriptorObject, 'queryKey');
  if (!queryKeyProperty) {
    issues.push({
      file: relFilePath,
      line,
      callName,
      message: 'multi-query descriptors must define `queryKey`.',
    });
  } else if (
    ts.isPropertyAssignment(queryKeyProperty) &&
    isFactoryMetaPlaceholderQueryKey(queryKeyProperty.initializer)
  ) {
    issues.push({
      file: relFilePath,
      line,
      callName,
      message: 'synthetic `factory-meta` query keys are forbidden. Use a canonical domain query key.',
    });
  }

  const metaProperty = findObjectProperty(descriptorObject, 'meta');
  if (!metaProperty) {
    issues.push({
      file: relFilePath,
      line,
      callName,
      message: 'multi-query descriptors must include `meta`.',
    });
    return;
  }

  const metaObject = extractMetaObject(metaProperty);
  if (!metaObject) {
    issues.push({
      file: relFilePath,
      line,
      callName,
      message: 'multi-query descriptor `meta` must be an object literal.',
    });
    return;
  }

  const domainProperty = findObjectProperty(metaObject, 'domain');
  if (!domainProperty) {
    issues.push({
      file: relFilePath,
      line,
      callName,
      message: 'missing `domain` in multi-query descriptor `meta`.',
    });
  }

  const descriptionProperty = findObjectProperty(metaObject, 'description');
  if (!descriptionProperty) {
    issues.push({
      file: relFilePath,
      line,
      callName,
      message:
        'missing `description` in multi-query descriptor `meta`. Adding a description improves debugging and monitoring.',
    });
  } else if (ts.isPropertyAssignment(descriptionProperty)) {
    const descriptionValue = readStringLiteralValue(descriptionProperty.initializer);
    if (descriptionValue && isLowSignalDescription(descriptionValue)) {
      issues.push({
        file: relFilePath,
        line,
        callName,
        message:
          'multi-query descriptor `meta.description` is too generic. Use a resource-specific description that explains what the query does.',
      });
    }
  }
};

const inspectFactoryMetaCallExpression = (callExpression, sourceFile, relFilePath, issues) => {
  const callName = getCallName(callExpression);
  if (!callName || !FACTORY_CALLS.has(callName)) {
    return;
  }

  const line = getLineNumber(sourceFile, callExpression);
  const isManualHelperCall = new Set(['prefetchQueryV2', 'fetchQueryV2', 'ensureQueryDataV2']).has(
    callName
  );
  const isMultiQueryCall = MULTI_QUERY_CALLS.has(callName);
  const configArgIndex = isManualHelperCall ? 1 : 0;
  const configArg = callExpression.arguments[configArgIndex];

  if (!configArg || !ts.isObjectLiteralExpression(configArg)) {
    issues.push({
      file: relFilePath,
      line,
      callName,
      message: `factory call must use an object literal config with \`meta\` at argument ${configArgIndex}.`,
    });
    return;
  }

  // Check for missing queryKey (queries only)
  const isQueryFactory = callName.includes('Query') || callName.includes('query');
  if (isQueryFactory && !isMultiQueryCall) {
    const queryKeyProperty = findObjectProperty(configArg, 'queryKey');
    if (!queryKeyProperty) {
      const keyProperty = findObjectProperty(configArg, 'key');
      if (!keyProperty) {
        issues.push({
          file: relFilePath,
          line,
          callName,
          message: 'missing `queryKey` in factory config. Queries must have an explicit cache key.',
        });
      }
    } else if (ts.isPropertyAssignment(queryKeyProperty)) {
      if (isFactoryMetaPlaceholderQueryKey(queryKeyProperty.initializer)) {
        issues.push({
          file: relFilePath,
          line,
          callName,
          message: 'synthetic `factory-meta` query keys are forbidden. Use a canonical domain query key.',
        });
      }
    }
  }

  const metaProperty = findObjectProperty(configArg, 'meta');
  if (!metaProperty && callName !== 'createMultiQueryV2' && callName !== 'createSuspenseMultiQueryV2') {
    issues.push({
      file: relFilePath,
      line,
      callName,
      message: 'missing `meta` in factory config.',
    });
    return;
  }

  if (isMultiQueryCall) {
    const topLevelQueryKeyProperty = findObjectProperty(configArg, 'queryKey');
    if (topLevelQueryKeyProperty) {
      issues.push({
        file: relFilePath,
        line,
        callName,
        message: 'top-level `queryKey` is not used by multi-query factories and should be removed.',
      });
    }

    const queriesProperty = findObjectProperty(configArg, 'queries');
    if (queriesProperty && ts.isPropertyAssignment(queriesProperty)) {
      const descriptorObjects = collectQueryDescriptorObjects(queriesProperty.initializer);
      descriptorObjects.forEach((descriptorObject) => {
        inspectMultiQueryDescriptor(descriptorObject, sourceFile, relFilePath, callName, issues);
      });
    }
    return;
  }

  const metaObject = extractMetaObject(metaProperty);
  if (metaObject) {
    const domainProperty = findObjectProperty(metaObject, 'domain');
    if (!domainProperty) {
      issues.push({
        file: relFilePath,
        line,
        callName,
        message: 'missing `domain` in `meta`.',
      });
    }

    // Check for missing description in meta (warn — not blocking)
    const descriptionProperty = findObjectProperty(metaObject, 'description');
    if (!descriptionProperty) {
      issues.push({
        file: relFilePath,
        line,
        callName,
        message: 'missing `description` in `meta`. Adding a description improves debugging and monitoring.',
      });
    } else if (ts.isPropertyAssignment(descriptionProperty)) {
      const descriptionValue = readStringLiteralValue(descriptionProperty.initializer);
      if (descriptionValue && isLowSignalDescription(descriptionValue)) {
        issues.push({
          file: relFilePath,
          line,
          callName,
          message:
            'meta.description is too generic. Use a resource-specific description that explains what the query or mutation does.',
        });
      }
    }
  } else {
    issues.push({
      file: relFilePath,
      line,
      callName,
      message: 'meta must be an object literal to check for `domain`.',
    });
    return;
  }

  const expectedOperations = OPERATION_EXPECTATIONS[callName];
  if (!expectedOperations || !STRICT_ALIAS_OPERATION) {
    if (callName !== 'createMutationV2' || !STRICT_GENERIC_ACTION) {
      return;
    }

    const operationProperty = findObjectProperty(metaObject, 'operation');
    if (!operationProperty || !ts.isPropertyAssignment(operationProperty)) {
      issues.push({
        file: relFilePath,
        line,
        callName,
        message: 'meta.operation is required for createMutationV2.',
      });
      return;
    }

    const operationValue = readStringLiteralValue(operationProperty.initializer);
    if (operationValue === 'action' || operationValue === 'upload') {
      return;
    }

    if (operationValue === null) {
      issues.push({
        file: relFilePath,
        line,
        callName,
        message: "meta.operation should be the string literal 'action' or 'upload' for createMutationV2.",
      });
      return;
    }

    issues.push({
      file: relFilePath,
      line,
      callName,
      message:
        "createMutationV2 must use meta.operation: 'action' or 'upload'. Use operation-specific aliases for create/update/delete.",
    });
    return;
  }

  const operationProperty = findObjectProperty(metaObject, 'operation');
  if (!operationProperty || !ts.isPropertyAssignment(operationProperty)) {
    issues.push({
      file: relFilePath,
      line,
      callName,
      message: 'meta.operation is required for operation-specific factory calls.',
    });
    return;
  }

  const operationValue = readStringLiteralValue(operationProperty.initializer);
  if (operationValue && expectedOperations.has(operationValue)) {
    return;
  }

  if (operationValue === null) {
    issues.push({
      file: relFilePath,
      line,
      callName,
      message: 'meta.operation should be a string literal.',
    });
    return;
  }

  issues.push({
    file: relFilePath,
    line,
    callName,
    message: `meta.operation should be one of: ${Array.from(expectedOperations).join(', ')}.`,
  });
};

const inspectForbiddenManualQueryExecutionCallExpression = (
  callExpression,
  sourceFile,
  relFilePath,
  issues
) => {
  const expression = callExpression.expression;
  if (!ts.isPropertyAccessExpression(expression)) {
    return;
  }

  const methodName = expression.name.text;
  if (!RAW_QUERY_EXECUTION_METHODS.has(methodName)) {
    return;
  }

  issues.push({
    file: relFilePath,
    line: getLineNumber(sourceFile, callExpression),
    callName: methodName,
    message: `raw \`.${methodName}(...)\` is forbidden outside the telemetrized manual query helper implementation. Use ${methodName}V2-compatible helpers from \`@/shared/lib/query-factories-v2\`.`,
  });
};

const inspectFactoryMetaSourceFile = (source, relFilePath, scriptKind) => {
  if (FACTORY_META_IGNORED_FILES.has(relFilePath)) {
    return [];
  }

  const sourceFile = ts.createSourceFile(
    relFilePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  const issues = [];
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      inspectFactoryMetaCallExpression(node, sourceFile, relFilePath, issues);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return issues;
};

const inspectForbiddenManualQueryExecutionSourceFile = (source, relFilePath, scriptKind) => {
  if (RAW_QUERY_EXECUTION_ALLOWLIST.has(relFilePath)) {
    return [];
  }

  const sourceFile = ts.createSourceFile(
    relFilePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  const issues = [];
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      inspectForbiddenManualQueryExecutionCallExpression(node, sourceFile, relFilePath, issues);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return issues;
};

const walkFiles = (dirPath, options, collector) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (isIgnoredDirName(entry.name, options.ignoredDirs)) continue;
    const absPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(absPath, options, collector);
      continue;
    }
    if (!options.extensions.has(path.extname(entry.name))) continue;
    collector(absPath);
  }
};

const collectIssuesFromRoots = (rootDir, roots, options) => {
  const issues = [];

  for (const root of roots) {
    const absRoot = path.resolve(rootDir, root);
    if (!fs.existsSync(absRoot)) continue;
    walkFiles(absRoot, options, (absPath) => {
      const relPath = normalizePath(path.relative(rootDir, absPath));
      const source = fs.readFileSync(absPath, 'utf8');
      const scriptKind = getScriptKindForFile(absPath);
      issues.push(...options.inspectSource(source, relPath, scriptKind));
    });
  }

  return issues;
};

const collectFactoryMetaIssues = (rootDir = process.cwd()) =>
  collectIssuesFromRoots(rootDir, FACTORY_META_ROOTS, {
    extensions: FACTORY_META_EXTENSIONS,
    ignoredDirs: FACTORY_META_IGNORED_DIRS,
    inspectSource: inspectFactoryMetaSourceFile,
  });

const collectForbiddenManualQueryExecutionIssues = (rootDir = process.cwd()) =>
  collectIssuesFromRoots(rootDir, ['.'], {
    extensions: REPO_CODE_EXTENSIONS,
    ignoredDirs: REPO_SCAN_IGNORED_DIRS,
    inspectSource: inspectForbiddenManualQueryExecutionSourceFile,
  });

const logIssues = (title, issues) => {
  if (issues.length === 0) return;
  console.error(`\n${title}\n`);
  for (const issue of issues) {
    console.error(`${issue.file}:${issue.line} ${issue.callName} - ${issue.message}`);
  }
};

const runCheckFactoryMeta = (rootDir = process.cwd()) => {
  const factoryMetaIssues = collectFactoryMetaIssues(rootDir);
  const forbiddenManualQueryIssues = collectForbiddenManualQueryExecutionIssues(rootDir);

  if (factoryMetaIssues.length > 0 || forbiddenManualQueryIssues.length > 0) {
    logIssues('Found v2 factory metadata issues:', factoryMetaIssues);
    logIssues('Found forbidden raw manual query execution calls:', forbiddenManualQueryIssues);
    return 1;
  }

  console.log(
    'OK: all v2 factory calls include `meta` with mandatory `domain`, and no forbidden raw manual query execution calls were found.'
  );
  return 0;
};

module.exports = {
  collectFactoryMetaIssues,
  collectForbiddenManualQueryExecutionIssues,
  getScriptKindForFile,
  inspectFactoryMetaSourceFile,
  inspectForbiddenManualQueryExecutionSourceFile,
  isLowSignalDescription,
  RAW_QUERY_EXECUTION_ALLOWLIST,
  runCheckFactoryMeta,
};

if (require.main === module) {
  process.exit(runCheckFactoryMeta());
}
