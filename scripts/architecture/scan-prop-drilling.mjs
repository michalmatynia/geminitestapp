import fs from 'node:fs/promises';
import path from 'node:path';

import ts from 'typescript';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const outDir = path.join(root, 'docs', 'metrics');

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const JSX_EXTENSIONS = new Set(['.tsx', '.jsx']);
const HISTORY_DISABLED = args.has('--ci') || args.has('--no-history');
const NO_WRITE = args.has('--no-write');
const SUMMARY_JSON_ONLY = args.has('--summary-json');
const MAX_CHAIN_DEPTH = 7;
const MAX_CHAIN_COUNT = 6000;
const TOP_BACKLOG_LIMIT = 80;

const toPosix = (value) => value.split(path.sep).join('/');

const walk = async (directory) => {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const children = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return [fullPath];
    })
  );

  return children.flat();
};

const hasModifier = (node, kind) => Boolean(node.modifiers?.some((modifier) => modifier.kind === kind));

const isSourceFile = (filePath) => SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase());

const isJsxFile = (filePath) => JSX_EXTENSIONS.has(path.extname(filePath).toLowerCase());

const isComponentName = (name) => /^[A-Z][A-Za-z0-9_]*$/.test(name);

const normalizeAbsolute = (absolutePath) => path.normalize(absolutePath);

