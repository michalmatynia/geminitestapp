import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { createIssue, sortIssues, summarizeIssues, summarizeRules } from './check-runner.mjs';

const SOURCE_ROOT = 'src';
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const TEST_FILE_RE = /\.(test|spec|test-support)\.(ts|tsx|js|jsx|mjs|cjs)$/;
const IGNORED_PATH_SEGMENTS = new Set(['__tests__', '__mocks__']);
const DIRECT_CLIENT_HOOK_NAMES = new Set([
  'useState',
  'useEffect',
  'useRef',
  'useMemo',
  'useCallback',
  'useReducer',
  'useContext',
  'useLayoutEffect',
  'useImperativeHandle',
  'useId',
  'useTransition',
  'useDeferredValue',
  'useSyncExternalStore',
  'useInsertionEffect',
  'useOptimistic',
  'useActionState',
  'usePathname',
  'useRouter',
  'useSearchParams',
  'useSelectedLayoutSegment',
  'useSelectedLayoutSegments',
  'useTranslations',
  'useLocale',
]);
const CLIENT_CONTEXT_FACTORY_NAMES = new Set(['createStrictContext', 'createStrictViewContext']);
const HOOK_NAME_RE = /^use[A-Z][A-Za-z0-9_]*$/;
const EVENT_HANDLER_RE = /^on[A-Z]/;
const CLIENT_GLOBAL_LABELS = new Map([
  ['window', 'window'],
  ['document', 'document'],
  ['navigator', 'navigator'],
  ['localStorage', 'localStorage'],
  ['sessionStorage', 'sessionStorage'],
]);
const SERVER_ENTRY_BASENAMES = new Set([
  'page',
  'layout',
  'template',
  'loading',
  'error',
  'global-error',
  'default',
  'not-found',
  'forbidden',
  'unauthorized',
]);
const APP_ROUTER_CLIENT_ENTRY_BASENAMES = new Set(['error', 'global-error']);
const SOURCE_EXTENSION_LIST = [...SOURCE_EXTENSIONS];

const toRepoRelativePath = (root, absolutePath) =>
  path.relative(root, absolutePath).replace(/\\/g, '/');

const getScriptKind = (absolutePath) => {
  const ext = path.extname(absolutePath);
  switch (ext) {
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.js':
      return ts.ScriptKind.JS;
    case '.mjs':
      return ts.ScriptKind.JS;
    case '.cjs':
      return ts.ScriptKind.JS;
    case '.ts':
    default:
      return ts.ScriptKind.TS;
  }
};

const isBrowserApiBoundaryFile = (absolutePath) => {
  const ext = path.extname(absolutePath);
  return ext === '.tsx' || ext === '.jsx';
};

const getLine = (sourceFile, nodeOrPosition) => {
  const position =
    typeof nodeOrPosition === 'number' ? nodeOrPosition : nodeOrPosition.getStart(sourceFile);
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
};

const getDirectiveText = (statement) => {
  if (!ts.isExpressionStatement(statement)) return null;
  const { expression } = statement;
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  return null;
};

const hasUseClientDirective = (sourceFile) => {
  for (const statement of sourceFile.statements) {
    const directiveText = getDirectiveText(statement);
    if (directiveText === null) break;
    if (directiveText === 'use client') return true;
  }
  return false;
};

const isIgnoredSourcePath = (relativePath) => {
  if (TEST_FILE_RE.test(relativePath)) return true;
  const segments = relativePath.split('/');
  return segments.some((segment) => IGNORED_PATH_SEGMENTS.has(segment));
};

const listSourceFiles = (absoluteDir, root, acc = []) => {
  if (!fs.existsSync(absoluteDir)) return acc;

  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listSourceFiles(absolutePath, root, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!SOURCE_EXTENSIONS.has(ext)) continue;
    const relativePath = toRepoRelativePath(root, absolutePath);
    if (isIgnoredSourcePath(relativePath)) continue;
    acc.push(absolutePath);
  }

  return acc;
};

const isServerEntrypointPath = (relativePath) => {
  if (!relativePath.startsWith('src/app/')) return false;
  const extension = path.extname(relativePath);
  const basename = path.basename(relativePath, extension);
  return SERVER_ENTRY_BASENAMES.has(basename);
};

