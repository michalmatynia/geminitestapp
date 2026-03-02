#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOTS = ['src'];
const EXTENSIONS = new Set(['.ts', '.tsx']);
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
  'fetchQueryV2',
  'prefetchQueryV2',
]);

const IGNORED_DIRS = new Set(['node_modules', '.next', '__tests__', 'dist']);
const IGNORED_FILES = new Set(['src/shared/lib/query-factories-v2.ts']);

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

const inspectCallExpression = (callExpression, sourceFile, relFilePath, issues) => {
  const callName = getCallName(callExpression);
  if (!callName || !FACTORY_CALLS.has(callName)) {
    return;
  }

  const line = getLineNumber(sourceFile, callExpression);
  const isNonHookFetch = callName === 'prefetchQueryV2' || callName === 'fetchQueryV2';
  const configArgIndex = isNonHookFetch ? 1 : 0;
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

  const metaProperty = findObjectProperty(configArg, 'meta');
  if (!metaProperty && callName !== 'createMultiQueryV2') {
    issues.push({
      file: relFilePath,
      line,
      callName,
      message: 'missing `meta` in factory config.',
    });
    return;
  }

  if (callName === 'createMultiQueryV2' || callName === 'createSuspenseMultiQueryV2') {
    // For MultiQuery we skip top-level domain check as it's defined per query.
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

const inspectSourceFile = (source, relFilePath, scriptKind) => {
  if (IGNORED_FILES.has(relFilePath)) {
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
      inspectCallExpression(node, sourceFile, relFilePath, issues);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return issues;
};

const walkFiles = (dirPath, collector) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const absPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(absPath, collector);
      continue;
    }
    if (!EXTENSIONS.has(path.extname(entry.name))) continue;
    collector(absPath);
  }
};

const allIssues = [];

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  walkFiles(root, (absPath) => {
    const relPath = absPath.replace(/\\/g, '/').replace(/^\.\//, '');
    const source = fs.readFileSync(absPath, 'utf8');
    const scriptKind = path.extname(absPath) === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const issues = inspectSourceFile(source, relPath, scriptKind);
    allIssues.push(...issues);
  });
}

if (allIssues.length > 0) {
  console.error('\nFound v2 factory metadata issues:\n');
  for (const issue of allIssues) {
    console.error(`${issue.file}:${issue.line} ${issue.callName} - ${issue.message}`);
  }
  process.exit(1);
}

console.log('OK: all v2 factory calls include `meta` with mandatory `domain`.');