const featureFromPath = (relativePath) => {
  const featureMatch = relativePath.match(/^src\/features\/([^/]+)\//);
  if (featureMatch) return `feature:${featureMatch[1]}`;
  if (relativePath.startsWith('src/shared/ui/')) return 'shared-ui';
  if (relativePath.startsWith('src/shared/lib/')) return 'shared-lib';
  if (relativePath.startsWith('src/shared/')) return 'shared';
  if (relativePath.startsWith('src/app/')) return 'app';
  return 'other';
};

const getPropertyNameText = (nameNode) => {
  if (!nameNode) return null;
  if (ts.isIdentifier(nameNode)) return nameNode.text;
  if (ts.isStringLiteralLike(nameNode)) return nameNode.text;
  if (ts.isNumericLiteral(nameNode)) return nameNode.text;
  if (
    ts.isComputedPropertyName(nameNode) &&
    (ts.isStringLiteralLike(nameNode.expression) || ts.isNumericLiteral(nameNode.expression))
  ) {
    return nameNode.expression.text;
  }
  return null;
};

const createEmptyPropsMeta = () => ({
  propsIdentifier: null,
  localToSource: new Map(),
  knownSourceProps: new Set(),
  restIdentifiers: new Set(),
});

const parsePropsMeta = (functionLikeNode) => {
  const firstParam = functionLikeNode.parameters?.[0];
  if (!firstParam) return createEmptyPropsMeta();

  const meta = createEmptyPropsMeta();

  if (ts.isIdentifier(firstParam.name)) {
    meta.propsIdentifier = firstParam.name.text;
    return meta;
  }

  if (!ts.isObjectBindingPattern(firstParam.name)) {
    return meta;
  }

  for (const element of firstParam.name.elements) {
    if (element.dotDotDotToken) {
      if (ts.isIdentifier(element.name)) {
        meta.restIdentifiers.add(element.name.text);
      }
      continue;
    }

    if (!ts.isIdentifier(element.name)) continue;
    const localName = element.name.text;
    const sourceName = element.propertyName ? getPropertyNameText(element.propertyName) : localName;
    if (!sourceName) continue;

    meta.localToSource.set(localName, sourceName);
    meta.knownSourceProps.add(sourceName);
  }

  return meta;
};

const collectParentPropRefs = (expression, propsMeta) => {
  const refs = new Set();
  if (!expression) return refs;

  const visit = (node) => {
    if (ts.isPropertyAccessExpression(node)) {
      if (ts.isIdentifier(node.expression) && propsMeta.propsIdentifier === node.expression.text) {
        refs.add(node.name.text);
      }
      visit(node.expression);
      return;
    }

    if (ts.isElementAccessExpression(node)) {
      if (ts.isIdentifier(node.expression) && propsMeta.propsIdentifier === node.expression.text) {
        if (ts.isStringLiteralLike(node.argumentExpression) || ts.isNumericLiteral(node.argumentExpression)) {
          refs.add(node.argumentExpression.text);
        }
      }
      visit(node.expression);
      if (node.argumentExpression) visit(node.argumentExpression);
      return;
    }

    if (ts.isIdentifier(node)) {
      const mapped = propsMeta.localToSource.get(node.text);
      if (mapped) refs.add(mapped);
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(expression);
  return refs;
};

const dedupeMappings = (mappings) => {
  const seen = new Set();
  const deduped = [];
  for (const mapping of mappings) {
    const key = `${mapping.sourceProp}->${mapping.targetProp}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(mapping);
  }
  return deduped;
};

const parseJsxAttributes = (jsxAttributes, propsMeta) => {
  const mappings = [];
  let forwardAllFromUnknown = false;
  let forwardFromRest = false;

  for (const property of jsxAttributes.properties) {
    if (ts.isJsxAttribute(property)) {
      const targetProp = property.name.text;
      const initializer = property.initializer;
      if (!initializer) continue;

      if (ts.isJsxExpression(initializer) && initializer.expression) {
        const refs = collectParentPropRefs(initializer.expression, propsMeta);
        for (const sourceProp of refs) {
          mappings.push({ sourceProp, targetProp, kind: 'attribute' });
        }
      }
      continue;
    }

    if (!ts.isJsxSpreadAttribute(property)) continue;
    const spreadExpression = property.expression;

    if (ts.isIdentifier(spreadExpression)) {
      if (propsMeta.propsIdentifier === spreadExpression.text) {
        if (propsMeta.knownSourceProps.size > 0) {
          for (const sourceProp of propsMeta.knownSourceProps) {
            mappings.push({ sourceProp, targetProp: sourceProp, kind: 'spread-all-known' });
          }
        } else {
          forwardAllFromUnknown = true;
        }
        continue;
      }

      if (propsMeta.restIdentifiers.has(spreadExpression.text)) {
        forwardFromRest = true;
        continue;
      }
    }

    if (ts.isObjectLiteralExpression(spreadExpression)) {
      for (const objectProperty of spreadExpression.properties) {
        if (ts.isSpreadAssignment(objectProperty)) {
          const nestedSpread = objectProperty.expression;
          if (ts.isIdentifier(nestedSpread) && propsMeta.propsIdentifier === nestedSpread.text) {
            if (propsMeta.knownSourceProps.size > 0) {
              for (const sourceProp of propsMeta.knownSourceProps) {
                mappings.push({ sourceProp, targetProp: sourceProp, kind: 'spread-object-known' });
              }
            } else {
              forwardAllFromUnknown = true;
            }
            continue;
          }

          if (ts.isIdentifier(nestedSpread) && propsMeta.restIdentifiers.has(nestedSpread.text)) {
            forwardFromRest = true;
            continue;
          }
        }

        if (ts.isShorthandPropertyAssignment(objectProperty)) {
          const targetProp = objectProperty.name.text;
          const refs = collectParentPropRefs(objectProperty.name, propsMeta);
          for (const sourceProp of refs) {
            mappings.push({ sourceProp, targetProp, kind: 'spread-object-shorthand' });
          }
          continue;
        }

        if (ts.isPropertyAssignment(objectProperty)) {
          const targetProp = getPropertyNameText(objectProperty.name);
          if (!targetProp) continue;
          const refs = collectParentPropRefs(objectProperty.initializer, propsMeta);
          for (const sourceProp of refs) {
            mappings.push({ sourceProp, targetProp, kind: 'spread-object-assignment' });
          }
        }
      }
      continue;
    }

    const refs = collectParentPropRefs(spreadExpression, propsMeta);
    for (const sourceProp of refs) {
      mappings.push({ sourceProp, targetProp: sourceProp, kind: 'spread-expression' });
    }
  }

  return {
    mappings: dedupeMappings(mappings),
    forwardAllFromUnknown,
    forwardFromRest,
  };
};

const getTagReference = (tagNameNode) => {
  if (ts.isIdentifier(tagNameNode)) {
    if (!isComponentName(tagNameNode.text)) return null;
    return { kind: 'identifier', name: tagNameNode.text };
  }

  if (ts.isPropertyAccessExpression(tagNameNode) && ts.isIdentifier(tagNameNode.expression)) {
    const namespace = tagNameNode.expression.text;
    const member = tagNameNode.name.text;
    if (!isComponentName(member)) return null;
    return { kind: 'member', namespace, member };
  }

  return null;
};

const unwrapComponentFunction = (initializer) => {
  if (!initializer) return null;
  if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) return initializer;

  if (ts.isCallExpression(initializer) && initializer.arguments.length > 0) {
    const [firstArg] = initializer.arguments;
    if (ts.isArrowFunction(firstArg) || ts.isFunctionExpression(firstArg)) {
      return firstArg;
    }
  }

  return null;
};

const analyzeComponentEdges = ({ componentName, functionLikeNode, sourceFile, propsMeta }) => {
  const rawEdges = [];

  const visit = (node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tagRef = getTagReference(node.tagName);
      if (tagRef) {
        const parsed = parseJsxAttributes(node.attributes, propsMeta);
        if (parsed.mappings.length > 0 || parsed.forwardAllFromUnknown || parsed.forwardFromRest) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          rawEdges.push({
            fromComponentName: componentName,
            tagRef,
            line,
            mappings: parsed.mappings,
            forwardAllFromUnknown: parsed.forwardAllFromUnknown,
            forwardFromRest: parsed.forwardFromRest,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  if (functionLikeNode.body) {
    visit(functionLikeNode.body);
  }

  return rawEdges;
};

const parseImports = (sourceFile) => {
  const imports = new Map();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;

    const sourceSpecifier = statement.moduleSpecifier.text;
    const clause = statement.importClause;
    if (!clause) continue;

    if (clause.name) {
      imports.set(clause.name.text, {
        kind: 'default',
        sourceSpecifier,
        importedName: 'default',
      });
    }

    if (!clause.namedBindings) continue;
    if (ts.isNamespaceImport(clause.namedBindings)) {
      imports.set(clause.namedBindings.name.text, {
        kind: 'namespace',
        sourceSpecifier,
        importedName: '*',
      });
      continue;
    }

    for (const specifier of clause.namedBindings.elements) {
      const localName = specifier.name.text;
      const importedName = specifier.propertyName ? specifier.propertyName.text : specifier.name.text;
      imports.set(localName, {
        kind: 'named',
        sourceSpecifier,
        importedName,
      });
    }
  }

  return imports;
};

const parseExports = (sourceFile) => {
  const localExportMap = new Map();
  const namedReExports = [];
  const exportAllSpecifiers = [];
  let defaultExportLocalName = null;

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      const isExport = hasModifier(statement, ts.SyntaxKind.ExportKeyword);
      const isDefault = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
      if (isExport) {
        localExportMap.set(statement.name.text, statement.name.text);
      }
      if (isExport && isDefault) {
        defaultExportLocalName = statement.name.text;
      }
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      const isExport = hasModifier(statement, ts.SyntaxKind.ExportKeyword);
      const isDefault = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
      if (isExport) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) {
            localExportMap.set(declaration.name.text, declaration.name.text);
            if (isDefault) defaultExportLocalName = declaration.name.text;
          }
        }
      }
      continue;
    }

    if (ts.isClassDeclaration(statement) && statement.name) {
      const isExport = hasModifier(statement, ts.SyntaxKind.ExportKeyword);
      const isDefault = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
      if (isExport) {
        localExportMap.set(statement.name.text, statement.name.text);
      }
      if (isExport && isDefault) {
        defaultExportLocalName = statement.name.text;
      }
      continue;
    }

    if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression)) {
      defaultExportLocalName = statement.expression.text;
      continue;
    }

    if (!ts.isExportDeclaration(statement)) continue;

    const sourceSpecifier =
      statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text
        : null;

    if (!statement.exportClause) {
      if (sourceSpecifier) exportAllSpecifiers.push(sourceSpecifier);
      continue;
    }

    if (!ts.isNamedExports(statement.exportClause)) continue;

    for (const specifier of statement.exportClause.elements) {
      const exportedName = specifier.name.text;
      const importedName = specifier.propertyName ? specifier.propertyName.text : specifier.name.text;

      if (sourceSpecifier) {
        namedReExports.push({
          exportedName,
          importedName,
          sourceSpecifier,
        });
      } else {
        localExportMap.set(exportedName, importedName);
      }
    }
  }

  return {
    localExportMap,
    namedReExports,
    exportAllSpecifiers,
    defaultExportLocalName,
  };
};

const analyzeFile = ({ absolutePath, relativePath, raw }) => {
  const sourceFile = ts.createSourceFile(
    absolutePath,
    raw,
    ts.ScriptTarget.Latest,
    true,
    absolutePath.endsWith('.tsx')
      ? ts.ScriptKind.TSX
      : absolutePath.endsWith('.jsx')
        ? ts.ScriptKind.JSX
        : ts.ScriptKind.TS
  );

  const imports = parseImports(sourceFile);
  const exportInfo = parseExports(sourceFile);

  const components = new Map();

  const addComponent = ({ name, functionLikeNode, syntheticDefault = false }) => {
    const propsMeta = parsePropsMeta(functionLikeNode);
    const rawEdges = analyzeComponentEdges({
      componentName: name,
      functionLikeNode,
      sourceFile,
      propsMeta,
    });

    components.set(name, {
      id: `${relativePath}#${name}`,
      name,
      relativePath,
      feature: featureFromPath(relativePath),
      propsMeta,
      rawEdges,
      syntheticDefault,
    });
  };

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement)) {
      const isDefault = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
      if (statement.name && isComponentName(statement.name.text)) {
        addComponent({ name: statement.name.text, functionLikeNode: statement });
      } else if (!statement.name && isDefault) {
        addComponent({ name: '__default__', functionLikeNode: statement, syntheticDefault: true });
      }
      continue;
    }

    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !isComponentName(declaration.name.text)) continue;
      const functionLike = unwrapComponentFunction(declaration.initializer);
      if (!functionLike) continue;
      addComponent({ name: declaration.name.text, functionLikeNode: functionLike });
    }
  }

  if (exportInfo.defaultExportLocalName === null && components.has('__default__')) {
    exportInfo.defaultExportLocalName = '__default__';
  }

  return {
    absolutePath,
    relativePath,
    imports,
    components,
    ...exportInfo,
  };
};