const getFrameworkClientBoundaryReason = (relativePath) => {
  if (!relativePath.startsWith('src/app/')) return null;
  const extension = path.extname(relativePath);
  const basename = path.basename(relativePath, extension);
  if (!APP_ROUTER_CLIENT_ENTRY_BASENAMES.has(basename)) return null;

  return {
    ruleId: 'app-router-error-entrypoint',
    line: 1,
    message:
      'Next.js app router error entrypoints must remain Client Components with `use client`.',
  };
};

const resolveSourcePath = (candidatePath) => {
  const extension = path.extname(candidatePath);
  if (extension) {
    if (SOURCE_EXTENSIONS.has(extension) && fs.existsSync(candidatePath)) {
      return candidatePath;
    }
    return null;
  }

  for (const candidateExtension of SOURCE_EXTENSION_LIST) {
    const resolvedPath = `${candidatePath}${candidateExtension}`;
    if (fs.existsSync(resolvedPath)) return resolvedPath;
  }

  for (const candidateExtension of SOURCE_EXTENSION_LIST) {
    const resolvedPath = path.join(candidatePath, `index${candidateExtension}`);
    if (fs.existsSync(resolvedPath)) return resolvedPath;
  }

  return null;
};

const resolveLocalModuleSpecifier = ({ root, absolutePath, specifier }) => {
  let candidateBasePath = null;

  if (specifier.startsWith('@/')) {
    candidateBasePath = path.join(root, SOURCE_ROOT, specifier.slice(2));
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    candidateBasePath = path.resolve(path.dirname(absolutePath), specifier);
  }

  if (!candidateBasePath) return null;
  return resolveSourcePath(candidateBasePath);
};

const createScope = (parent = null) => ({ parent, names: new Set() });

const isNameDeclared = (scope, name) => {
  for (let current = scope; current; current = current.parent) {
    if (current.names.has(name)) return true;
  }
  return false;
};

const declareBindingName = (scope, nameNode) => {
  if (ts.isIdentifier(nameNode)) {
    scope.names.add(nameNode.text);
    return;
  }
  if (ts.isObjectBindingPattern(nameNode) || ts.isArrayBindingPattern(nameNode)) {
    for (const element of nameNode.elements) {
      if (ts.isBindingElement(element)) {
        declareBindingName(scope, element.name);
      }
    }
  }
};

const getPropertyNameText = (nameNode) => {
  if (ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode) || ts.isNumericLiteral(nameNode)) {
    return nameNode.text;
  }
  return null;
};

const collectImportMetadata = (sourceFile) => {
  const importedHookNames = new Set();
  const importedContextFactoryNames = new Set();
  const dynamicImportNames = new Set();
  const nextIntlProviderNames = new Set();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const { importClause, moduleSpecifier } = statement;
    if (!importClause || importClause.isTypeOnly || !ts.isStringLiteral(moduleSpecifier)) continue;

    const moduleSource = moduleSpecifier.text;

    if (moduleSource === 'next/dynamic' && importClause.name) {
      dynamicImportNames.add(importClause.name.text);
    }

    if (moduleSource === 'next-intl') {
      if (importClause.name && importClause.name.text === 'NextIntlClientProvider') {
        nextIntlProviderNames.add(importClause.name.text);
      }
      if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
        for (const element of importClause.namedBindings.elements) {
          if (element.isTypeOnly) continue;
          const importedName = element.propertyName?.text ?? element.name.text;
          if (importedName !== 'NextIntlClientProvider') continue;
          nextIntlProviderNames.add(element.name.text);
        }
      }
    }

    if (importClause.name) {
      const localName = importClause.name.text;
      if (HOOK_NAME_RE.test(localName) && !DIRECT_CLIENT_HOOK_NAMES.has(localName)) {
        importedHookNames.add(localName);
      }
      if (CLIENT_CONTEXT_FACTORY_NAMES.has(localName)) {
        importedContextFactoryNames.add(localName);
      }
    }

    if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
      for (const element of importClause.namedBindings.elements) {
        if (element.isTypeOnly) continue;
        const importedName = element.propertyName?.text ?? element.name.text;
        const localName = element.name.text;
        if (HOOK_NAME_RE.test(localName) && !DIRECT_CLIENT_HOOK_NAMES.has(localName)) {
          importedHookNames.add(localName);
        }
        if (CLIENT_CONTEXT_FACTORY_NAMES.has(importedName)) {
          importedContextFactoryNames.add(localName);
        }
      }
    }
  }

  return {
    importedHookNames,
    importedContextFactoryNames,
    dynamicImportNames,
    nextIntlProviderNames,
  };
};

