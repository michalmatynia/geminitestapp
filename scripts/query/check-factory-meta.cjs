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
  'createOptimisticMutationV2',
  'useEnsureQueryDataV2',
  'usePrefetchQueryV2',
]);

const OPERATION_EXPECTATIONS = {
  createCreateMutationV2: new Set(['create', 'action', 'upload']),
  createUpdateMutationV2: new Set(['update', 'action', 'upload']),
  createDeleteMutationV2: new Set(['delete', 'action']),
};
const STRICT_ALIAS_OPERATION = process.env.CHECK_FACTORY_META_STRICT_ALIAS === '1';
const STRICT_GENERIC_ACTION = process.env.CHECK_FACTORY_META_STRICT_GENERIC_ACTION !== '0';

const IGNORED_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'tmp', 'public']);

const propertyNameText = (nameNode) => {
  if (!nameNode) return null;
  if (ts.isIdentifier(nameNode)) return nameNode.text;
  if (ts.isStringLiteral(nameNode)) return nameNode.text;
  if (ts.isNumericLiteral(nameNode)) return nameNode.text;
  return null;
};

const findObjectProperty = (objectNode, propertyName) => {
  for (const property of objectNode.properties) {
    if (ts.isShorthandPropertyAssignment(property) && property.name.text === propertyName) {
      return property;
    }
    if (!ts.isPropertyAssignment(property) && !ts.isMethodDeclaration(property)) {
      continue;
    }
    const currentName = propertyNameText(property.name);
    if (currentName === propertyName) return property;
  }
  return null;
};

const unwrapExpression = (expression) => {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    (typeof ts.isSatisfiesExpression === 'function' && ts.isSatisfiesExpression(current))
  ) {
    current = current.expression;
  }
  return current;
};

const readStringLiteralValue = (expression) => {
  const unwrapped = unwrapExpression(expression);
  if (ts.isStringLiteral(unwrapped) || ts.isNoSubstitutionTemplateLiteral(unwrapped)) {
    return unwrapped.text;
  }
  return null;
};

const extractMetaObject = (metaProperty) => {
  if (!ts.isPropertyAssignment(metaProperty)) return null;
  const initializer = unwrapExpression(metaProperty.initializer);
  if (!ts.isObjectLiteralExpression(initializer)) return null;
  return initializer;
};

const getCallName = (callExpression) => {
  if (ts.isIdentifier(callExpression.expression)) {
    return callExpression.expression.text;
  }
  if (ts.isPropertyAccessExpression(callExpression.expression)) {
    return callExpression.expression.name.text;
  }
  return null;
};

const getLineNumber = (sourceFile, node) =>
  sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

const inspectCallExpression = (callExpression, sourceFile, relFilePath, issues) => {
  const callName = getCallName(callExpression);
  if (!callName || !FACTORY_CALLS.has(callName)) {
    return;
  }

  const line = getLineNumber(sourceFile, callExpression);
  const configArg = callExpression.arguments[0];
  if (!configArg || !ts.isObjectLiteralExpression(configArg)) {
    issues.push({
      file: relFilePath,
      line,
      callName,
      message: 'factory call must use an object literal config with `meta`.',
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

  if (callName === 'createMultiQueryV2') {
    // For createMultiQueryV2, we skip top-level meta but could potentially check nested queries.
    // However, the current script structure is geared towards top-level objects.
    return;
  }

  const expectedOperations = OPERATION_EXPECTATIONS[callName];
  if (!expectedOperations || !STRICT_ALIAS_OPERATION) {
    if (callName !== 'createMutationV2' || !STRICT_GENERIC_ACTION) {
      return;
    }

    const metaObject = extractMetaObject(metaProperty);
    if (!metaObject) {
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
    if (operationValue === 'action') {
      return;
    }

    if (operationValue === null) {
      issues.push({
        file: relFilePath,
        line,
        callName,
        message: "meta.operation should be the string literal 'action' for createMutationV2.",
      });
      return;
    }

    issues.push({
      file: relFilePath,
      line,
      callName,
      message:
        "createMutationV2 must use meta.operation: 'action'. Use operation-specific aliases for create/update/delete.",
    });
    return;
  }

  const metaObject = extractMetaObject(metaProperty);
  if (!metaObject) {
    return;
  }

  const operationProperty = findObjectProperty(metaObject, 'operation');
  if (!operationProperty || !ts.isPropertyAssignment(operationProperty)) {
    issues.push({
      file: relFilePath,
      line,
      callName,
      message: 'meta.operation is required for operation-specific mutation aliases.',
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
      message: 'meta.operation should be a string literal for operation-specific mutation aliases.',
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
    const relPath = absPath.replace(/\\/g, '/');
    const source = fs.readFileSync(absPath, 'utf8');
    const scriptKind = path.extname(absPath) === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const issues = inspectSourceFile(source, relPath, scriptKind);
    allIssues.push(...issues);
  });
}

if (allIssues.length > 0) {
  console.error('Found v2 factory metadata issues:\n');
  for (const issue of allIssues) {
    console.error(`${issue.file}:${issue.line} ${issue.callName} - ${issue.message}`);
  }
  process.exit(1);
}

console.log('OK: all v2 factory calls include `meta`.');