const resolveImportAbsolute = ({ fromAbsolutePath, sourceSpecifier, sourcePathSet }) => {
  let basePath;
  if (sourceSpecifier.startsWith('@/')) {
    basePath = path.join(root, 'src', sourceSpecifier.slice(2));
  } else if (sourceSpecifier.startsWith('.')) {
    basePath = path.resolve(path.dirname(fromAbsolutePath), sourceSpecifier);
  } else {
    return null;
  }

  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.mjs`,
    `${basePath}.cjs`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.jsx'),
    path.join(basePath, 'index.mjs'),
    path.join(basePath, 'index.cjs'),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeAbsolute(candidate);
    if (sourcePathSet.has(normalized)) return normalized;
  }

  return null;
};

const buildExportedComponentIndex = (fileInfos) => {
  const index = new Map();

  for (const fileInfo of fileInfos.values()) {
    for (const [exportedName, localName] of fileInfo.localExportMap.entries()) {
      const component = fileInfo.components.get(localName);
      if (!component) continue;
      const list = index.get(exportedName) ?? [];
      list.push(component.id);
      index.set(exportedName, list);
    }
  }

  return index;
};

const resolveNamedExportedComponent = ({
  fileAbsolutePath,
  exportName,
  fileInfos,
  sourcePathSet,
  namedFallbackIndex,
  visited = new Set(),
}) => {
  const visitKey = `${fileAbsolutePath}::${exportName}`;
  if (visited.has(visitKey)) return null;
  visited.add(visitKey);

  const fileInfo = fileInfos.get(fileAbsolutePath);
  if (!fileInfo) return null;

  const directLocalName = fileInfo.localExportMap.get(exportName);
  if (directLocalName && fileInfo.components.has(directLocalName)) {
    return fileInfo.components.get(directLocalName).id;
  }

  for (const entry of fileInfo.namedReExports) {
    if (entry.exportedName !== exportName) continue;
    const targetAbsolute = resolveImportAbsolute({
      fromAbsolutePath: fileAbsolutePath,
      sourceSpecifier: entry.sourceSpecifier,
      sourcePathSet,
    });
    if (!targetAbsolute) continue;

    const resolved =
      entry.importedName === 'default'
        ? resolveDefaultExportedComponent({
            fileAbsolutePath: targetAbsolute,
            fileInfos,
            sourcePathSet,
            namedFallbackIndex,
            visited,
          })
        : resolveNamedExportedComponent({
            fileAbsolutePath: targetAbsolute,
            exportName: entry.importedName,
            fileInfos,
            sourcePathSet,
            namedFallbackIndex,
            visited,
          });

    if (resolved) return resolved;
  }

  for (const exportAllSource of fileInfo.exportAllSpecifiers) {
    const targetAbsolute = resolveImportAbsolute({
      fromAbsolutePath: fileAbsolutePath,
      sourceSpecifier: exportAllSource,
      sourcePathSet,
    });
    if (!targetAbsolute) continue;

    const resolved = resolveNamedExportedComponent({
      fileAbsolutePath: targetAbsolute,
      exportName,
      fileInfos,
      sourcePathSet,
      namedFallbackIndex,
      visited,
    });

    if (resolved) return resolved;
  }

  if (fileInfo.components.has(exportName)) {
    return fileInfo.components.get(exportName).id;
  }

  const fallback = namedFallbackIndex.get(exportName) ?? [];
  if (fallback.length === 1) return fallback[0];

  return null;
};

const resolveDefaultExportedComponent = ({
  fileAbsolutePath,
  fileInfos,
  sourcePathSet,
  namedFallbackIndex,
  visited = new Set(),
}) => {
  const visitKey = `${fileAbsolutePath}::default`;
  if (visited.has(visitKey)) return null;
  visited.add(visitKey);

  const fileInfo = fileInfos.get(fileAbsolutePath);
  if (!fileInfo) return null;

  if (fileInfo.defaultExportLocalName && fileInfo.components.has(fileInfo.defaultExportLocalName)) {
    return fileInfo.components.get(fileInfo.defaultExportLocalName).id;
  }

  for (const entry of fileInfo.namedReExports) {
    if (entry.exportedName !== 'default') continue;
    const targetAbsolute = resolveImportAbsolute({
      fromAbsolutePath: fileAbsolutePath,
      sourceSpecifier: entry.sourceSpecifier,
      sourcePathSet,
    });
    if (!targetAbsolute) continue;

    const resolved =
      entry.importedName === 'default'
        ? resolveDefaultExportedComponent({
            fileAbsolutePath: targetAbsolute,
            fileInfos,
            sourcePathSet,
            namedFallbackIndex,
            visited,
          })
        : resolveNamedExportedComponent({
            fileAbsolutePath: targetAbsolute,
            exportName: entry.importedName,
            fileInfos,
            sourcePathSet,
            namedFallbackIndex,
            visited,
          });

    if (resolved) return resolved;
  }

  return null;
};

const resolveEdgeTarget = ({
  fileInfo,
  edge,
  fileInfos,
  sourcePathSet,
  namedFallbackIndex,
}) => {
  if (edge.tagRef.kind === 'identifier') {
    const sameFileComponent = fileInfo.components.get(edge.tagRef.name);
    if (sameFileComponent) return sameFileComponent.id;

    const importBinding = fileInfo.imports.get(edge.tagRef.name);
    if (!importBinding) return null;

    const targetAbsolute = resolveImportAbsolute({
      fromAbsolutePath: fileInfo.absolutePath,
      sourceSpecifier: importBinding.sourceSpecifier,
      sourcePathSet,
    });
    if (!targetAbsolute) return null;

    if (importBinding.kind === 'default') {
      return resolveDefaultExportedComponent({
        fileAbsolutePath: targetAbsolute,
        fileInfos,
        sourcePathSet,
        namedFallbackIndex,
      });
    }

    if (importBinding.kind === 'named') {
      return resolveNamedExportedComponent({
        fileAbsolutePath: targetAbsolute,
        exportName: importBinding.importedName,
        fileInfos,
        sourcePathSet,
        namedFallbackIndex,
      });
    }

    return null;
  }

  if (edge.tagRef.kind === 'member') {
    const namespaceBinding = fileInfo.imports.get(edge.tagRef.namespace);
    if (!namespaceBinding || namespaceBinding.kind !== 'namespace') return null;
    const targetAbsolute = resolveImportAbsolute({
      fromAbsolutePath: fileInfo.absolutePath,
      sourceSpecifier: namespaceBinding.sourceSpecifier,
      sourcePathSet,
    });
    if (!targetAbsolute) return null;

    return resolveNamedExportedComponent({
      fileAbsolutePath: targetAbsolute,
      exportName: edge.tagRef.member,
      fileInfos,
      sourcePathSet,
      namedFallbackIndex,
    });
  }

  return null;
};

const toStateKey = (componentId, propName) => `${componentId}::${propName}`;

const scoreChain = ({ depth, rootFanout, distinctFeatureCount }) => {
  const intermediates = Math.max(depth - 2, 0);
  return (
    depth * 22 +
    intermediates * 17 +
    Math.max(rootFanout - 1, 0) * 10 +
    (depth >= 4 ? 24 : 0) +
    (distinctFeatureCount > 1 ? 6 : 0)
  );
};

const buildChains = ({ adjacency, componentById }) => {
  const incomingCount = new Map();
  for (const transitions of adjacency.values()) {
    for (const transition of transitions) {
      const nextKey = toStateKey(transition.toComponentId, transition.targetProp);
      incomingCount.set(nextKey, (incomingCount.get(nextKey) ?? 0) + 1);
    }
  }

  const allStates = [...adjacency.keys()];
  const rootStates = allStates.filter((stateKey) => (incomingCount.get(stateKey) ?? 0) === 0);
  const starts = rootStates.length > 0 ? rootStates : allStates;

  const chainByKey = new Map();

  for (const startState of starts) {
    if (chainByKey.size >= MAX_CHAIN_COUNT) break;
    const rootTransitions = adjacency.get(startState) ?? [];
    if (rootTransitions.length === 0) continue;

    const [startComponentId, startProp] = startState.split('::');

    const stack = [
      {
        stateKey: startState,
        componentPath: [startComponentId],
        propPath: [startProp],
        transitionPath: [],
        visitedStates: new Set([startState]),
      },
    ];

    while (stack.length > 0 && chainByKey.size < MAX_CHAIN_COUNT) {
      const current = stack.pop();
      const outgoing = adjacency.get(current.stateKey) ?? [];
      if (outgoing.length === 0) continue;

      for (const transition of outgoing) {
        const nextStateKey = toStateKey(transition.toComponentId, transition.targetProp);
        if (current.visitedStates.has(nextStateKey)) continue;

        const nextComponentPath = [...current.componentPath, transition.toComponentId];
        const nextPropPath = [...current.propPath, transition.targetProp];
        const nextTransitionPath = [...current.transitionPath, transition];
        const nextDepth = nextComponentPath.length;

        if (nextDepth >= 3) {
          const chainKey = `${nextComponentPath.join('>')}::${nextPropPath.join('>')}`;
          if (!chainByKey.has(chainKey)) {
            const distinctFeatureCount = new Set(
              nextComponentPath.map((componentId) => componentById.get(componentId)?.feature ?? 'other')
            ).size;

            const rootFanout = rootTransitions.length;
            const score = scoreChain({
              depth: nextDepth,
              rootFanout,
              distinctFeatureCount,
            });

            chainByKey.set(chainKey, {
              score,
              depth: nextDepth,
              rootFanout,
              distinctFeatureCount,
              rootComponentId: nextComponentPath[0],
              sinkComponentId: nextComponentPath[nextComponentPath.length - 1],
              componentPath: nextComponentPath,
              propPath: nextPropPath,
              transitions: nextTransitionPath,
            });
          }
        }

        if (nextTransitionPath.length >= MAX_CHAIN_DEPTH) continue;

        const nextVisitedStates = new Set(current.visitedStates);
        nextVisitedStates.add(nextStateKey);

        stack.push({
          stateKey: nextStateKey,
          componentPath: nextComponentPath,
          propPath: nextPropPath,
          transitionPath: nextTransitionPath,
          visitedStates: nextVisitedStates,
        });
      }
    }
  }

  return [...chainByKey.values()];
};

const toCsvLine = (fields) =>
  fields
    .map((field) => {
      const value = String(field ?? '');
      if (!/[",\n]/.test(value)) return value;
      return `"${value.replace(/"/g, '""')}"`;
    })
    .join(',');

