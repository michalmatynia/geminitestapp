import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import {
  createIssue,
  sortIssues,
  summarizeIssues,
  summarizeRules,
  toRepoRelativePath,
} from './check-runner.mjs';

const SOURCE_DIRS = ['src/features', 'src/shared'];
const CONTEXT_FILE_PATTERNS = [/Context\.tsx$/, /context\.tsx$/];
const PROVIDER_VALUE_FIELD_THRESHOLD = 15;
const OVERSIZED_LOC_THRESHOLD = 500;

const listContextFiles = (absoluteDir, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listContextFiles(absolutePath, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    if (/\.test\.(ts|tsx)$/.test(entry.name)) continue;
    if (CONTEXT_FILE_PATTERNS.some((p) => p.test(entry.name))) {
      acc.push(absolutePath);
    }
  }
  return acc;
};

const countLines = (text) => text.split('\n').length;

const createSourceFile = (filePath, text) =>
  ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const unwrapExpression = (expression) => {
  let current = expression;
  while (current) {
    if (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isTypeAssertionExpression(current)
    ) {
      current = current.expression;
      continue;
    }
    return current;
  }
  return current;
};

const countObjectLiteralFields = (expression) =>
  expression.properties.filter(
    (property) =>
      ts.isPropertyAssignment(property) ||
      ts.isShorthandPropertyAssignment(property) ||
      ts.isSpreadAssignment(property) ||
      ts.isMethodDeclaration(property) ||
      ts.isGetAccessorDeclaration(property) ||
      ts.isSetAccessorDeclaration(property)
  ).length;

const getReturnedExpression = (callback) => {
  if (ts.isArrowFunction(callback) && callback.body && !ts.isBlock(callback.body)) {
    return callback.body;
  }
  if (!callback.body || !ts.isBlock(callback.body)) return null;
  for (const statement of callback.body.statements) {
    if (ts.isReturnStatement(statement) && statement.expression) {
      return statement.expression;
    }
  }
  return null;
};

const collectVariableInitializers = (sourceFile) => {
  const initializers = new Map();

  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      initializers.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return initializers;
};

const resolveObjectFieldCount = (expression, variableInitializers, seen = new Set()) => {
  const current = unwrapExpression(expression);
  if (!current) return null;

  if (ts.isObjectLiteralExpression(current)) {
    return countObjectLiteralFields(current);
  }

  if (ts.isIdentifier(current)) {
    if (seen.has(current.text)) return null;
    const initializer = variableInitializers.get(current.text);
    if (!initializer) return null;
    const nextSeen = new Set(seen);
    nextSeen.add(current.text);
    return resolveObjectFieldCount(initializer, variableInitializers, nextSeen);
  }

  if (ts.isCallExpression(current) && ts.isIdentifier(current.expression) && current.expression.text === 'useMemo') {
    const callback = current.arguments[0];
    if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
      const returned = getReturnedExpression(callback);
      if (returned) {
        return resolveObjectFieldCount(returned, variableInitializers, seen);
      }
    }
  }

  if (ts.isConditionalExpression(current)) {
    const whenTrue = resolveObjectFieldCount(current.whenTrue, variableInitializers, seen);
    const whenFalse = resolveObjectFieldCount(current.whenFalse, variableInitializers, seen);
    return Math.max(whenTrue ?? 0, whenFalse ?? 0);
  }

  return null;
};

const isProviderTag = (tagName) => ts.isPropertyAccessExpression(tagName) && tagName.name.text === 'Provider';

const readJsxValueExpression = (openingElement) => {
  for (const attribute of openingElement.attributes.properties) {
    if (!ts.isJsxAttribute(attribute) || attribute.name.text !== 'value') continue;
    if (!attribute.initializer || !ts.isJsxExpression(attribute.initializer)) return null;
    return attribute.initializer.expression ?? null;
  }
  return null;
};

const collectProviderValueFieldCounts = (sourceFile) => {
  const variableInitializers = collectVariableInitializers(sourceFile);
  const fieldCounts = [];
  let providerCount = 0;

  const visit = (node) => {
    const openingElement =
      ts.isJsxElement(node)
        ? node.openingElement
        : ts.isJsxSelfClosingElement(node)
          ? node
          : null;

    if (openingElement && isProviderTag(openingElement.tagName)) {
      providerCount += 1;
      const valueExpression = readJsxValueExpression(openingElement);
      if (valueExpression) {
        const fieldCount = resolveObjectFieldCount(valueExpression, variableInitializers);
        if (typeof fieldCount === 'number') {
          fieldCounts.push(fieldCount);
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return {
    providerCount,
    fieldCounts,
  };
};

const collectCreateContextCount = (sourceFile) => {
  let count = 0;

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ((ts.isIdentifier(node.expression) && node.expression.text === 'createContext') ||
        (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'createContext'))
    ) {
      count += 1;
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return count;
};

const hasModifier = (node, kind) => node.modifiers?.some((modifier) => modifier.kind === kind) ?? false;

const collectExportedHookNames = (sourceFile) => {
  const hookNames = new Set();

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
      hookNames.add(statement.name.text);
      continue;
    }

    if (ts.isVariableStatement(statement) && hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          hookNames.add(declaration.name.text);
        }
      }
      continue;
    }

    if (!ts.isExportDeclaration(statement) || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) {
      continue;
    }

    for (const element of statement.exportClause.elements) {
      hookNames.add(element.name.text);
    }
  }

  return hookNames;
};