const collectLocalDependencies = ({ sourceFile, absolutePath, root }) => {
  const dependencies = new Set();

  const addDependency = (specifier) => {
    const resolvedPath = resolveLocalModuleSpecifier({ root, absolutePath, specifier });
    if (resolvedPath) dependencies.add(resolvedPath);
  };

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (statement.importClause?.isTypeOnly) continue;
      if (ts.isStringLiteral(statement.moduleSpecifier)) {
        addDependency(statement.moduleSpecifier.text);
      }
      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      addDependency(statement.moduleSpecifier.text);
    }
  }

  return [...dependencies];
};

const collectReasons = ({ sourceFile }) => {
  const reasons = [];
  const scope = createScope();
  const {
    importedHookNames,
    importedContextFactoryNames,
    dynamicImportNames,
    nextIntlProviderNames,
  } =
    collectImportMetadata(sourceFile);

  const addReason = (ruleId, line, message) => {
    reasons.push({ ruleId, line, message });
  };

  const visit = (node, currentScope) => {
    if (ts.isImportDeclaration(node)) {
      const { importClause } = node;
      if (importClause && !importClause.isTypeOnly) {
        if (importClause.name) currentScope.names.add(importClause.name.text);
        const { namedBindings } = importClause;
        if (namedBindings) {
          if (ts.isNamespaceImport(namedBindings)) {
            currentScope.names.add(namedBindings.name.text);
          } else if (ts.isNamedImports(namedBindings)) {
            for (const element of namedBindings.elements) {
              if (!element.isTypeOnly) currentScope.names.add(element.name.text);
            }
          }
        }
      }
      return;
    }

    if (ts.isVariableDeclaration(node)) {
      declareBindingName(currentScope, node.name);
      if (node.initializer) visit(node.initializer, currentScope);
      return;
    }

    if (ts.isFunctionDeclaration(node) && node.name) {
      currentScope.names.add(node.name.text);
    }

    if (ts.isClassDeclaration(node) && node.name) {
      currentScope.names.add(node.name.text);
    }

    if (ts.isBlock(node) || ts.isCaseBlock(node) || ts.isModuleBlock(node)) {
      const nextScope = createScope(currentScope);
      ts.forEachChild(node, (child) => visit(child, nextScope));
      return;
    }

    if (ts.isFunctionLike(node)) {
      const nextScope = createScope(currentScope);
      if (node.name && ts.isIdentifier(node.name)) {
        nextScope.names.add(node.name.text);
      }
      for (const parameter of node.parameters) {
        declareBindingName(nextScope, parameter.name);
      }
      if (node.body) visit(node.body, nextScope);
      return;
    }

    if (ts.isCallExpression(node)) {
      const { expression } = node;

      if (ts.isIdentifier(expression)) {
        const calleeName = expression.text;

        if (DIRECT_CLIENT_HOOK_NAMES.has(calleeName)) {
          addReason(
            'client-react-hook',
            getLine(sourceFile, expression),
            `Uses client-only hook \`${calleeName}\`.`
          );
        }

        if (importedHookNames.has(calleeName)) {
          addReason(
            'custom-hook',
            getLine(sourceFile, expression),
            `Calls custom hook \`${calleeName}\`.`
          );
        }

        if (importedContextFactoryNames.has(calleeName)) {
          addReason(
            'context-factory',
            getLine(sourceFile, expression),
            `Calls client-only context factory \`${calleeName}\`.`
          );
        }

        if (calleeName === 'matchMedia' && !isNameDeclared(currentScope, 'matchMedia')) {
          addReason(
            'browser-api',
            getLine(sourceFile, expression),
            'Uses browser API `matchMedia`.'
          );
        }

        if (dynamicImportNames.has(calleeName)) {
          for (const argument of node.arguments) {
            if (!ts.isObjectLiteralExpression(argument)) continue;
            const hasSsrFalse = argument.properties.some((property) => {
              if (!ts.isPropertyAssignment(property)) return false;
              const propertyName = getPropertyNameText(property.name);
              return propertyName === 'ssr' && property.initializer.kind === ts.SyntaxKind.FalseKeyword;
            });
            if (hasSsrFalse) {
              addReason(
                'dynamic-ssr-false',
                getLine(sourceFile, argument),
                'Uses `next/dynamic` with `ssr: false`.'
              );
              break;
            }
          }
        }

        if (
          (calleeName === 'createContext' || calleeName === 'forwardRef') &&
          !isNameDeclared(currentScope, calleeName)
        ) {
          addReason(
            calleeName === 'createContext' ? 'create-context' : 'forward-ref',
            getLine(sourceFile, expression),
            calleeName === 'createContext'
              ? 'Creates React context in this module.'
              : 'Uses `forwardRef` in this module.'
          );
        }
      }

      if (
        ts.isPropertyAccessExpression(expression) &&
        ts.isIdentifier(expression.expression) &&
        expression.expression.text === 'React'
      ) {
        const calleeName = expression.name.text;
        if (DIRECT_CLIENT_HOOK_NAMES.has(calleeName)) {
          addReason(
            'client-react-hook',
            getLine(sourceFile, expression.name),
            `Uses client-only hook \`${calleeName}\`.`
          );
        }

        if (calleeName === 'createContext' || calleeName === 'forwardRef') {
          addReason(
            calleeName === 'createContext' ? 'create-context' : 'forward-ref',
            getLine(sourceFile, expression.name),
            calleeName === 'createContext'
              ? 'Creates React context in this module.'
              : 'Uses `forwardRef` in this module.'
          );
        }
      }
    }

    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      CLIENT_GLOBAL_LABELS.has(node.expression.text) &&
      !isNameDeclared(currentScope, node.expression.text)
    ) {
      addReason(
        'browser-api',
        getLine(sourceFile, node.expression),
        `Uses browser API \`${CLIENT_GLOBAL_LABELS.get(node.expression.text)}\`.`
      );
    }

    if (
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      CLIENT_GLOBAL_LABELS.has(node.expression.text) &&
      !isNameDeclared(currentScope, node.expression.text)
    ) {
      addReason(
        'browser-api',
        getLine(sourceFile, node.expression),
        `Uses browser API \`${CLIENT_GLOBAL_LABELS.get(node.expression.text)}\`.`
      );
    }

    if (ts.isJsxAttribute(node) && EVENT_HANDLER_RE.test(node.name.text)) {
      addReason(
        'jsx-event-handler',
        getLine(sourceFile, node.name),
        'Uses JSX event handlers.'
      );
    }

    if (
      nextIntlProviderNames.size > 0 &&
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      ts.isIdentifier(node.tagName) &&
      nextIntlProviderNames.has(node.tagName.text)
    ) {
      addReason(
        'next-intl-client-provider',
        getLine(sourceFile, node.tagName),
        'Wraps `NextIntlClientProvider`, which must stay on the client boundary.'
      );
    }

    ts.forEachChild(node, (child) => visit(child, currentScope));
  };

  visit(sourceFile, scope);

  return reasons.filter(
    (reason, index, items) =>
      items.findIndex(
        (candidate) =>
          candidate.ruleId === reason.ruleId &&
          candidate.line === reason.line &&
          candidate.message === reason.message
      ) === index
  );
};

