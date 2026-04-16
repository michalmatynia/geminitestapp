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
const QUEUE_INIT_RELATIVE_PATH = path.join('src', 'features', 'jobs', 'queue-init.ts');
const TARGET_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

const hasExportModifier = (node) =>
  Array.isArray(node.modifiers) &&
  node.modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);

const readPropertyName = (name) => {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
};

const createSourceFile = (filePath, text) =>
  ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

const getNodeLocation = (sourceFile, node) => {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    line: position.line + 1,
    column: position.character + 1,
  };
};

const unwrapExpression = (node) => {
  let current = node;
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isPartiallyEmittedExpression(current) ||
      ts.isSatisfiesExpression?.(current))
  ) {
    current = current.expression;
  }
  return current;
};

const resolveModuleFile = ({ root, fromFile, specifier }) => {
  if (!specifier) return null;

  let basePath = null;
  if (specifier.startsWith('@/')) {
    basePath = path.join(root, 'src', specifier.slice(2));
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    basePath = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return null;
  }

  const candidates = [];
  if (path.extname(basePath)) {
    candidates.push(basePath);
  } else {
    for (const extension of TARGET_EXTENSIONS) {
      candidates.push(`${basePath}${extension}`);
    }
    for (const extension of TARGET_EXTENSIONS) {
      candidates.push(path.join(basePath, `index${extension}`));
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

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
    if (!entry.isFile()) continue;
    if (/\.test\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) continue;
    if (TARGET_EXTENSIONS.includes(path.extname(entry.name))) {
      acc.push(absolutePath);
    }
  }
  return acc;
};

const createFileCache = () => new Map();

const getParsedFile = (fileCache, filePath) => {
  if (fileCache.has(filePath)) return fileCache.get(filePath);
  const text = fs.readFileSync(filePath, 'utf8');
  const sourceFile = createSourceFile(filePath, text);
  const parsed = { filePath, text, sourceFile };
  fileCache.set(filePath, parsed);
  return parsed;
};

const collectTopLevelImports = ({ root, filePath, sourceFile }) => {
  const bindings = new Map();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const resolvedFile = resolveModuleFile({
      root,
      fromFile: filePath,
      specifier: statement.moduleSpecifier.text,
    });
    if (!resolvedFile || !statement.importClause) continue;

    if (statement.importClause.name) {
      bindings.set(statement.importClause.name.text, {
        resolvedFile,
        importedName: 'default',
      });
    }

    const namedBindings = statement.importClause.namedBindings;
    if (!namedBindings) continue;

    if (ts.isNamespaceImport(namedBindings)) {
      bindings.set(namedBindings.name.text, {
        resolvedFile,
        importedName: '*',
      });
      continue;
    }

    if (!ts.isNamedImports(namedBindings)) continue;
    for (const element of namedBindings.elements) {
      bindings.set(element.name.text, {
        resolvedFile,
        importedName: element.propertyName?.text ?? element.name.text,
      });
    }
  }

  return bindings;
};

const collectTopLevelConstInitializers = (sourceFile) => {
  const initializers = new Map();

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      initializers.set(declaration.name.text, declaration.initializer);
    }
  }

  return initializers;
};

const createStringResolver = ({
  root,
  filePath,
  sourceFile,
  fileCache,
  exportStringCache,
  localResolutionCache,
}) => {
  const imports = collectTopLevelImports({ root, filePath, sourceFile });
  const localInitializers = collectTopLevelConstInitializers(sourceFile);
  const visiting = new Set();

  const resolveIdentifier = (name) => {
    const cacheKey = `${filePath}:${name}`;
    if (localResolutionCache.has(cacheKey)) {
      return localResolutionCache.get(cacheKey);
    }
    if (visiting.has(cacheKey)) return null;
    visiting.add(cacheKey);

    let resolved = null;
    const localInitializer = localInitializers.get(name);
    if (localInitializer) {
      resolved = resolveExpression(localInitializer);
    } else {
      const imported = imports.get(name);
      if (imported && imported.importedName !== '*' && imported.importedName !== 'default') {
        const exportedStrings = collectExportedStringConsts({
          root,
          filePath: imported.resolvedFile,
          fileCache,
          exportStringCache,
          localResolutionCache,
        });
        resolved = exportedStrings.get(imported.importedName) ?? null;
      }
    }

    localResolutionCache.set(cacheKey, resolved);
    visiting.delete(cacheKey);
    return resolved;
  };

  const resolveExpression = (expression) => {
    const node = unwrapExpression(expression);
    if (!node) return null;
    if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    }
    if (ts.isIdentifier(node)) {
      return resolveIdentifier(node.text);
    }
    return null;
  };

  return resolveExpression;
};

