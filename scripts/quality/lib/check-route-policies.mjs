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

const APP_API_ROOT = path.join('src', 'app', 'api');
const AGENT_API_ROOT = path.join('src', 'features', 'ai', 'agentcreator', 'api');

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const ROUTE_ROOTS = [
  { id: 'app-api', relativeDir: APP_API_ROOT, enforceSource: true },
  { id: 'agentcreator-api', relativeDir: AGENT_API_ROOT, enforceSource: false },
];

const CSRF_EXEMPTION_POLICIES = [
  {
    id: 'auth-bootstrap',
    reason: 'Auth bootstrap flows need to accept requests before app CSRF is established.',
    pattern: /^auth(\/|$)/,
  },
  {
    id: 'deprecated-public-auth',
    reason: 'Deprecated auth endpoints stay reachable so stale clients receive a controlled 410 response.',
    pattern: /^kangur\/auth\/parent-magic-link(\/|$)/,
  },
  {
    id: 'telemetry-ingest',
    reason: 'Telemetry and client error endpoints ingest browser-originated reports.',
    pattern: /^(analytics\/events|query-telemetry|client-errors)(\/|$)/,
  },
  {
    id: 'draft-autosave',
    reason: 'Draft autosave routes support editor flows that may bypass standard fetch wrappers.',
    pattern: /^drafts(\/|$)/,
  },
  {
    id: 'webhook-ingest',
    reason: 'Webhook-style endpoints must accept third-party callbacks.',
    pattern: /^ai-paths\/portable-engine\/remediation-webhook(\/|$)/,
  },
  {
    id: 'external-integrations',
    reason: 'Integration routes accept external callbacks, requests, and connection flows.',
    pattern: /^v2\/integrations(\/|$)/,
  },
  {
    id: 'sync-automation',
    reason: 'Background sync routes may be invoked by non-browser automation flows.',
    pattern: /^v2\/products\/sync(\/|$)/,
  },
];

const hasExportModifier = (node) =>
  Array.isArray(node.modifiers) &&
  node.modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);

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

const readPropertyName = (name) => {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
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

const getBooleanOption = (initializer) => {
  if (initializer.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (initializer.kind === ts.SyntaxKind.FalseKeyword) return false;
  return null;
};

const getStringOption = (initializer) => {
  if (ts.isStringLiteralLike(initializer)) return initializer.text;
  return null;
};

const getArrayStringOption = (initializer) => {
  if (!ts.isArrayLiteralExpression(initializer)) return null;
  const values = [];
  for (const element of initializer.elements) {
    if (!ts.isStringLiteralLike(element)) return null;
    values.push(element.text);
  }
  return values;
};

const classifyCsrfExemption = (routePath) =>
  CSRF_EXEMPTION_POLICIES.find((policy) => policy.pattern.test(routePath)) ?? null;

const computeExpectedSource = (routePath, method) => `${routePath.split('/').join('.')}.${method}`;

const readObjectOptions = (objectLiteral) => {
  const result = new Map();
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = readPropertyName(property.name);
    if (!name) continue;
    result.set(name, property.initializer);
  }
  return result;
};

const extractRouteExports = ({ root, filePath, sourceFile }) => {
  const routeIssues = [];
  const exports = [];

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && hasExportModifier(statement) && statement.name) {
      const method = statement.name.text;
      if (!HTTP_METHODS.has(method)) continue;
      const location = getNodeLocation(sourceFile, statement.name);
      routeIssues.push(
        createIssue({
          severity: 'error',
          ruleId: 'route-export-direct-function',
          file: toRepoRelativePath(root, filePath),
          line: location.line,
          column: location.column,
          message: `Route exports ${method} as a function. Use apiHandler/apiHandlerWithParams wrapper exports instead.`,
        })
      );
      continue;
    }

    if (!ts.isVariableStatement(statement) || !hasExportModifier(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      const method = declaration.name.text;
      if (!HTTP_METHODS.has(method)) continue;

      const location = getNodeLocation(sourceFile, declaration.name);
      if (!declaration.initializer) {
        routeIssues.push(
          createIssue({
            severity: 'error',
            ruleId: 'route-export-missing-wrapper',
            file: toRepoRelativePath(root, filePath),
            line: location.line,
            column: location.column,
            message: `Route export ${method} must call apiHandler/apiHandlerWithParams or forward an imported route export.`,
          })
        );
        continue;
      }

      if (ts.isIdentifier(declaration.initializer)) {
        exports.push({
          method,
          wrapperName: 'forwarded',
          hasTypeArguments: false,
          options: null,
          node: declaration.name,
        });
        continue;
      }

      if (!ts.isCallExpression(declaration.initializer)) {
        routeIssues.push(
          createIssue({
            severity: 'error',
            ruleId: 'route-export-missing-wrapper',
            file: toRepoRelativePath(root, filePath),
            line: location.line,
            column: location.column,
            message: `Route export ${method} must call apiHandler/apiHandlerWithParams or forward an imported route export.`,
          })
        );
        continue;
      }

      const callExpression = declaration.initializer;
      const wrapperName = ts.isIdentifier(callExpression.expression)
        ? callExpression.expression.text
        : null;
      if (wrapperName !== 'apiHandler' && wrapperName !== 'apiHandlerWithParams') {
        routeIssues.push(
          createIssue({
            severity: 'error',
            ruleId: 'route-export-unsupported-wrapper',
            file: toRepoRelativePath(root, filePath),
            line: location.line,
            column: location.column,
            message: `Route export ${method} uses unsupported wrapper "${wrapperName ?? 'unknown'}".`,
          })
        );
        continue;
      }

      const optionsArgument = callExpression.arguments[1];
      const options =
        optionsArgument && ts.isObjectLiteralExpression(optionsArgument)
          ? readObjectOptions(optionsArgument)
          : null;

      exports.push({
        method,
        wrapperName,
        hasTypeArguments: Array.isArray(callExpression.typeArguments) && callExpression.typeArguments.length > 0,
        options,
        node: declaration.name,
      });
    }
  }

  return { exports, routeIssues };
};