export const analyzeClientBoundaryFile = ({ root = process.cwd(), absolutePath, content }) => {
  const relativePath = toRepoRelativePath(root, absolutePath);
  const sourceFile = ts.createSourceFile(
    absolutePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(absolutePath)
  );
  const hasUseClient = hasUseClientDirective(sourceFile);
  const reasons = collectReasons({ sourceFile });
  const frameworkReason = getFrameworkClientBoundaryReason(relativePath);
  if (frameworkReason) {
    reasons.unshift(frameworkReason);
  }
  const blockingReasons = reasons.filter(
    (reason) => reason.ruleId !== 'browser-api' || isBrowserApiBoundaryFile(absolutePath)
  );
  const dependencies = collectLocalDependencies({ sourceFile, absolutePath, root });

  return {
    absolutePath,
    relativePath,
    dependencies,
    hasUseClient,
    reasons,
    blockingReasons,
    isRemovableCandidate: hasUseClient && reasons.length === 0,
    requiresUseClient: blockingReasons.length > 0,
    isServerEntrypoint: isServerEntrypointPath(relativePath),
  };
};

export const auditClientBoundaries = ({ root = process.cwd() } = {}) => {
  const absoluteFiles = listSourceFiles(path.join(root, SOURCE_ROOT), root);
  const results = absoluteFiles
    .map((absolutePath) => {
      const content = fs.readFileSync(absolutePath, 'utf8');
      return analyzeClientBoundaryFile({ root, absolutePath, content });
    })
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  const resultMap = new Map(results.map((result) => [result.absolutePath, result]));
  const serverEntryResults = results.filter((result) => result.isServerEntrypoint);
  const serverReachableFiles = new Set();
  const serverReachabilityParents = new Map();
  const pending = serverEntryResults.map((result) => result.absolutePath);

  while (pending.length > 0) {
    const absolutePath = pending.pop();
    if (!absolutePath || serverReachableFiles.has(absolutePath)) continue;

    const result = resultMap.get(absolutePath);
    if (!result) continue;

    serverReachableFiles.add(absolutePath);
    if (result.hasUseClient) continue;

    for (const dependency of result.dependencies) {
      if (resultMap.has(dependency) && !serverReachableFiles.has(dependency)) {
        if (!serverReachabilityParents.has(dependency)) {
          serverReachabilityParents.set(dependency, absolutePath);
        }
        pending.push(dependency);
      }
    }
  }

  const buildServerReachablePath = (absolutePath) => {
    const pathChain = [];
    let current = absolutePath;

    while (current) {
      const result = resultMap.get(current);
      if (!result) break;
      pathChain.push(result.relativePath);
      current = serverReachabilityParents.get(current) ?? null;
    }

    return pathChain.reverse();
  };

  const missingBoundaryResults = results
    .filter(
      (result) =>
        serverReachableFiles.has(result.absolutePath) && result.requiresUseClient && !result.hasUseClient
    )
    .map((result) => ({
      ...result,
      reasons: result.blockingReasons,
      serverReachablePath: buildServerReachablePath(result.absolutePath),
    }));
  const removableCandidates = results.filter((result) => result.isRemovableCandidate);
  const protectedUseClientFiles = results.filter(
    (result) => result.hasUseClient && result.reasons.length > 0
  );

  return {
    root,
    sourceRoot: SOURCE_ROOT,
    filesScanned: results.length,
    serverEntrypoints: serverEntryResults.map((result) => result.relativePath),
    serverReachableFileCount: serverReachableFiles.size,
    results,
    serverReachabilityParents,
    missingBoundaryResults,
    removableCandidates,
    protectedUseClientFiles,
  };
};

