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
import {
  authzRoutePolicies,
  privilegedRouteWarnings,
} from '../config/security-authz-matrix.config.mjs';

const APP_API_ROOT = path.join('src', 'app', 'api');
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

const DEFAULT_POLICY = {
  id: 'default-protected',
  expectedAccess: 'protected',
};

const normalizeRoutePath = (value) =>
  value.replace(/\\/g, '/').replace(/\/route\.ts$/, '').replace(/^\/+/, '');

const createSourceFile = (filePath, text) =>
  ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const readPropertyName = (name) => {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
};

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

const getBooleanOption = (initializer) => {
  if (!initializer) return null;
  if (initializer.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (initializer.kind === ts.SyntaxKind.FalseKeyword) return false;
  return null;
};

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

const MODULE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts'];

const resolveModuleSpecifier = ({ root, fromFile, specifier }) => {
  let base = null;
  if (specifier.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else if (specifier.startsWith('@/')) {
    base = path.join(root, 'src', specifier.slice(2));
  }
  if (!base) return null;

  const candidates = [
    ...MODULE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...MODULE_EXTENSIONS.map((extension) => path.join(base, `index${extension}`)),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
};

const fileSnapshotCache = new Map();

const getFileSnapshot = ({ root, filePath }) => {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const cacheKey = `${root}::${filePath}`;
  if (fileSnapshotCache.has(cacheKey)) {
    return fileSnapshotCache.get(cacheKey);
  }

  const text = fs.readFileSync(filePath, 'utf8');
  const sourceFile = createSourceFile(filePath, text);
  const imports = new Map();
  const reExports = new Map();
  const localExportAliases = new Map();
  const localVariables = new Map();
  const localFunctions = new Map();

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const resolved = resolveModuleSpecifier({
        root,
        fromFile: filePath,
        specifier: statement.moduleSpecifier.text,
      });
      if (!resolved) continue;
      const importClause = statement.importClause;
      if (!importClause) continue;
      if (importClause.name) {
        imports.set(importClause.name.text, { filePath: resolved, symbolName: 'default' });
      }
      const bindings = importClause.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          imports.set(element.name.text, {
            filePath: resolved,
            symbolName: element.propertyName?.text ?? element.name.text,
          });
        }
      }
      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      const exportClause = statement.exportClause;
      const resolved =
        statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
          ? resolveModuleSpecifier({
            root,
            fromFile: filePath,
            specifier: statement.moduleSpecifier.text,
          })
          : null;
      if (!exportClause || !ts.isNamedExports(exportClause)) continue;
      for (const element of exportClause.elements) {
        const exportName = element.name.text;
        const localName = element.propertyName?.text ?? element.name.text;
        if (resolved) {
          reExports.set(exportName, { filePath: resolved, symbolName: localName });
          continue;
        }
        localExportAliases.set(exportName, localName);
      }
      continue;
    }

    if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
      localFunctions.set(statement.name.text, {
        bodyText: statement.body.getText(sourceFile),
      });
      continue;
    }

    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      localVariables.set(declaration.name.text, {
        initializer: declaration.initializer ?? null,
      });
    }
  }

  const snapshot = {
    filePath,
    text,
    sourceFile,
    imports,
    reExports,
    localExportAliases,
    localVariables,
    localFunctions,
  };
  fileSnapshotCache.set(cacheKey, snapshot);
  return snapshot;
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
        const method = declaration.name.text;
        if (!HTTP_METHODS.has(method)) continue;
        methods.push({
          method,
          exportNode: declaration.name,
        });
      }
      continue;
    }

    if (!ts.isExportDeclaration(statement)) continue;
    const exportClause = statement.exportClause;
    if (!exportClause || !ts.isNamedExports(exportClause)) continue;
    for (const element of exportClause.elements) {
      const method = element.name.text;
      if (!HTTP_METHODS.has(method)) continue;
      methods.push({
        method,
        exportNode: element.name,
      });
    }
  }

  return methods;
};

const emptyResolution = () => ({
  resolved: false,
  requireAuthOption: false,
  files: [],
  texts: [],
});

