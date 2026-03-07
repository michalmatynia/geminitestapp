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
const TARGET_EXTENSIONS = new Set(['.tsx', '.jsx']);
const FOCUSABLE_ROLES = new Set([
  'button',
  'checkbox',
  'link',
  'menuitem',
  'option',
  'radio',
  'switch',
  'tab',
  'treeitem',
]);

const TARGET_IMPORTS = {
  '@/shared/ui': {
    DialogContent: 'dialogContent',
    DialogTitle: 'dialogTitle',
    AlertDialogContent: 'alertDialogContent',
    AlertDialogTitle: 'alertDialogTitle',
    TabsList: 'tabsList',
    Tooltip: 'tooltip',
  },
  '@/shared/ui/dialog': {
    DialogContent: 'dialogContent',
    DialogTitle: 'dialogTitle',
  },
  '@/shared/ui/alert-dialog': {
    AlertDialogContent: 'alertDialogContent',
    AlertDialogTitle: 'alertDialogTitle',
  },
  '@/shared/ui/tabs': {
    TabsList: 'tabsList',
  },
  '@/shared/ui/tooltip': {
    Tooltip: 'tooltip',
  },
};

const createSourceFile = (filePath, text) =>
  ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const getNodeLocation = (sourceFile, node) => {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    line: position.line + 1,
    column: position.character + 1,
  };
};

const readJsxName = (tagName) => {
  if (ts.isIdentifier(tagName)) return tagName.text;
  if (ts.isPropertyAccessExpression(tagName)) return tagName.name.text;
  if (ts.isJsxNamespacedName(tagName)) return `${tagName.namespace.text}:${tagName.name.text}`;
  return null;
};

const listSourceFiles = (absoluteDir, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listSourceFiles(absolutePath, acc);
      continue;
    }
    if (entry.isFile() && TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      acc.push(absolutePath);
    }
  }
  return acc;
};

const collectAliases = (sourceFile) => {
  const aliases = {
    dialogContent: new Set(),
    dialogTitle: new Set(),
    alertDialogContent: new Set(),
    alertDialogTitle: new Set(),
    tabsList: new Set(),
    tooltip: new Set(),
  };

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!statement.importClause || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const mapping = TARGET_IMPORTS[statement.moduleSpecifier.text];
    if (!mapping) continue;

    const namedBindings = statement.importClause.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) continue;

    for (const element of namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      const aliasGroup = mapping[importedName];
      if (!aliasGroup) continue;
      aliases[aliasGroup].add(element.name.text);
    }
  }

  return aliases;
};

const getJsxOpeningElement = (node) => {
  if (ts.isJsxElement(node)) return node.openingElement;
  if (ts.isJsxSelfClosingElement(node)) return node;
  return null;
};

const getJsxChildren = (node) => {
  if (ts.isJsxElement(node)) return node.children;
  if (ts.isJsxFragment(node)) return node.children;
  return [];
};

const readAttribute = (openingElement, attributeName) => {
  for (const attribute of openingElement.attributes.properties) {
    if (!ts.isJsxAttribute(attribute) || attribute.name.text !== attributeName) continue;
    return attribute;
  }
  return null;
};