export const analyzeClientBoundaries = ({ root = process.cwd() } = {}) => {
  const audit = auditClientBoundaries({ root });
  const issues = [];

  for (const result of audit.missingBoundaryResults) {
    for (const reason of result.reasons) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: `missing-use-client:${reason.ruleId}`,
          file: result.relativePath,
          line: reason.line,
          message: `${reason.message} Add \`'use client'\` or move the client-only logic behind an existing client boundary.`,
        })
      );
    }
  }

  const sortedIssues = sortIssues(issues);
  const summary = summarizeIssues(sortedIssues);

  return {
    generatedAt: new Date().toISOString(),
    status: summary.status,
    summary: {
      ...summary,
      fileCount: audit.filesScanned,
      serverReachableFileCount: audit.serverReachableFileCount,
      missingBoundaryFileCount: audit.missingBoundaryResults.length,
      removableCandidateCount: audit.removableCandidates.length,
      protectedUseClientFileCount: audit.protectedUseClientFiles.length,
    },
    scope: {
      root: audit.sourceRoot,
      serverEntrypoints: audit.serverEntrypoints,
      supportedExtensions: [...SOURCE_EXTENSIONS].sort(),
    },
    missingBoundaryFiles: audit.missingBoundaryResults.map((result) => ({
      file: result.relativePath,
      reasons: result.reasons,
      serverReachablePath: result.serverReachablePath,
    })),
    removableCandidates: audit.removableCandidates.map((result) => result.relativePath),
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