const hasGenericErrorThrow = (text) => {
  // Check for `throw new Error(` that isn't an AppError or custom error
  const throwMatches = text.matchAll(/throw\s+new\s+(\w+)\s*\(/g);
  for (const match of throwMatches) {
    const errorClass = match[1];
    if (errorClass === 'Error' || errorClass === 'TypeError' || errorClass === 'RangeError') {
      return true;
    }
  }
  return false;
};

const getContextDirInfo = (contextFilePath, sourceFile) => {
  const dir = path.dirname(contextFilePath);

  // Check if there's a hooks directory or companion hook files
  const hooksDir = path.join(dir, 'hooks');
  const parentHooksDir = path.join(path.dirname(dir), 'hooks');

  const contextBaseName = path.basename(contextFilePath, '.tsx').replace(/Context$/, '');
  const exportedHookNames = collectExportedHookNames(sourceFile);

  const hasStateHook = (searchDir) => {
    if (!fs.existsSync(searchDir)) return false;
    try {
      const entries = fs.readdirSync(searchDir);
      return entries.some((e) =>
        e.toLowerCase().includes(`use${contextBaseName.toLowerCase()}state`) ||
        e.toLowerCase().includes('usestate')
      );
    } catch {
      return false;
    }
  };

  const hasActionsHook = (searchDir) => {
    if (!fs.existsSync(searchDir)) return false;
    try {
      const entries = fs.readdirSync(searchDir);
      return entries.some((e) =>
        e.toLowerCase().includes(`use${contextBaseName.toLowerCase()}actions`) ||
        e.toLowerCase().includes('useactions')
      );
    } catch {
      return false;
    }
  };

  const hasInlineStateHook = exportedHookNames.has(`use${contextBaseName}State`);
  const hasInlineActionsHook = exportedHookNames.has(`use${contextBaseName}Actions`);

  return {
    hasStateHook:
      hasInlineStateHook || hasStateHook(hooksDir) || hasStateHook(parentHooksDir) || hasStateHook(dir),
    hasActionsHook:
      hasInlineActionsHook ||
      hasActionsHook(hooksDir) ||
      hasActionsHook(parentHooksDir) ||
      hasActionsHook(dir),
    hasMultipleContexts: collectCreateContextCount(sourceFile) > 1,
  };
};

export const analyzeContextHealth = ({ root = process.cwd() } = {}) => {
  const issues = [];
  let contextFileCount = 0;

  for (const sourceDir of SOURCE_DIRS) {
    const absoluteDir = path.join(root, sourceDir);
    const contextFiles = listContextFiles(absoluteDir);

    for (const absolutePath of contextFiles) {
      const relativePath = toRepoRelativePath(root, absolutePath);
      const rawText = fs.readFileSync(absolutePath, 'utf8');
      const sourceFile = createSourceFile(absolutePath, rawText);
      const dirInfo = getContextDirInfo(absolutePath, sourceFile);
      contextFileCount++;

      // Rule: context-generic-error
      if (hasGenericErrorThrow(rawText)) {
        issues.push(
          createIssue({
            severity: 'warn',
            ruleId: 'context-generic-error',
            file: relativePath,
            message: 'Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking.',
          })
        );
      }

      // Rule: context-monolith
      const providerInfo = collectProviderValueFieldCounts(sourceFile);
      const fieldCount = providerInfo.fieldCounts.length > 0 ? Math.max(...providerInfo.fieldCounts) : 0;
      const hasStructuralSplit =
        dirInfo.hasStateHook ||
        dirInfo.hasActionsHook ||
        dirInfo.hasMultipleContexts ||
        providerInfo.providerCount > 1;
      if (fieldCount > PROVIDER_VALUE_FIELD_THRESHOLD && !hasStructuralSplit) {
        issues.push(
          createIssue({
            severity: 'warn',
            ruleId: 'context-monolith',
            file: relativePath,
            message: `Context provider value has ~${fieldCount} fields (threshold: ${PROVIDER_VALUE_FIELD_THRESHOLD}). Consider splitting into domain-specific contexts.`,
          })
        );
      }

      // Rule: context-oversized
      const loc = countLines(rawText);
      if (loc > OVERSIZED_LOC_THRESHOLD) {
        issues.push(
          createIssue({
            severity: 'warn',
            ruleId: 'context-oversized',
            file: relativePath,
            message: `Context file is ${loc} lines (threshold: ${OVERSIZED_LOC_THRESHOLD}). Consider extracting logic into hooks or splitting the context.`,
          })
        );
      }

      // Rule: context-missing-split
      const isProvider = providerInfo.providerCount > 0 || rawText.includes('createContext');
      if (isProvider) {
        if (
          !dirInfo.hasStateHook &&
          !dirInfo.hasActionsHook &&
          !dirInfo.hasMultipleContexts &&
          providerInfo.providerCount <= 1
        ) {
          // Only flag if the context seems substantial (not a simple value context)
          if (fieldCount > 3 || loc > 100) {
            issues.push(
              createIssue({
                severity: 'info',
                ruleId: 'context-missing-split',
                file: relativePath,
                message: 'Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization.',
              })
            );
          }
        }
      }
    }
  }

  const sortedIssues = sortIssues(issues);
  const summary = summarizeIssues(sortedIssues);

  return {
    generatedAt: new Date().toISOString(),
    status: summary.status,
    summary: {
      ...summary,
      contextFileCount,
    },
    scope: {
      sourceDirs: SOURCE_DIRS,
      providerValueFieldThreshold: PROVIDER_VALUE_FIELD_THRESHOLD,
      oversizedLocThreshold: OVERSIZED_LOC_THRESHOLD,
    },
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
