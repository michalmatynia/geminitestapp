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
import { authzRoutePolicies } from '../config/security-authz-matrix.config.mjs';
import { resolveApiRouteMethodSource } from './check-security-authz-matrix.mjs';

const APP_API_ROOT = path.join('src', 'app', 'api');
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

const DEFAULT_POLICY = {
  id: 'default-protected',
  expectedAccess: 'protected',
};

const BODY_READING_RE =
  /\bctx\.body\b|await\s+[A-Za-z_$][\w$]*\.(json|text)\s*\(|\b(rawBody|rawPayload|normalizedBody|parsedBody|payload|body)\b/;
const BODY_VALIDATION_RE =
  /\bbodySchema\s*:|\bparseJsonBody\s*:?\s*true\b|\bparseJsonBody\s*\(|\.(safeParse|parse)\s*\(\s*(ctx\.body|rawBody|rawPayload|normalizedBody|parsedBody|payload|body)\b/;
const SEARCH_PARAM_USAGE_RE =
  /\b(searchParams\.(get|getAll|entries)\s*\(|req\.nextUrl\.searchParams\.(get|getAll|entries)\s*\()/;
const QUERY_VALIDATION_RE =
  /\bquerySchema\s*:|\.(safeParse|parse)\s*\(\s*(Object\.fromEntries\([^)]*searchParams\.entries\(\)|(?:req\.nextUrl|url)\.searchParams\.(get|getAll)\s*\()/;

const normalizeRoutePath = (value) =>
  value.replace(/\\/g, '/').replace(/\/route\.ts$/, '').replace(/^\/+/, '');

const createSourceFile = (filePath, text) =>
  ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const getNodeLocation = (sourceFile, node) => {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    line: position.line + 1,
    column: position.character + 1,
  };
};

const listRouteFiles = (absoluteDir, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listRouteFiles(absolutePath, acc);
      continue;
    }
    if (entry.isFile() && entry.name === 'route.ts') {
      acc.push(absolutePath);
    }
  }
  return acc;
};

const extractRouteMethods = ({ sourceFile }) => {
  const methods = [];

  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      const isExported =
        Array.isArray(statement.modifiers) &&
        statement.modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
      if (!isExported) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        if (!HTTP_METHODS.has(declaration.name.text)) continue;
        methods.push({
          method: declaration.name.text,
          exportNode: declaration.name,
        });
      }
      continue;
    }

    if (!ts.isExportDeclaration(statement)) continue;
    const exportClause = statement.exportClause;
    if (!exportClause || !ts.isNamedExports(exportClause)) continue;
    for (const element of exportClause.elements) {
      if (!HTTP_METHODS.has(element.name.text)) continue;
      methods.push({
        method: element.name.text,
        exportNode: element.name,
      });
    }
  }

  return methods;
};

const resolvePolicy = (routePath, method) =>
  authzRoutePolicies.find(
    (policy) =>
      policy.pattern.test(routePath) &&
      (!Array.isArray(policy.methods) || policy.methods.includes(method))
  ) ?? DEFAULT_POLICY;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const collectTestFilesForSource = (filePath) => {
  const directories = [path.dirname(filePath), path.join(path.dirname(filePath), '__tests__')];
  const baseName = path.basename(filePath, path.extname(filePath));
  const testNameRe = new RegExp(`^${escapeRegex(baseName)}(?:[.-].+)?\\.(test|spec)\\.(ts|tsx)$`);
  const found = [];

  for (const directory of directories) {
    if (!fs.existsSync(directory)) continue;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!testNameRe.test(entry.name)) continue;
      found.push(path.join(directory, entry.name));
    }
  }

  return [...new Set(found)];
};

const hasBodyValidation = (combinedText) => BODY_VALIDATION_RE.test(combinedText);
const usesStructuredBody = (combinedText) => BODY_READING_RE.test(combinedText);
const usesQueryParams = (combinedText) => SEARCH_PARAM_USAGE_RE.test(combinedText);
const hasQueryValidation = (combinedText) => QUERY_VALIDATION_RE.test(combinedText);