export const analyzeRoutePolicies = ({ root = process.cwd() } = {}) => {
  const issues = [];
  const csrfExemptions = [];
  let routeCount = 0;
  let methodCount = 0;

  for (const routeRoot of ROUTE_ROOTS) {
    const absoluteRouteRoot = path.join(root, routeRoot.relativeDir);
    const routeFiles = listRouteFiles(absoluteRouteRoot);
    routeCount += routeFiles.length;

    for (const filePath of routeFiles) {
      const repoRelativeFile = toRepoRelativePath(root, filePath);
      const routePath = normalizeRoutePath(path.relative(absoluteRouteRoot, filePath));
      const dynamicRoute = routePath.includes('[');
      const text = fs.readFileSync(filePath, 'utf8');
      const sourceFile = createSourceFile(filePath, text);
      const { exports, routeIssues } = extractRouteExports({ root, filePath, sourceFile });

      issues.push(...routeIssues);

      if (exports.length === 0) {
        issues.push(
          createIssue({
            severity: 'warn',
            ruleId: 'route-export-none-detected',
            file: repoRelativeFile,
            message: 'Route file did not expose any HTTP method exports.',
          })
        );
        continue;
      }

      methodCount += exports.length;

      for (const routeExport of exports) {
        const location = getNodeLocation(sourceFile, routeExport.node);
        if (routeExport.wrapperName === 'forwarded') {
          continue;
        }
        const sourceValue = routeExport.options?.get('source')
          ? getStringOption(routeExport.options.get('source'))
          : null;
        const parseJsonBody = routeExport.options?.get('parseJsonBody')
          ? getBooleanOption(routeExport.options.get('parseJsonBody'))
          : null;
        const requireCsrf = routeExport.options?.get('requireCsrf')
          ? getBooleanOption(routeExport.options.get('requireCsrf'))
          : null;
        const bodySchemaPresent = Boolean(routeExport.options?.get('bodySchema'));
        const allowedMethods = routeExport.options?.get('allowedMethods')
          ? getArrayStringOption(routeExport.options.get('allowedMethods'))
          : null;

        if (routeRoot.enforceSource) {
          const expectedSource = computeExpectedSource(routePath, routeExport.method);
          if (!sourceValue) {
            issues.push(
              createIssue({
                severity: 'error',
                ruleId: 'route-missing-source',
                file: repoRelativeFile,
                line: location.line,
                column: location.column,
                message: `Route export ${routeExport.method} is missing a source option. Expected "${expectedSource}".`,
              })
            );
          } else if (sourceValue !== expectedSource) {
            issues.push(
              createIssue({
                severity: 'warn',
                ruleId: 'route-source-mismatch',
                file: repoRelativeFile,
                line: location.line,
                column: location.column,
                message: `Route export ${routeExport.method} uses source "${sourceValue}" but expected "${expectedSource}".`,
              })
            );
          }
        }

        if (dynamicRoute && routeExport.wrapperName !== 'apiHandlerWithParams') {
          issues.push(
            createIssue({
              severity: 'warn',
              ruleId: 'route-dynamic-wrapper-mismatch',
              file: repoRelativeFile,
              line: location.line,
              column: location.column,
              message: 'Dynamic route exports must use apiHandlerWithParams.',
            })
          );
        }

        if (dynamicRoute && routeExport.wrapperName === 'apiHandlerWithParams' && !routeExport.hasTypeArguments) {
          issues.push(
            createIssue({
              severity: 'warn',
              ruleId: 'route-dynamic-params-type-missing',
              file: repoRelativeFile,
              line: location.line,
              column: location.column,
              message: 'Dynamic route export is missing explicit params type arguments.',
            })
          );
        }

        if (!dynamicRoute && routeExport.wrapperName === 'apiHandlerWithParams') {
          issues.push(
            createIssue({
              severity: 'warn',
              ruleId: 'route-static-with-params-wrapper',
              file: repoRelativeFile,
              line: location.line,
              column: location.column,
              message: 'Static route export uses apiHandlerWithParams. Prefer apiHandler unless params are required.',
            })
          );
        }

        if (bodySchemaPresent && parseJsonBody !== true) {
          issues.push(
            createIssue({
              severity: 'error',
              ruleId: 'route-bodyschema-without-parsejson',
              file: repoRelativeFile,
              line: location.line,
              column: location.column,
              message: 'bodySchema is configured without parseJsonBody: true.',
            })
          );
        }

        if (parseJsonBody === true && SAFE_METHODS.has(routeExport.method)) {
          issues.push(
            createIssue({
              severity: 'error',
              ruleId: 'route-parsejson-safe-method',
              file: repoRelativeFile,
              line: location.line,
              column: location.column,
              message: `${routeExport.method} should not enable parseJsonBody.`,
            })
          );
        }

        if (parseJsonBody === true && !SAFE_METHODS.has(routeExport.method) && !bodySchemaPresent) {
          issues.push(
            createIssue({
              severity: 'warn',
              ruleId: 'route-parsejson-without-bodyschema',
              file: repoRelativeFile,
              line: location.line,
              column: location.column,
              message: `${routeExport.method} parses JSON without a bodySchema guard.`,
            })
          );
        }

        if (requireCsrf === false) {
          const exemption = classifyCsrfExemption(routePath);
          csrfExemptions.push({
            routePath,
            method: routeExport.method,
            policy: exemption?.id ?? 'unreviewed',
            reason: exemption?.reason ?? 'No approved exemption policy matched.',
          });

          if (SAFE_METHODS.has(routeExport.method)) {
            issues.push(
              createIssue({
                severity: 'warn',
                ruleId: 'route-csrf-optout-safe-method',
                file: repoRelativeFile,
                line: location.line,
                column: location.column,
                message: `${routeExport.method} explicitly disables CSRF even though safe methods already skip CSRF checks.`,
              })
            );
          } else if (!exemption) {
            issues.push(
              createIssue({
                severity: 'error',
                ruleId: 'route-csrf-optout-unreviewed',
                file: repoRelativeFile,
                line: location.line,
                column: location.column,
                message: `${routeExport.method} disables CSRF without matching a reviewed exemption policy.`,
              })
            );
          }
        }

        if (Array.isArray(allowedMethods) && !allowedMethods.includes(routeExport.method)) {
          issues.push(
            createIssue({
              severity: 'error',
              ruleId: 'route-allowedmethods-mismatch',
              file: repoRelativeFile,
              line: location.line,
              column: location.column,
              message: `allowedMethods does not include exported method ${routeExport.method}.`,
            })
          );
        }
      }
    }
  }

  const sortedIssues = sortIssues(issues);
  const summary = summarizeIssues(sortedIssues);
  const csrfExemptionsByPolicy = csrfExemptions.reduce((acc, exemption) => {
    acc[exemption.policy] = (acc[exemption.policy] ?? 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    status: summary.status,
    summary: {
      ...summary,
      routeCount,
      methodCount,
      csrfExemptionCount: csrfExemptions.length,
      csrfExemptionsByPolicy,
    },
    routeRoots: ROUTE_ROOTS.map((routeRoot) => routeRoot.relativeDir),
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
    csrfExemptions,
  };
};
