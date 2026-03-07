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

const SOURCE_ROOT = path.join('src');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const UNSAFE_CODE_ALLOWLIST = new Set([
  'src/shared/lib/ai-paths/core/runtime/handlers/function-node.ts',
]);
const DOCUMENT_COOKIE_ALLOWLIST = new Set([
  'src/shared/lib/analytics/components/PageAnalyticsTracker.tsx',
  'src/shared/lib/security/csrf-client.ts',
]);

const listSourceFiles = (absoluteDir, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listSourceFiles(absolutePath, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name);
    if (!SOURCE_EXTENSIONS.has(extension)) continue;
    if (/\.test\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) continue;
    acc.push(absolutePath);
  }
  return acc;
};

const createSourceFile = (filePath, text) =>
  ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

const getNodeLocation = (sourceFile, node) => {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    line: position.line + 1,
    column: position.character + 1,
  };
};

const getJsxAttributeStringValue = (attribute, sourceFile) => {
  if (!attribute?.initializer) return null;
  if (ts.isStringLiteralLike(attribute.initializer)) return attribute.initializer.text;
  if (ts.isJsxExpression(attribute.initializer)) {
    const expression = attribute.initializer.expression;
    if (!expression) return null;
    if (ts.isStringLiteralLike(expression)) return expression.text;
    return expression.getText(sourceFile);
  }
  return null;
};

const includesAllTokens = (value, tokens) => {
  const normalized = value.toLowerCase();
  return tokens.every((token) => normalized.includes(token));
};

export const analyzeSecurityStatic = ({ root = process.cwd() } = {}) => {
  const issues = [];
  let fileCount = 0;

  const sourceFiles = listSourceFiles(path.join(root, SOURCE_ROOT));

  for (const absolutePath of sourceFiles) {
    fileCount += 1;
    const relativePath = toRepoRelativePath(root, absolutePath);
    const text = fs.readFileSync(absolutePath, 'utf8');
    const sourceFile = createSourceFile(absolutePath, text);

    const visit = (node) => {
      if (ts.isJsxAttribute(node) && node.name.text === 'target') {
        const targetValue = getJsxAttributeStringValue(node, sourceFile);
        if (targetValue === '_blank') {
          const attributes = node.parent;
          const relAttribute = attributes.properties.find(
            (property) => ts.isJsxAttribute(property) && property.name.text === 'rel'
          );
          const relValue = relAttribute ? getJsxAttributeStringValue(relAttribute, sourceFile) : null;
          if (!relValue || !includesAllTokens(relValue, ['noopener', 'noreferrer'])) {
            const location = getNodeLocation(sourceFile, node.name);
            issues.push(
              createIssue({
                severity: 'error',
                ruleId: 'jsx-target-blank-missing-rel',
                file: relativePath,
                line: location.line,
                column: location.column,
                message: 'JSX target="_blank" is missing rel="noopener noreferrer".',
              })
            );
          }
        }
      }

      if (ts.isJsxAttribute(node) && node.name.text === 'dangerouslySetInnerHTML') {
        const initializerText = node.initializer?.getText(sourceFile) ?? '';
        if (!/\bsanitize|sanitized|safeHtml|safeSvg|DOMPurify/i.test(initializerText)) {
          const location = getNodeLocation(sourceFile, node.name);
          issues.push(
            createIssue({
              severity: 'warn',
              ruleId: 'dangerouslysetinnerhtml-review',
              file: relativePath,
              line: location.line,
              column: location.column,
              message:
                'dangerouslySetInnerHTML is used without an obvious sanitize/safe marker in the inline expression.',
              snippet: initializerText,
            })
          );
        }
      }

      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const owner = node.expression.expression;
        const property = node.expression.name;
        if (ts.isIdentifier(owner) && owner.text === 'window' && property.text === 'open') {
          const featureArgument = node.arguments[2];
          const featureText =
            featureArgument && ts.isStringLiteralLike(featureArgument)
              ? featureArgument.text
              : featureArgument?.getText(sourceFile) ?? '';
          if (!includesAllTokens(featureText, ['noopener', 'noreferrer'])) {
            const location = getNodeLocation(sourceFile, node.expression.name);
            issues.push(
              createIssue({
                severity: 'error',
                ruleId: 'window-open-missing-isolation',
                file: relativePath,
                line: location.line,
                column: location.column,
                message: 'window.open should include both noopener and noreferrer features.',
                snippet: node.getText(sourceFile),
              })
            );
          }
        }
      }

      if (ts.isPropertyAccessExpression(node)) {
        if (
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'document' &&
          node.name.text === 'cookie' &&
          !DOCUMENT_COOKIE_ALLOWLIST.has(relativePath)
        ) {
          const location = getNodeLocation(sourceFile, node.name);
          issues.push(
            createIssue({
              severity: 'warn',
              ruleId: 'document-cookie-review',
              file: relativePath,
              line: location.line,
              column: location.column,
              message:
                'Direct document.cookie access should stay isolated to reviewed helpers/components.',
              snippet: node.parent?.getText(sourceFile) ?? node.getText(sourceFile),
            })
          );
        }
      }

      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'eval' &&
        !UNSAFE_CODE_ALLOWLIST.has(relativePath)
      ) {
        const location = getNodeLocation(sourceFile, node.expression);
        issues.push(
          createIssue({
            severity: 'error',
            ruleId: 'eval-usage',
            file: relativePath,
            line: location.line,
            column: location.column,
            message: 'Direct eval(...) usage is not allowed in application source.',
            snippet: node.getText(sourceFile),
          })
        );
      }

      if (
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'Function' &&
        !UNSAFE_CODE_ALLOWLIST.has(relativePath)
      ) {
        const location = getNodeLocation(sourceFile, node.expression);
        issues.push(
          createIssue({
            severity: 'error',
            ruleId: 'new-function-usage',
            file: relativePath,
            line: location.line,
            column: location.column,
            message: 'new Function(...) usage is not allowed in application source.',
            snippet: node.getText(sourceFile),
          })
        );
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  const sortedIssues = sortIssues(issues);
  const summary = summarizeIssues(sortedIssues);

  return {
    generatedAt: new Date().toISOString(),
    status: summary.status,
    summary: {
      ...summary,
      fileCount,
    },
    scope: {
      root: SOURCE_ROOT,
      unsafeCodeAllowlist: [...UNSAFE_CODE_ALLOWLIST],
      documentCookieAllowlist: [...DOCUMENT_COOKIE_ALLOWLIST],
    },
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
