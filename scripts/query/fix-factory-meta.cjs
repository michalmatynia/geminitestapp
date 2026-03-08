#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = process.cwd();
const SOURCE_ROOT = path.join(ROOT, 'src');
const EXTENSIONS = new Set(['.ts', '.tsx']);
const IGNORED_DIRS = new Set(['node_modules', '.next', '__tests__', 'dist']);
const IGNORED_FILES = new Set(['src/shared/lib/query-factories-v2.ts']);
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
const MANUAL_HELPER_CALLS = new Set(['prefetchQueryV2', 'fetchQueryV2', 'ensureQueryDataV2']);
const MALFORMED_COMMA_PATTERN = /\n([ \t]*),\n([ \t]*[A-Za-z_][A-Za-z0-9_]*\s*:)/g;

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

const normalizePath = (value) => value.replace(/\\/g, '/').replace(/^\.\//, '');

const getScriptKindForFile = (filePath) => {
  switch (path.extname(filePath)) {
    case '.tsx':
      return ts.ScriptKind.TSX;
    default:
      return ts.ScriptKind.TS;
  }
};

const listSourceFiles = (absoluteDir, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.next') || IGNORED_DIRS.has(entry.name)) continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listSourceFiles(absolutePath, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!EXTENSIONS.has(path.extname(entry.name))) continue;
    acc.push(absolutePath);
  }
  return acc;
};

const getCallName = (callExpression) => {
  const expression = callExpression.expression;
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return null;
};

const findObjectProperty = (objectLiteral, propertyName) =>
  objectLiteral.properties.find((prop) => {
    if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
      const name = prop.name;
      if (ts.isIdentifier(name) && name.text === propertyName) return true;
      if (ts.isStringLiteral(name) && name.text === propertyName) return true;
    }
    return false;
  });

const readStringLiteralValue = (expression) => {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (ts.isAsExpression(expression)) {
    return readStringLiteralValue(expression.expression);
  }
  return null;
};

const extractMetaObject = (metaProperty) => {
  if (!metaProperty || !ts.isPropertyAssignment(metaProperty)) return null;
  return ts.isObjectLiteralExpression(metaProperty.initializer) ? metaProperty.initializer : null;
};

const getLineStart = (text, position) => {
  const lineBreak = text.lastIndexOf('\n', Math.max(0, position - 1));
  return lineBreak === -1 ? 0 : lineBreak + 1;
};

const getIndentAt = (text, position) => {
  const lineStart = getLineStart(text, position);
  const linePrefix = text.slice(lineStart, position);
  const match = linePrefix.match(/^\s*/);
  return match ? match[0] : '';
};

const escapeStringLiteral = (value) =>
  value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');

const humanizeIdentifier = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const readPropertyStringValue = (property) =>
  property && ts.isPropertyAssignment(property) ? readStringLiteralValue(property.initializer) : null;

const readMetaFields = (metaObject) => {
  const operationProperty = findObjectProperty(metaObject, 'operation');
  const resourceProperty = findObjectProperty(metaObject, 'resource');
  const sourceProperty = findObjectProperty(metaObject, 'source');
  return {
    operation: readPropertyStringValue(operationProperty),
    resource: readPropertyStringValue(resourceProperty),
    source: readPropertyStringValue(sourceProperty),
  };
};

const buildLegacyDescription = (metaObject) => {
  const { operation, resource, source } = readMetaFields(metaObject);

  if (operation && resource) {
    return `Tracks ${operation} requests for ${resource}.`;
  }
  if (resource) {
    return `Tracks requests for ${resource}.`;
  }
  if (source) {
    return `Tracks requests from ${source}.`;
  }
  return 'Tracks query and mutation requests.';
};

const buildDescription = (metaObject) => {
  const { operation, resource, source } = readMetaFields(metaObject);

  const resourceLabel = resource ? humanizeIdentifier(resource) : null;
  const sourceLabel = source ? humanizeIdentifier(source.split('.').pop() ?? source) : null;
  const subject = resourceLabel || sourceLabel;

  if (operation && subject) {
    switch (operation) {
      case 'list':
      case 'detail':
        return `Loads ${subject}.`;
      case 'polling':
        return `Polls ${subject}.`;
      case 'create':
        return `Creates ${subject}.`;
      case 'update':
        return `Updates ${subject}.`;
      case 'delete':
        return `Deletes ${subject}.`;
      case 'action':
        return `Runs ${subject}.`;
      case 'upload':
        return `Uploads ${subject}.`;
      case 'infinite':
        return `Loads paginated ${subject}.`;
      default:
        return `Handles ${subject}.`;
    }
  }
  if (subject) {
    return `Handles ${subject}.`;
  }
  return 'Handles query and mutation requests.';
};

const createDescriptionReplaceEdit = (descriptionProperty, metaObject) => {
  if (!ts.isPropertyAssignment(descriptionProperty)) return null;
  return {
    start: descriptionProperty.initializer.getStart(),
    end: descriptionProperty.initializer.getEnd(),
    text: `'${escapeStringLiteral(buildDescription(metaObject))}'`,
  };
};