const shouldRequireMutationValidation = (method, combinedText) =>
  (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') &&
  usesStructuredBody(combinedText);

export const analyzeApiContractCoverage = ({ root = process.cwd() } = {}) => {
  const issues = [];
  const routeInventory = [];
  const absoluteApiRoot = path.join(root, APP_API_ROOT);
  const routeFiles = listRouteFiles(absoluteApiRoot);

  let methodCount = 0;
  let methodsWithTests = 0;
  let mutationValidationCount = 0;
  let queryValidationCount = 0;

  for (const routeFile of routeFiles) {
    const routeText = fs.readFileSync(routeFile, 'utf8');
    const routeSourceFile = createSourceFile(routeFile, routeText);
    const routeMethods = extractRouteMethods({ sourceFile: routeSourceFile });
    const routePath = normalizeRoutePath(path.relative(absoluteApiRoot, routeFile));
    const repoRelativeRouteFile = toRepoRelativePath(root, routeFile);

    for (const routeMethod of routeMethods) {
      methodCount += 1;
      const location = getNodeLocation(routeSourceFile, routeMethod.exportNode);
      const policy = resolvePolicy(routePath, routeMethod.method);
      const sourceResolution = resolveApiRouteMethodSource({
        root,
        filePath: routeFile,
        method: routeMethod.method,
      });
      const evidenceFiles = [...new Set([routeFile, ...sourceResolution.files])];
      const testFiles = evidenceFiles.flatMap((filePath) => collectTestFilesForSource(filePath));
      const hasTests = testFiles.length > 0;
      const combinedText = [routeText, ...sourceResolution.texts].join('\n');
      const mutationValidationRequired = shouldRequireMutationValidation(routeMethod.method, combinedText);
      const bodyValidated = hasBodyValidation(combinedText);
      const queryUsed = routeMethod.method === 'GET' && usesQueryParams(combinedText);
      const queryValidated = hasQueryValidation(combinedText);

      if (hasTests) methodsWithTests += 1;
      if (mutationValidationRequired && bodyValidated) mutationValidationCount += 1;
      if (queryUsed && queryValidated) queryValidationCount += 1;

      routeInventory.push({
        route: routePath,
        method: routeMethod.method,
        expectedAccess: policy.expectedAccess,
        hasTests,
        bodyValidated: mutationValidationRequired ? bodyValidated : null,
        queryValidated: queryUsed ? queryValidated : null,
        sourceFiles: evidenceFiles.map((filePath) => toRepoRelativePath(root, filePath)),
        testFiles: [...new Set(testFiles)].map((filePath) => toRepoRelativePath(root, filePath)),
      });

      if (mutationValidationRequired && !bodyValidated) {
        issues.push(
          createIssue({
            severity: 'error',
            ruleId: 'api-contract-mutation-missing-body-validation',
            file: repoRelativeRouteFile,
            line: location.line,
            column: location.column,
            message: `${routeMethod.method} ${routePath} reads request body data without explicit schema validation.`,
            context: {
              expectedAccess: policy.expectedAccess,
              sourceFiles: evidenceFiles.map((filePath) => toRepoRelativePath(root, filePath)),
            },
          })
        );
      }

      if (queryUsed && !queryValidated) {
        issues.push(
          createIssue({
            severity: 'warn',
            ruleId: 'api-contract-query-route-missing-query-validation',
            file: repoRelativeRouteFile,
            line: location.line,
            column: location.column,
            message: `${routeMethod.method} ${routePath} reads search params without a query schema or parse/safeParse guard.`,
            context: {
              expectedAccess: policy.expectedAccess,
            },
          })
        );
      }

      if (policy.expectedAccess !== 'public' && !hasTests) {
        issues.push(
          createIssue({
            severity: routeMethod.method === 'GET' ? 'info' : 'warn',
            ruleId: 'api-contract-route-missing-tests',
            file: repoRelativeRouteFile,
            line: location.line,
            column: location.column,
            message: `${routeMethod.method} ${routePath} has no adjacent route/handler test coverage.`,
            context: {
              expectedAccess: policy.expectedAccess,
              sourceFiles: evidenceFiles.map((filePath) => toRepoRelativePath(root, filePath)),
            },
          })
        );
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
      routeFileCount: routeFiles.length,
      methodCount,
      methodsWithTests,
      mutationValidationCount,
      queryValidationCount,
    },
    routes: routeInventory,
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