const readStringAttributeValue = (attribute) => {
  if (!attribute || !attribute.initializer) return '';
  if (ts.isStringLiteral(attribute.initializer)) {
    return attribute.initializer.text;
  }
  if (ts.isJsxExpression(attribute.initializer)) {
    const expression = attribute.initializer.expression;
    if (!expression) return '';
    if (ts.isStringLiteralLike(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
      return expression.text;
    }
  }
  return '';
};

const readNumericAttributeValue = (attribute) => {
  if (!attribute || !attribute.initializer) return 0;
  if (ts.isStringLiteral(attribute.initializer)) {
    const parsed = Number(attribute.initializer.text);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (ts.isJsxExpression(attribute.initializer)) {
    const expression = attribute.initializer.expression;
    if (!expression) return null;
    if (ts.isNumericLiteral(expression)) return Number(expression.text);
    if (
      ts.isPrefixUnaryExpression(expression) &&
      expression.operator === ts.SyntaxKind.MinusToken &&
      ts.isNumericLiteral(expression.operand)
    ) {
      return -Number(expression.operand.text);
    }
  }
  return null;
};

const hasAccessibleLabel = (openingElement) =>
  Boolean(readAttribute(openingElement, 'aria-label') || readAttribute(openingElement, 'aria-labelledby'));

const subtreeContainsNamedComponent = (node, componentNames) => {
  let found = false;

  const visit = (current) => {
    if (found) return;

    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) {
      const openingElement = getJsxOpeningElement(current);
      const name = openingElement ? readJsxName(openingElement.tagName) : null;
      if (name && componentNames.has(name)) {
        found = true;
        return;
      }
    }

    ts.forEachChild(current, visit);
  };

  for (const child of getJsxChildren(node)) {
    visit(child);
    if (found) break;
  }

  return found;
};

const findFirstMeaningfulChild = (node) => {
  for (const child of getJsxChildren(node)) {
    if (ts.isJsxText(child) && child.getFullText().trim().length === 0) {
      continue;
    }
    if (ts.isJsxExpression(child) && !child.expression) {
      continue;
    }
    return child;
  }
  return null;
};

const isIntrinsicTag = (name) => typeof name === 'string' && /^[a-z]/.test(name);

const isFocusableIntrinsicElement = (openingElement) => {
  const tagName = readJsxName(openingElement.tagName);
  if (!tagName || !isIntrinsicTag(tagName)) return true;

  if (
    tagName === 'button' ||
    tagName === 'input' ||
    tagName === 'select' ||
    tagName === 'textarea' ||
    tagName === 'summary'
  ) {
    return true;
  }

  const tabIndexAttribute = readAttribute(openingElement, 'tabIndex');
  if (tabIndexAttribute) {
    const tabIndexValue = readNumericAttributeValue(tabIndexAttribute);
    if (tabIndexValue === null || tabIndexValue >= 0) {
      return true;
    }
  }

  if (tagName === 'a') {
    return Boolean(readAttribute(openingElement, 'href') || tabIndexAttribute);
  }

  const contentEditable = readAttribute(openingElement, 'contentEditable');
  if (contentEditable && readStringAttributeValue(contentEditable) !== 'false') {
    return true;
  }

  const role = readStringAttributeValue(readAttribute(openingElement, 'role'));
  if (role && FOCUSABLE_ROLES.has(role) && tabIndexAttribute) {
    return true;
  }

  return false;
};

const subtreeContainsPotentiallyFocusableElement = (node) => {
  let found = false;

  const visit = (current) => {
    if (found) return;

    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) {
      const openingElement = getJsxOpeningElement(current);
      const tagName = openingElement ? readJsxName(openingElement.tagName) : null;
      if (!tagName) {
        ts.forEachChild(current, visit);
        return;
      }

      if (isIntrinsicTag(tagName)) {
        if (isFocusableIntrinsicElement(openingElement)) {
          found = true;
          return;
        }
      } else {
        found = true;
        return;
      }
    }

    ts.forEachChild(current, visit);
  };

  visit(node);
  return found;
};