const createDescriptionEdit = (metaObject, text) => {
  const description = escapeStringLiteral(buildDescription(metaObject));
  const domainProperty = findObjectProperty(metaObject, 'domain');
  if (domainProperty) {
    const insertionPos = getLineStart(text, domainProperty.getStart());
    const propertyIndent = getIndentAt(text, domainProperty.getStart());
    return {
      start: insertionPos,
      end: insertionPos,
      text: `${propertyIndent}description: '${description}',\n`,
    };
  }

  const insertionPos = metaObject.getEnd() - 1;
  const lastProperty = metaObject.properties[metaObject.properties.length - 1];
  const propertyIndent = lastProperty
    ? getIndentAt(text, lastProperty.getStart())
    : `${getIndentAt(text, insertionPos)}  `;
  return {
    start: insertionPos,
    end: insertionPos,
    text: `\n${propertyIndent}description: '${description}',`,
  };
};

const createPropertyRemovalEdit = (property, text) => {
  const start = getLineStart(text, property.getStart());
  let end = property.getEnd();
  if (text[end] === '\r' && text[end + 1] === '\n') {
    end += 2;
  } else if (text[end] === '\n') {
    end += 1;
  }
  return { start, end, text: '' };
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

const fixFactoryMetaSourceText = (rawText, relFilePath, scriptKind = getScriptKindForFile(relFilePath)) => {
  if (IGNORED_FILES.has(relFilePath)) return rawText;
  const text = rawText.replace(MALFORMED_COMMA_PATTERN, '\n$2');
  const sourceFile = ts.createSourceFile(
    relFilePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  const edits = [];

  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const callName = getCallName(node);
      if (callName && FACTORY_CALLS.has(callName)) {
        const configArgIndex = MANUAL_HELPER_CALLS.has(callName) ? 1 : 0;
        const configArg = node.arguments[configArgIndex];
        if (configArg && ts.isObjectLiteralExpression(configArg)) {
          if (callName === 'createMultiQueryV2' || callName === 'createSuspenseMultiQueryV2') {
            const topLevelQueryKeyProperty = findObjectProperty(configArg, 'queryKey');
            if (topLevelQueryKeyProperty) {
              edits.push(createPropertyRemovalEdit(topLevelQueryKeyProperty, text));
            }
            const queriesProperty = findObjectProperty(configArg, 'queries');
            if (queriesProperty && ts.isPropertyAssignment(queriesProperty)) {
              const descriptorObjects = collectQueryDescriptorObjects(queriesProperty.initializer);
              descriptorObjects.forEach((descriptorObject) => {
                const metaProperty = findObjectProperty(descriptorObject, 'meta');
                const metaObject = extractMetaObject(metaProperty);
                if (!metaObject) return;
                const descriptionProperty = findObjectProperty(metaObject, 'description');
                if (!descriptionProperty) {
                  edits.push(createDescriptionEdit(metaObject, text));
                } else {
                  const currentDescription = readPropertyStringValue(descriptionProperty);
                  const legacyDescription = buildLegacyDescription(metaObject);
                  const nextDescription = buildDescription(metaObject);
                  if (currentDescription === legacyDescription && currentDescription !== nextDescription) {
                    const replaceEdit = createDescriptionReplaceEdit(descriptionProperty, metaObject);
                    if (replaceEdit) edits.push(replaceEdit);
                  }
                }
              });
            }
          } else {
            const metaProperty = findObjectProperty(configArg, 'meta');
            const metaObject = extractMetaObject(metaProperty);
            if (metaObject) {
              const descriptionProperty = findObjectProperty(metaObject, 'description');
              if (!descriptionProperty) {
                edits.push(createDescriptionEdit(metaObject, text));
              } else {
                const currentDescription = readPropertyStringValue(descriptionProperty);
                const legacyDescription = buildLegacyDescription(metaObject);
                const nextDescription = buildDescription(metaObject);
                if (currentDescription === legacyDescription && currentDescription !== nextDescription) {
                  const replaceEdit = createDescriptionReplaceEdit(descriptionProperty, metaObject);
                  if (replaceEdit) edits.push(replaceEdit);
                }
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  if (edits.length === 0) {
    return text;
  }

  edits.sort((left, right) => right.start - left.start || right.end - left.end);
  let output = text;
  for (const edit of edits) {
    output = `${output.slice(0, edit.start)}${edit.text}${output.slice(edit.end)}`;
  }

  return output;
};

const inspectFile = (absolutePath) => {
  const relFilePath = normalizePath(path.relative(ROOT, absolutePath));
  if (IGNORED_FILES.has(relFilePath)) return false;

  const rawText = fs.readFileSync(absolutePath, 'utf8');
  const output = fixFactoryMetaSourceText(rawText, relFilePath, getScriptKindForFile(absolutePath));

  if (output !== rawText) {
    fs.writeFileSync(absolutePath, output, 'utf8');
    return true;
  }
  return false;
};

const run = () => {
  const files = listSourceFiles(SOURCE_ROOT);
  let updatedCount = 0;
  for (const filePath of files) {
    if (inspectFile(filePath)) updatedCount += 1;
  }
  console.log(`[fix-factory-meta] updated ${updatedCount} file(s)`);
};

module.exports = {
  buildDescription,
  buildLegacyDescription,
  fixFactoryMetaSourceText,
  getScriptKindForFile,
};

if (require.main === module) {
  run();
}
