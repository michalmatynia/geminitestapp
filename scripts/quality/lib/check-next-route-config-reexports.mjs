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

const ROUTE_FILE_NAMES = new Set([
  'layout.js',
  'layout.jsx',
  'layout.ts',
  'layout.tsx',
  'page.js',
  'page.jsx',
  'page.ts',
  'page.tsx',
  'route.js',
  'route.jsx',
  'route.ts',
  'route.tsx',
]);

const ROUTE_CONFIG_EXPORT_NAMES = new Set([
  'dynamic',
  'dynamicParams',
  'fetchCache',
  'maxDuration',
  'preferredRegion',
  'revalidate',
  'runtime',
]);

const SCRIPT_KIND_BY_EXTENSION = {
  '.cjs': ts.ScriptKind.JS,
  '.js': ts.ScriptKind.JS,
  '.jsx': ts.ScriptKind.JSX,
  '.mjs': ts.ScriptKind.JS,
  '.ts': ts.ScriptKind.TS,
  '.tsx': ts.ScriptKind.TSX,
};

const parseSourceFile = (filePath) => {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const extension = path.extname(filePath).toLowerCase();
  const scriptKind = SCRIPT_KIND_BY_EXTENSION[extension] ?? ts.ScriptKind.TS;
  return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind);
};

const collectRouteFiles = (rootDir) => {
  const results = [];

  const visit = (dirPath) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }
      if (ROUTE_FILE_NAMES.has(entry.name)) {
        results.push(entryPath);
      }
    }
  };

  if (fs.existsSync(rootDir)) {
    visit(rootDir);
  }

  return results.sort((left, right) => left.localeCompare(right));
};

const getNodeLocation = (sourceFile, node) => {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: line + 1, column: character + 1 };
};

const collectNamedExportedConfigNames = (exportClause) => {
  if (!ts.isNamedExports(exportClause)) return [];

  const exportedNames = [];
  for (const element of exportClause.elements) {
    const exportedName = element.name.text;
    if (ROUTE_CONFIG_EXPORT_NAMES.has(exportedName)) {
      exportedNames.push({ element, exportedName });
    }
  }
  return exportedNames;
};

export const analyzeNextRouteConfigReexports = ({ root }) => {
  const appRoot = path.join(root, 'src', 'app');
  const routeFiles = collectRouteFiles(appRoot);
  const issues = [];

  for (const filePath of routeFiles) {
    const sourceFile = parseSourceFile(filePath);
    const relativeFile = toRepoRelativePath(root, filePath);

    for (const statement of sourceFile.statements) {
      if (!ts.isExportDeclaration(statement)) continue;

      if (statement.exportClause) {
        for (const { element, exportedName } of collectNamedExportedConfigNames(statement.exportClause)) {
          const { line, column } = getNodeLocation(sourceFile, element.name);
          const moduleSpecifier =
            statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
              ? statement.moduleSpecifier.text
              : null;
          const message = moduleSpecifier
            ? `Route file re-exports Next route config "${exportedName}" from "${moduleSpecifier}". Export the config locally instead.`
            : `Route file exports Next route config "${exportedName}" through an export clause. Export the config locally instead.`;

          issues.push(
            createIssue({
              severity: 'error',
              ruleId: 'next-route-config-reexport',
              message,
              file: relativeFile,
              line,
              column,
              snippet: element.getText(sourceFile),
            })
          );
        }
      }
    }
  }

  const sortedIssues = sortIssues(issues);
  const issueSummary = summarizeIssues(sortedIssues);

  return {
    generatedAt: new Date().toISOString(),
    status: issueSummary.errorCount > 0 ? 'failed' : 'passed',
    summary: {
      routeCount: routeFiles.length,
      issueCount: sortedIssues.length,
      errorCount: issueSummary.errorCount,
      warningCount: issueSummary.warningCount,
      infoCount: issueSummary.infoCount,
    },
    rules: summarizeRules(sortedIssues),
    issues: sortedIssues,
  };
};