const mergeResolutions = (...resolutions) => {
  const merged = emptyResolution();
  for (const resolution of resolutions) {
    if (!resolution) continue;
    merged.resolved = merged.resolved || resolution.resolved;
    merged.requireAuthOption =
      merged.requireAuthOption || resolution.requireAuthOption === true;
    if (resolution.files?.length) {
      merged.files.push(...resolution.files);
    }
    if (resolution.texts?.length) {
      merged.texts.push(...resolution.texts);
    }
  }
  merged.files = [...new Set(merged.files)];
  return merged;
};

const resolveSymbolEvidence = ({ root, filePath, symbolName, visited = new Set() }) => {
  const resolutionKey = `${filePath}::${symbolName}`;
  if (visited.has(resolutionKey)) {
    return {
      resolved: true,
      requireAuthOption: false,
      files: [],
      texts: [],
    };
  }

  const snapshot = getFileSnapshot({ root, filePath });
  if (!snapshot) return emptyResolution();

  const nextVisited = new Set(visited);
  nextVisited.add(resolutionKey);

  if (snapshot.reExports.has(symbolName)) {
    const reExport = snapshot.reExports.get(symbolName);
    return resolveSymbolEvidence({
      root,
      filePath: reExport.filePath,
      symbolName: reExport.symbolName,
      visited: nextVisited,
    });
  }

  if (snapshot.localExportAliases.has(symbolName)) {
    return resolveSymbolEvidence({
      root,
      filePath,
      symbolName: snapshot.localExportAliases.get(symbolName),
      visited: nextVisited,
    });
  }

  if (snapshot.localFunctions.has(symbolName)) {
    return {
      resolved: true,
      requireAuthOption: false,
      files: [filePath],
      texts: [snapshot.localFunctions.get(symbolName).bodyText],
    };
  }

  if (snapshot.localVariables.has(symbolName)) {
    const { initializer } = snapshot.localVariables.get(symbolName);
    if (!initializer) {
      return {
        resolved: true,
        requireAuthOption: false,
        files: [filePath],
        texts: [],
      };
    }
    if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
      return {
        resolved: true,
        requireAuthOption: false,
        files: [filePath],
        texts: [initializer.body.getText(snapshot.sourceFile)],
      };
    }
    if (ts.isIdentifier(initializer)) {
      return resolveSymbolEvidence({
        root,
        filePath,
        symbolName: initializer.text,
        visited: nextVisited,
      });
    }
    if (ts.isCallExpression(initializer)) {
      const [firstArgument, optionsArgument] = initializer.arguments;
      const callResolution = {
        resolved: true,
        requireAuthOption: false,
        files: [filePath],
        texts: [],
      };
      if (optionsArgument && ts.isObjectLiteralExpression(optionsArgument)) {
        const options = readObjectOptions(optionsArgument);
        callResolution.requireAuthOption =
          getBooleanOption(options.get('requireAuth') ?? null) === true;
      }
      if (firstArgument && ts.isIdentifier(firstArgument)) {
        return mergeResolutions(
          callResolution,
          resolveSymbolEvidence({
            root,
            filePath,
            symbolName: firstArgument.text,
            visited: nextVisited,
          })
        );
      }
      if (
        firstArgument &&
        (ts.isArrowFunction(firstArgument) || ts.isFunctionExpression(firstArgument))
      ) {
        callResolution.texts.push(firstArgument.body.getText(snapshot.sourceFile));
        return callResolution;
      }
      if (firstArgument && ts.isCallExpression(firstArgument)) {
        return mergeResolutions(callResolution, {
          resolved: true,
          requireAuthOption: false,
          texts: [firstArgument.getText(snapshot.sourceFile)],
        });
      }
      return callResolution;
    }

    return {
      resolved: true,
      requireAuthOption: false,
      files: [filePath],
      texts: [initializer.getText(snapshot.sourceFile)],
    };
  }

  if (snapshot.imports.has(symbolName)) {
    const imported = snapshot.imports.get(symbolName);
    return resolveSymbolEvidence({
      root,
      filePath: imported.filePath,
      symbolName: imported.symbolName,
      visited: nextVisited,
    });
  }

  return emptyResolution();
};