export const analyzeAccessibilityComponentPolicies = ({ root = process.cwd() } = {}) => {
  const issues = [];
  let fileCount = 0;
  let dialogCount = 0;
  let alertDialogCount = 0;
  let tabsListCount = 0;
  let tooltipCount = 0;

  const sourceFiles = listSourceFiles(path.join(root, SOURCE_ROOT));

  for (const filePath of sourceFiles) {
    const text = fs.readFileSync(filePath, 'utf8');
    const sourceFile = createSourceFile(filePath, text);
    const aliases = collectAliases(sourceFile);
    const repoRelativeFile = toRepoRelativePath(root, filePath);

    const hasAnyTrackedImports =
      aliases.dialogContent.size > 0 ||
      aliases.dialogTitle.size > 0 ||
      aliases.alertDialogContent.size > 0 ||
      aliases.alertDialogTitle.size > 0 ||
      aliases.tabsList.size > 0 ||
      aliases.tooltip.size > 0;

    if (!hasAnyTrackedImports) {
      continue;
    }

    fileCount += 1;

    const visit = (node) => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const openingElement = getJsxOpeningElement(node);
        const name = openingElement ? readJsxName(openingElement.tagName) : null;

        if (name && aliases.dialogContent.has(name)) {
          dialogCount += 1;
          const hasTitle = ts.isJsxElement(node)
            ? subtreeContainsNamedComponent(node, aliases.dialogTitle)
            : false;
          if (!hasAccessibleLabel(openingElement) && !hasTitle) {
            const location = getNodeLocation(sourceFile, openingElement);
            issues.push(
              createIssue({
                severity: 'error',
                ruleId: 'dialog-content-missing-title',
                file: repoRelativeFile,
                line: location.line,
                column: location.column,
                message:
                  'DialogContent must expose an accessible name via DialogTitle, aria-label, or aria-labelledby.',
              })
            );
          }
        }

        if (name && aliases.alertDialogContent.has(name)) {
          alertDialogCount += 1;
          const hasTitle = ts.isJsxElement(node)
            ? subtreeContainsNamedComponent(node, aliases.alertDialogTitle)
            : false;
          if (!hasAccessibleLabel(openingElement) && !hasTitle) {
            const location = getNodeLocation(sourceFile, openingElement);
            issues.push(
              createIssue({
                severity: 'error',
                ruleId: 'alert-dialog-content-missing-title',
                file: repoRelativeFile,
                line: location.line,
                column: location.column,
                message:
                  'AlertDialogContent must expose an accessible name via AlertDialogTitle, aria-label, or aria-labelledby.',
              })
            );
          }
        }

        if (name && aliases.tabsList.has(name)) {
          tabsListCount += 1;
          if (!hasAccessibleLabel(openingElement)) {
            const location = getNodeLocation(sourceFile, openingElement);
            issues.push(
              createIssue({
                severity: 'info',
                ruleId: 'tabs-list-missing-label',
                file: repoRelativeFile,
                line: location.line,
                column: location.column,
                message: 'TabsList should set aria-label or aria-labelledby for a stable tablist name.',
              })
            );
          }
        }

        if (name && aliases.tooltip.has(name) && ts.isJsxElement(node)) {
          tooltipCount += 1;
          const firstChild = findFirstMeaningfulChild(node);
          const childOpeningElement =
            firstChild && (ts.isJsxElement(firstChild) || ts.isJsxSelfClosingElement(firstChild))
              ? getJsxOpeningElement(firstChild)
              : null;
          const childTagName = childOpeningElement ? readJsxName(childOpeningElement.tagName) : null;

          if (childOpeningElement && childTagName && isIntrinsicTag(childTagName)) {
            if (
              !isFocusableIntrinsicElement(childOpeningElement) &&
              !subtreeContainsPotentiallyFocusableElement(firstChild)
            ) {
              const location = getNodeLocation(sourceFile, childOpeningElement);
              issues.push(
                createIssue({
                  severity: 'warn',
                  ruleId: 'tooltip-trigger-not-focusable',
                  file: repoRelativeFile,
                  line: location.line,
                  column: location.column,
                  message: `Tooltip wraps a non-focusable <${childTagName}> trigger. Use a focusable trigger or add keyboard focus support.`,
                })
              );
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  const sortedIssues = sortIssues(issues);
  const summary = summarizeIssues(sortedIssues);

  return {
    generatedAt: new Date().toISOString(),
    durationMs: 0,
    status: summary.status,
    summary: {
      fileCount,
      dialogCount,
      alertDialogCount,
      tabsListCount,
      tooltipCount,
      errorCount: summary.errorCount,
      warningCount: summary.warningCount,
    },
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