const collectExportedStringConsts = ({
  root,
  filePath,
  fileCache,
  exportStringCache,
  localResolutionCache,
}) => {
  if (exportStringCache.has(filePath)) {
    return exportStringCache.get(filePath);
  }

  const { sourceFile } = getParsedFile(fileCache, filePath);
  const resolveString = createStringResolver({
    root,
    filePath,
    sourceFile,
    fileCache,
    exportStringCache,
    localResolutionCache,
  });
  const exportedStrings = new Map();

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement) || !hasExportModifier(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      const resolved = resolveString(declaration.initializer);
      if (resolved !== null) {
        exportedStrings.set(declaration.name.text, resolved);
      }
    }
  }

  exportStringCache.set(filePath, exportedStrings);
  return exportedStrings;
};

const collectExportedStartNames = (sourceFile) => {
  const startNames = new Set();

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && hasExportModifier(statement) && statement.name) {
      if (statement.name.text.startsWith('start')) {
        startNames.add(statement.name.text);
      }
      continue;
    }

    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        if (declaration.name.text.startsWith('start')) {
          startNames.add(declaration.name.text);
        }
      }
      continue;
    }

    if (!ts.isExportDeclaration(statement) || !statement.exportClause) continue;
    if (!ts.isNamedExports(statement.exportClause)) continue;
    for (const element of statement.exportClause.elements) {
      const exportedName = element.name.text;
      if (exportedName.startsWith('start')) {
        startNames.add(exportedName);
      }
    }
  }

  return [...startNames].sort();
};

const collectDynamicImports = ({ root, filePath, sourceFile }) => {
  const modules = [];

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      const specifier = node.arguments[0].text;
      const resolvedFile = resolveModuleFile({ root, fromFile: filePath, specifier });
      if (resolvedFile) {
        modules.push({ specifier, resolvedFile, node: node.arguments[0] });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return modules;
};

const collectCalledStartNames = (sourceFile) => {
  const startNames = new Set();

  const readCalleeName = (expression) => {
    const node = unwrapExpression(expression);
    if (!node) return null;

    if (ts.isIdentifier(node)) {
      return node.text;
    }
    if (ts.isPropertyAccessExpression(node) || ts.isPropertyAccessChain(node)) {
      return node.name.text;
    }
    if (ts.isElementAccessExpression(node) || ts.isElementAccessChain(node)) {
      const argument = unwrapExpression(node.argumentExpression);
      if (argument && ts.isStringLiteralLike(argument)) {
        return argument.text;
      }
    }
    return null;
  };

  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const calleeName = readCalleeName(node.expression);
      if (calleeName?.startsWith('start') && calleeName !== 'startAllWorkers') {
        startNames.add(calleeName);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return startNames;
};

const collectStringArrayValues = ({ sourceFile, variableName }) => {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== variableName) continue;
      const initializer = unwrapExpression(declaration.initializer);
      if (!initializer || !ts.isArrayLiteralExpression(initializer)) return [];
      return initializer.elements
        .map((element) => {
          const node = unwrapExpression(element);
          if (node && ts.isStringLiteralLike(node)) {
            return {
              value: node.text,
              node,
            };
          }
          return null;
        })
        .filter(Boolean);
    }
  }
  return [];
};