export const resolveApiRouteMethodSource = ({ root, filePath, method }) =>
  resolveSymbolEvidence({ root, filePath, symbolName: method });

const resolvePolicy = (routePath, method) =>
  authzRoutePolicies.find(
    (policy) =>
      policy.pattern.test(routePath) &&
      (!Array.isArray(policy.methods) || policy.methods.includes(method))
  ) ?? DEFAULT_POLICY;

const isPrivilegedWarningRoute = (routePath) =>
  privilegedRouteWarnings.find((rule) => rule.pattern.test(routePath)) ?? null;

const AUTH_CALL_RE = /\bauth\s*\(/;
const AUTH_TIMING_RE = /\bwithTiming\s*\(\s*['"]auth['"]/;
const SESSION_USER_RE = /\bsession\??\.\s*user\b/;
const PERMISSION_RE = /\.permissions\??\.(includes|some)\s*\(|\bisElevated\b/;
const ACCESS_HELPER_RE =
  /\b(require|assert|resolve)[A-Z][A-Za-z0-9_]*(Access|Actor|Session|Permission)\s*\(/;
const READ_SESSION_RE = /\bread[A-Z][A-Za-z0-9_]*Session\s*\(/;
const SIGNATURE_RE = /\bverify[A-Z][A-Za-z0-9_]*Signature\s*\(/;

const collectEvidence = ({ routeText, handlerText, requireAuthOption }) => {
  const combined = `${routeText}\n${handlerText ?? ''}`;
  const hasAuthCall = AUTH_CALL_RE.test(combined) || AUTH_TIMING_RE.test(combined);
  const hasSessionUser = SESSION_USER_RE.test(combined);
  const hasPermissionCheck = PERMISSION_RE.test(combined);
  const hasAccessHelper = ACCESS_HELPER_RE.test(combined);
  const hasActorResolver =
    /\bresolveKangurActor\s*\(/.test(combined) || READ_SESSION_RE.test(combined);
  const hasSignatureCheck = SIGNATURE_RE.test(combined);

  return {
    hasAuthCall,
    hasSessionUser,
    hasPermissionCheck,
    hasAccessHelper,
    hasActorResolver,
    hasSignatureCheck,
    hasProtectedEvidence:
      requireAuthOption === true ||
      hasAuthCall ||
      hasSessionUser ||
      hasPermissionCheck ||
      hasAccessHelper ||
      hasActorResolver,
  };
};

const buildEvidenceSummary = (evidence) => {
  const parts = [];
  if (evidence.hasAuthCall) parts.push('auth()');
  if (evidence.hasSessionUser) parts.push('session.user');
  if (evidence.hasPermissionCheck) parts.push('permission/isElevated');
  if (evidence.hasAccessHelper) parts.push('access helper');
  if (evidence.hasActorResolver) parts.push('actor/session resolver');
  if (evidence.hasSignatureCheck) parts.push('signature verification');
  return parts;
};

export const analyzeSecurityAuthzMatrix = ({ root = process.cwd() } = {}) => {
  const issues = [];
  const absoluteApiRoot = path.join(root, APP_API_ROOT);
  const routeFiles = listRouteFiles(absoluteApiRoot);
  const routeResults = [];

  let publicRouteCount = 0;
  let protectedRouteCount = 0;
  let signedRouteCount = 0;
  let actorRouteCount = 0;

  for (const routeFile of routeFiles) {
    const routeText = fs.readFileSync(routeFile, 'utf8');
    const routeSourceFile = createSourceFile(routeFile, routeText);
    const routeMethods = extractRouteMethods({ sourceFile: routeSourceFile });
    const routePath = normalizeRoutePath(path.relative(absoluteApiRoot, routeFile));
    const repoRelativeRouteFile = toRepoRelativePath(root, routeFile);

    for (const routeMethod of routeMethods) {
      const policy = resolvePolicy(routePath, routeMethod.method);
      const symbolResolution = resolveSymbolEvidence({
        root,
        filePath: routeFile,
        symbolName: routeMethod.method,
      });
      const handlerText = symbolResolution.texts.join('\n');
      const evidence = collectEvidence({
        routeText,
        handlerText,
        requireAuthOption: symbolResolution.requireAuthOption === true,
      });
      const evidenceSummary = buildEvidenceSummary(evidence);
      const location = getNodeLocation(routeSourceFile, routeMethod.exportNode);

      if (policy.expectedAccess === 'public') {
        publicRouteCount += 1;
      } else if (policy.expectedAccess === 'signed') {
        signedRouteCount += 1;
      } else if (policy.expectedAccess === 'actor') {
        actorRouteCount += 1;
      } else {
        protectedRouteCount += 1;
      }

      routeResults.push({
        route: routePath,
        method: routeMethod.method,
        policyId: policy.id,
        expectedAccess: policy.expectedAccess,
        evidence: evidenceSummary,
      });

      if (!symbolResolution.resolved) {
        issues.push(
          createIssue({
            severity: 'warn',
            ruleId: 'authz-handler-source-unresolved',
            file: repoRelativeRouteFile,
            line: location.line,
            column: location.column,
            message: `Could not resolve handler source for ${routeMethod.method} ${routePath}; authz evidence was inferred from route.ts only.`,
          })
        );
      }

      if (policy.expectedAccess === 'signed') {
        if (!evidence.hasSignatureCheck) {
          issues.push(
            createIssue({
              severity: 'error',
              ruleId: 'authz-signed-route-missing-signature-verification',
              file: repoRelativeRouteFile,
              line: location.line,
              column: location.column,
              message: `${routeMethod.method} ${routePath} is classified as a signed ingress route but no signature verification was found.`,
              context: {
                policyId: policy.id,
                evidence: evidenceSummary,
              },
            })
          );
        }
        continue;
      }

      if (policy.expectedAccess === 'actor') {
        if (!evidence.hasActorResolver && !evidence.hasProtectedEvidence) {
          issues.push(
            createIssue({
              severity: 'error',
              ruleId: 'authz-actor-route-missing-session-or-actor-check',
              file: repoRelativeRouteFile,
              line: location.line,
              column: location.column,
              message: `${routeMethod.method} ${routePath} is classified as an actor-scoped route but no actor/session resolver was found.`,
              context: {
                policyId: policy.id,
                evidence: evidenceSummary,
              },
            })
          );
        }
        continue;
      }

      if (policy.expectedAccess !== 'public' && !evidence.hasProtectedEvidence) {
        issues.push(
          createIssue({
            severity: 'error',
            ruleId: 'authz-protected-route-missing-auth-check',
            file: repoRelativeRouteFile,
            line: location.line,
            column: location.column,
            message: `${routeMethod.method} ${routePath} is classified as ${policy.expectedAccess} but no auth/session/access helper was found.`,
            context: {
              policyId: policy.id,
              evidence: evidenceSummary,
            },
          })
        );
        continue;
      }

      const privilegedRule = isPrivilegedWarningRoute(routePath);
      if (
        privilegedRule &&
        policy.expectedAccess !== 'public' &&
        !evidence.hasPermissionCheck &&
        !evidence.hasAccessHelper &&
        !evidence.hasActorResolver
      ) {
        issues.push(
          createIssue({
            severity: 'warn',
            ruleId: 'authz-privileged-route-missing-explicit-permission-gate',
            file: repoRelativeRouteFile,
            line: location.line,
            column: location.column,
            message: `${routeMethod.method} ${routePath} relies on basic session auth without an explicit permission/access helper gate.`,
            context: {
              policyId: policy.id,
              warningPolicyId: privilegedRule.id,
              evidence: evidenceSummary,
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
      methodCount: routeResults.length,
      publicRouteCount,
      protectedRouteCount,
      signedRouteCount,
      actorRouteCount,
    },
    routes: routeResults,
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