const buildChainCsv = ({ chains, componentById }) => {
  const lines = [];
  lines.push(
    toCsvLine([
      'rank',
      'score',
      'depth',
      'root_component',
      'root_file',
      'sink_component',
      'sink_file',
      'root_fanout',
      'distinct_features',
      'prop_path',
      'component_path',
    ])
  );

  chains.forEach((chain, index) => {
    const root = componentById.get(chain.rootComponentId);
    const sink = componentById.get(chain.sinkComponentId);
    const componentPathText = chain.componentPath
      .map((componentId) => {
        const component = componentById.get(componentId);
        if (!component) return componentId;
        return `${component.name}(${component.relativePath})`;
      })
      .join(' -> ');

    lines.push(
      toCsvLine([
        index + 1,
        chain.score,
        chain.depth,
        root?.name ?? chain.rootComponentId,
        root?.relativePath ?? '',
        sink?.name ?? chain.sinkComponentId,
        sink?.relativePath ?? '',
        chain.rootFanout,
        chain.distinctFeatureCount,
        chain.propPath.join(' -> '),
        componentPathText,
      ])
    );
  });

  return `${lines.join('\n')}\n`;
};

const buildMarkdown = ({ summary, backlog, componentBacklog, componentById }) => {
  const lines = [];
  lines.push('# Prop Drilling Scan');
  lines.push('');
  lines.push(`Generated at: ${summary.generatedAt}`);
  lines.push('');
  lines.push('## Snapshot');
  lines.push('');
  lines.push(`- Scanned source files: ${summary.scannedSourceFiles}`);
  lines.push(`- JSX files scanned: ${summary.scannedJsxFiles}`);
  lines.push(`- Components detected: ${summary.componentCount}`);
  lines.push(`- Components forwarding parent props: ${summary.componentsWithForwarding}`);
  lines.push(`- Resolved forwarded transitions: ${summary.resolvedTransitionCount}`);
  lines.push(`- Candidate chains (depth >= 3): ${summary.candidateChainCount}`);
  lines.push(`- High-priority chains (depth >= 4): ${summary.highPriorityChainCount}`);
  lines.push(`- Unknown spread forwarding edges: ${summary.unknownSpreadForwardingCount}`);
  lines.push('');
  lines.push('## Hot Features');
  lines.push('');
  lines.push('| Feature Scope | Forwarding Components |');
  lines.push('| --- | ---: |');
  for (const entry of summary.topFeatureScopes) {
    lines.push(`| \`${entry.scope}\` | ${entry.count} |`);
  }
  lines.push('');
  lines.push('## Top Prop-Drilling Components');
  lines.push('');
  lines.push('| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding |');
  lines.push('| ---: | --- | --- | ---: | ---: | --- |');
  componentBacklog.slice(0, 40).forEach((entry, index) => {
    lines.push(
      `| ${index + 1} | \`${entry.name}\` | \`${entry.relativePath}\` | ${entry.forwardedPropCount} | ${entry.outgoingTransitionCount} | ${entry.hasUnknownSpreadForwarding ? 'yes' : 'no'} |`
    );
  });
  lines.push('');
  lines.push('## Ranked Chain Backlog');
  lines.push('');
  lines.push('| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |');
  lines.push('| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |');
  backlog.slice(0, TOP_BACKLOG_LIMIT).forEach((chain, index) => {
    const root = componentById.get(chain.rootComponentId);
    const sink = componentById.get(chain.sinkComponentId);
    lines.push(
      `| ${index + 1} | ${chain.score} | ${chain.depth} | \`${root?.name ?? chain.rootComponentId}\` | \`${sink?.name ?? chain.sinkComponentId}\` | ${chain.rootFanout} | ${chain.distinctFeatureCount} | \`${chain.propPath.join(' -> ')}\` |`
    );
  });
  lines.push('');
  lines.push('## Top Chain Details');
  lines.push('');

  backlog.slice(0, 15).forEach((chain, index) => {
    const root = componentById.get(chain.rootComponentId);
    const sink = componentById.get(chain.sinkComponentId);
    lines.push(`### ${index + 1}. ${root?.name ?? chain.rootComponentId} -> ${sink?.name ?? chain.sinkComponentId}`);
    lines.push('');
    lines.push(`- Score: ${chain.score}`);
    lines.push(`- Depth: ${chain.depth}`);
    lines.push(`- Root fanout: ${chain.rootFanout}`);
    lines.push(`- Prop path: ${chain.propPath.join(' -> ')}`);
    lines.push('- Component path:');
    for (const componentId of chain.componentPath) {
      const component = componentById.get(componentId);
      if (!component) {
        lines.push(`  - \`${componentId}\``);
        continue;
      }
      lines.push(`  - \`${component.name}\` (${component.relativePath})`);
    }
    lines.push('- Transition lines:');
    for (const transition of chain.transitions) {
      const fromComponent = componentById.get(transition.fromComponentId);
      const toComponent = componentById.get(transition.toComponentId);
      lines.push(
        `  - \`${fromComponent?.name ?? transition.fromComponentId}\` -> \`${toComponent?.name ?? transition.toComponentId}\`: \`${transition.sourceProp}\` -> \`${transition.targetProp}\` at ${transition.relativePath}:${transition.line}`
      );
    }
    lines.push('');
  });

  lines.push('## Execution Notes');
  lines.push('');
  lines.push('- Start with depth >= 4 chains in `feature:*` scopes.');
  lines.push('- Prefer introducing feature-level providers first, then split hot read/write contexts.');
  lines.push('- Re-run scan after each refactor wave and track depth/fanout reductions.');

  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const srcRoot = path.join(root, 'src');
  const files = (await walk(srcRoot)).filter((filePath) => isSourceFile(filePath));

  const sourcePathSet = new Set(files.map((filePath) => normalizeAbsolute(filePath)));
  const fileInfos = new Map();

  const scanInputs = [];
  for (const absolutePath of files) {
    const relativePath = toPosix(path.relative(root, absolutePath));
    if (relativePath.includes('/__tests__/')) continue;
    if (relativePath.includes('/__mocks__/')) continue;
    scanInputs.push({ absolutePath, relativePath });
  }

  for (const input of scanInputs) {
    const raw = await fs.readFile(input.absolutePath, 'utf8');
    const analyzed = analyzeFile({ ...input, raw });
    fileInfos.set(input.absolutePath, analyzed);
  }

  const namedFallbackIndex = buildExportedComponentIndex(fileInfos);
  const componentById = new Map();
  for (const fileInfo of fileInfos.values()) {
    for (const component of fileInfo.components.values()) {
      componentById.set(component.id, component);
    }
  }

  const transitionsByKey = new Map();
  const componentForwardingStats = new Map();
  let unknownSpreadForwardingCount = 0;

  for (const fileInfo of fileInfos.values()) {
    for (const component of fileInfo.components.values()) {
      const forwardedProps = new Set();
      let outgoingTransitionCount = 0;
      let hasUnknownSpreadForwarding = false;

      for (const edge of component.rawEdges) {
        const targetComponentId = resolveEdgeTarget({
          fileInfo,
          edge,
          fileInfos,
          sourcePathSet,
          namedFallbackIndex,
        });
        if (!targetComponentId) continue;

        if (edge.forwardAllFromUnknown || edge.forwardFromRest) {
          hasUnknownSpreadForwarding = true;
          unknownSpreadForwardingCount += 1;
        }

        for (const mapping of edge.mappings) {
          const key = `${component.id}|${targetComponentId}|${mapping.sourceProp}|${mapping.targetProp}`;
          if (transitionsByKey.has(key)) continue;
          transitionsByKey.set(key, {
            fromComponentId: component.id,
            toComponentId: targetComponentId,
            sourceProp: mapping.sourceProp,
            targetProp: mapping.targetProp,
            relativePath: component.relativePath,
            line: edge.line,
          });
          forwardedProps.add(mapping.sourceProp);
          outgoingTransitionCount += 1;
        }
      }

      componentForwardingStats.set(component.id, {
        forwardedProps,
        outgoingTransitionCount,
        hasUnknownSpreadForwarding,
      });
    }
  }

  const adjacency = new Map();
  for (const transition of transitionsByKey.values()) {
    const fromState = toStateKey(transition.fromComponentId, transition.sourceProp);
    const list = adjacency.get(fromState) ?? [];
    list.push(transition);
    adjacency.set(fromState, list);
  }

  const chains = buildChains({ adjacency, componentById });
  chains.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (right.depth !== left.depth) return right.depth - left.depth;
    return right.rootFanout - left.rootFanout;
  });

  const componentBacklog = [...componentForwardingStats.entries()]
    .map(([componentId, stats]) => {
      const component = componentById.get(componentId);
      return {
        componentId,
        name: component?.name ?? componentId,
        relativePath: component?.relativePath ?? '',
        feature: component?.feature ?? 'other',
        forwardedPropCount: stats.forwardedProps.size,
        outgoingTransitionCount: stats.outgoingTransitionCount,
        hasUnknownSpreadForwarding: stats.hasUnknownSpreadForwarding,
      };
    })
    .filter(
      (entry) =>
        entry.forwardedPropCount >= 2 || entry.outgoingTransitionCount >= 3 || entry.hasUnknownSpreadForwarding
    )
    .sort((left, right) => {
      if (right.forwardedPropCount !== left.forwardedPropCount) {
        return right.forwardedPropCount - left.forwardedPropCount;
      }
      return right.outgoingTransitionCount - left.outgoingTransitionCount;
    });

  const forwardingScopeCounts = new Map();
  for (const entry of componentBacklog) {
    forwardingScopeCounts.set(entry.feature, (forwardingScopeCounts.get(entry.feature) ?? 0) + 1);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    scannedSourceFiles: scanInputs.length,
    scannedJsxFiles: scanInputs.filter((entry) => isJsxFile(entry.absolutePath)).length,
    componentCount: componentById.size,
    componentsWithForwarding: componentBacklog.length,
    resolvedTransitionCount: transitionsByKey.size,
    candidateChainCount: chains.length,
    highPriorityChainCount: chains.filter((chain) => chain.depth >= 4).length,
    unknownSpreadForwardingCount,
    topFeatureScopes: [...forwardingScopeCounts.entries()]
      .map(([scope, count]) => ({ scope, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 20),
  };

  const backlog = chains.slice(0, TOP_BACKLOG_LIMIT);

  const result = {
    summary,
    backlog,
    componentBacklog,
    chains,
  };

  if (!NO_WRITE) {
    await fs.mkdir(outDir, { recursive: true });

    const stamp = summary.generatedAt.replace(/[:.]/g, '-');
    const latestJsonPath = path.join(outDir, 'prop-drilling-latest.json');
    const latestMdPath = path.join(outDir, 'prop-drilling-latest.md');
    const latestCsvPath = path.join(outDir, 'prop-drilling-chains-latest.csv');
    const historicalJsonPath = path.join(outDir, `prop-drilling-${stamp}.json`);

    await fs.writeFile(latestJsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    await fs.writeFile(
      latestMdPath,
      buildMarkdown({ summary, backlog, componentBacklog, componentById }),
      'utf8'
    );
    await fs.writeFile(latestCsvPath, buildChainCsv({ chains: backlog, componentById }), 'utf8');

    if (!HISTORY_DISABLED) {
      await fs.writeFile(historicalJsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    }

    if (!SUMMARY_JSON_ONLY) {
      console.log(`Wrote ${toPosix(path.relative(root, latestJsonPath))}`);
      console.log(`Wrote ${toPosix(path.relative(root, latestMdPath))}`);
      console.log(`Wrote ${toPosix(path.relative(root, latestCsvPath))}`);
      if (!HISTORY_DISABLED) {
        console.log(`Wrote ${toPosix(path.relative(root, historicalJsonPath))}`);
      }
    }
  }

  if (SUMMARY_JSON_ONLY) {
    console.log(JSON.stringify({ summary }));
    return;
  }

  console.log(
    [
      `Components: ${summary.componentCount}`,
      `Forwarding components: ${summary.componentsWithForwarding}`,
      `Transitions: ${summary.resolvedTransitionCount}`,
      `Chains: ${summary.candidateChainCount}`,
      `Depth>=4: ${summary.highPriorityChainCount}`,
    ].join(' | ')
  );
};

run().catch((error) => {
  console.error('[prop-drilling-scan] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