const collectLocalDependencies = ({ root, entryFile, fileCache, dependencyCache }) => {
  if (dependencyCache.has(entryFile)) return dependencyCache.get(entryFile);

  const visited = new Set();
  const stack = [entryFile];

  while (stack.length > 0) {
    const nextFile = stack.pop();
    if (!nextFile || visited.has(nextFile)) continue;
    visited.add(nextFile);

    const { sourceFile } = getParsedFile(fileCache, nextFile);
    for (const statement of sourceFile.statements) {
      let specifier = null;
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        specifier = statement.moduleSpecifier.text;
      } else if (
        ts.isExportDeclaration(statement) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        specifier = statement.moduleSpecifier.text;
      }
      if (!specifier) continue;

      const resolved = resolveModuleFile({ root, fromFile: nextFile, specifier });
      if (resolved && !visited.has(resolved)) {
        stack.push(resolved);
      }
    }
  }

  dependencyCache.set(entryFile, visited);
  return visited;
};

const collectRepeatEnqueueCalls = ({ root, filePath, sourceFile }) => {
  const issues = [];

  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = unwrapExpression(node.expression);
      const isEnqueueCall =
        (ts.isPropertyAccessExpression(callee) || ts.isPropertyAccessChain(callee)) &&
        callee.name.text === 'enqueue';
      if (isEnqueueCall) {
        const optionsArgument = unwrapExpression(node.arguments[1]);
        if (optionsArgument && ts.isObjectLiteralExpression(optionsArgument)) {
          let hasRepeat = false;
          let hasJobId = false;
          let repeatPropertyNode = null;

          for (const property of optionsArgument.properties) {
            if (!ts.isPropertyAssignment(property)) continue;
            const name = readPropertyName(property.name);
            if (name === 'repeat') {
              hasRepeat = true;
              repeatPropertyNode = property;
            }
            if (name === 'jobId') {
              hasJobId = true;
            }
          }

          if (hasRepeat && !hasJobId) {
            const location = getNodeLocation(sourceFile, repeatPropertyNode ?? node);
            issues.push(
              createIssue({
                severity: 'error',
                ruleId: 'queue-repeat-missing-jobid',
                file: toRepoRelativePath(root, filePath),
                line: location.line,
                column: location.column,
                message:
                  'Repeatable queue jobs must set a stable jobId to avoid duplicate scheduler registration.',
              })
            );
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return issues;
};

const discoverQueues = ({ root, fileCache, exportStringCache, localResolutionCache }) => {
  const queues = [];
  const sourceFiles = listSourceFiles(path.join(root, SOURCE_ROOT));

  for (const filePath of sourceFiles) {
    const parsed = getParsedFile(fileCache, filePath);
    const { sourceFile } = parsed;
    const resolveString = createStringResolver({
      root,
      filePath,
      sourceFile,
      fileCache,
      exportStringCache,
      localResolutionCache,
    });

    const visit = (node) => {
      if (ts.isCallExpression(node)) {
        const callee = unwrapExpression(node.expression);
        if (ts.isIdentifier(callee) && callee.text === 'createManagedQueue') {
          const configArgument = unwrapExpression(node.arguments[0]);
          if (configArgument && ts.isObjectLiteralExpression(configArgument)) {
            const nameProperty = configArgument.properties.find(
              (property) =>
                ts.isPropertyAssignment(property) && readPropertyName(property.name) === 'name'
            );
            const queueName =
              nameProperty && ts.isPropertyAssignment(nameProperty)
                ? resolveString(nameProperty.initializer)
                : null;
            const location = getNodeLocation(sourceFile, node);
            queues.push({
              queueName,
              filePath,
              repoRelativeFile: toRepoRelativePath(root, filePath),
              line: location.line,
              column: location.column,
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return queues;
};

export const analyzeQueueRuntime = ({ root = process.cwd() } = {}) => {
  const fileCache = createFileCache();
  const exportStringCache = new Map();
  const localResolutionCache = new Map();
  const dependencyCache = new Map();

  const issues = [];
  const discoveredQueues = discoverQueues({ root, fileCache, exportStringCache, localResolutionCache });
  const queueInitPath = path.join(root, QUEUE_INIT_RELATIVE_PATH);

  if (!fs.existsSync(queueInitPath)) {
    const issue = createIssue({
      severity: 'error',
      ruleId: 'queue-init-missing',
      file: QUEUE_INIT_RELATIVE_PATH.replace(/\\/g, '/'),
      message: 'Queue runtime init file is missing.',
    });
    const summary = summarizeIssues([issue]);
    return {
      generatedAt: new Date().toISOString(),
      durationMs: 0,
      status: summary.status,
      summary: {
        queueCount: discoveredQueues.length,
        queueInitModuleCount: 0,
        gatedQueueCount: 0,
        explicitStartCallCount: 0,
        repeatQueueModuleCount: 0,
        errorCount: summary.errorCount,
        warningCount: summary.warningCount,
      },
      queues: [],
      issues: [issue],
      rules: summarizeRules([issue]),
    };
  }

  const queueInitParsed = getParsedFile(fileCache, queueInitPath);
  const queueInitImports = collectDynamicImports({
    root,
    filePath: queueInitPath,
    sourceFile: queueInitParsed.sourceFile,
  });
  const queueInitEntries = [];
  const queueInitEntryByFile = new Map();

  for (const queueImport of queueInitImports) {
    if (queueInitEntryByFile.has(queueImport.resolvedFile)) continue;
    const entryParsed = getParsedFile(fileCache, queueImport.resolvedFile);
    const closure = collectLocalDependencies({
      root,
      entryFile: queueImport.resolvedFile,
      fileCache,
      dependencyCache,
    });
    queueInitEntryByFile.set(queueImport.resolvedFile, {
      specifier: queueImport.specifier,
      resolvedFile: queueImport.resolvedFile,
      repoRelativeFile: toRepoRelativePath(root, queueImport.resolvedFile),
      exportedStartNames: collectExportedStartNames(entryParsed.sourceFile),
      closureFiles: closure,
    });
  }

  for (const entry of queueInitEntryByFile.values()) {
    const closureRepeatIssues = [];
    let usesRepeatJobs = false;
    for (const closureFile of entry.closureFiles) {
      const parsed = getParsedFile(fileCache, closureFile);
      const repeatIssues = collectRepeatEnqueueCalls({
        root,
        filePath: closureFile,
        sourceFile: parsed.sourceFile,
      });
      if (repeatIssues.length > 0) {
        usesRepeatJobs = true;
        closureRepeatIssues.push(...repeatIssues);
      }
      if (parsed.text.includes('repeat:')) {
        usesRepeatJobs = true;
      }
    }

    entry.usesRepeatJobs = usesRepeatJobs;
    entry.repeatIssues = closureRepeatIssues;
    queueInitEntries.push(entry);
  }

  const explicitStartCallNames = collectCalledStartNames(queueInitParsed.sourceFile);
  const gatedQueueEntries = collectStringArrayValues({
    sourceFile: queueInitParsed.sourceFile,
    variableName: 'STARTUP_GATED_QUEUE_NAMES',
  });
  const gatedQueueNames = new Set(gatedQueueEntries.map((entry) => entry.value));

  const queuesByName = new Map();
  const queuesByFile = new Map();

  for (const queue of discoveredQueues) {
    if (!queue.queueName) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'queue-name-unresolved',
          file: queue.repoRelativeFile,
          line: queue.line,
          column: queue.column,
          message: 'Unable to resolve queue name for createManagedQueue call.',
        })
      );
      continue;
    }

    const existingByName = queuesByName.get(queue.queueName) ?? [];
    existingByName.push(queue);
    queuesByName.set(queue.queueName, existingByName);
    queuesByFile.set(queue.filePath, queue);
  }

  for (const [queueName, queueMatches] of queuesByName.entries()) {
    if (queueMatches.length < 2) continue;
    for (const queue of queueMatches) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'queue-name-duplicate',
          file: queue.repoRelativeFile,
          line: queue.line,
          column: queue.column,
          message: `Queue name "${queueName}" is declared multiple times.`,
        })
      );
    }
  }

  for (const gatedQueue of gatedQueueEntries) {
    if (queuesByName.has(gatedQueue.value)) continue;
    const location = getNodeLocation(queueInitParsed.sourceFile, gatedQueue.node);
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'queue-gated-name-unknown',
        file: toRepoRelativePath(root, queueInitPath),
        line: location.line,
        column: location.column,
        message: `STARTUP_GATED_QUEUE_NAMES references unknown queue "${gatedQueue.value}".`,
      })
    );
  }

  for (const entry of queueInitEntries) {
    issues.push(...entry.repeatIssues);
  }

  const queueInventory = [];

  for (const queue of discoveredQueues.filter((item) => item.queueName)) {
    const owners = queueInitEntries.filter((entry) => entry.closureFiles.has(queue.filePath));
    const ownerModules = owners.map((entry) => entry.repoRelativeFile).sort();
    const ownerStartExports = [...new Set(owners.flatMap((entry) => entry.exportedStartNames))].sort();
    const explicitlyStarted = owners.some((entry) =>
      entry.exportedStartNames.some((name) => explicitStartCallNames.has(name))
    );
    const repeatManaged = owners.some((entry) => entry.usesRepeatJobs);
    const gated = gatedQueueNames.has(queue.queueName);

    if (owners.length === 0) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'queue-not-imported-by-init',
          file: queue.repoRelativeFile,
          line: queue.line,
          column: queue.column,
          message: `Queue "${queue.queueName}" is not reachable from ${QUEUE_INIT_RELATIVE_PATH.replace(/\\/g, '/')}.`,
        })
      );
    }

    if (gated && ownerStartExports.length === 0) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'queue-gated-missing-start-export',
          file: queue.repoRelativeFile,
          line: queue.line,
          column: queue.column,
          message: `Gated queue "${queue.queueName}" needs an exported start function so queue-init can start it explicitly.`,
        })
      );
    }

    if (gated && ownerStartExports.length > 0 && !explicitlyStarted) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'queue-gated-not-explicitly-started',
          file: toRepoRelativePath(root, queueInitPath),
          message: `Gated queue "${queue.queueName}" is imported but no matching start function is called from queue-init.`,
          context: {
            queueName: queue.queueName,
            startExports: ownerStartExports,
          },
        })
      );
    }

    if (repeatManaged && ownerStartExports.length === 0) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'queue-repeat-missing-start-export',
          file: queue.repoRelativeFile,
          line: queue.line,
          column: queue.column,
          message: `Queue "${queue.queueName}" registers repeat or recovery jobs but has no exported start function to register them.`,
        })
      );
    }

    if (repeatManaged && ownerStartExports.length > 0 && !explicitlyStarted) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'queue-repeat-not-explicitly-started',
          file: toRepoRelativePath(root, queueInitPath),
          message: `Queue "${queue.queueName}" depends on repeat or recovery scheduling but no matching start function is called from queue-init.`,
          context: {
            queueName: queue.queueName,
            startExports: ownerStartExports,
          },
        })
      );
    }

    queueInventory.push({
      queueName: queue.queueName,
      file: queue.repoRelativeFile,
      gated,
      repeatManaged,
      explicitlyStarted,
      ownerModules,
      startExports: ownerStartExports,
    });
  }

  const sortedIssues = sortIssues(issues);
  const summary = summarizeIssues(sortedIssues);

  return {
    generatedAt: new Date().toISOString(),
    durationMs: 0,
    status: summary.status,
    summary: {
      queueCount: queueInventory.length,
      queueInitModuleCount: queueInitEntries.length,
      gatedQueueCount: gatedQueueNames.size,
      explicitStartCallCount: explicitStartCallNames.size,
      repeatQueueModuleCount: queueInventory.filter((queue) => queue.repeatManaged).length,
      errorCount: summary.errorCount,
      warningCount: summary.warningCount,
    },
    queues: queueInventory.sort((left, right) => left.queueName.localeCompare(right.queueName)),
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
