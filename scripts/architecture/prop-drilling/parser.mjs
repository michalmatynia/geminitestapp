import ts from 'typescript';
import { isComponentName, featureFromPath } from './constants.mjs';

export const hasModifier = (node, kind) => Boolean(node.modifiers?.some((modifier) => modifier.kind === kind));

export const getPropertyNameText = (nameNode) => {
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

export const createEmptyPropsMeta = () => ({
  propsIdentifier: null,
  localToSource: new Map(),
  knownSourceProps: new Set(),
  restIdentifiers: new Set(),
});

export const parsePropsMeta = (functionLikeNode) => {
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

export const collectParentPropRefs = (expression, propsMeta) => {
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

export const dedupeMappings = (mappings) => {
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

export const parseJsxAttributes = (jsxAttributes, propsMeta) => {
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

export const getTagReference = (tagNameNode) => {
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

export const unwrapComponentFunction = (initializer) => {
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

export const analyzeComponentEdges = ({ componentName, functionLikeNode, sourceFile, propsMeta }) => {
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

export const parseImports = (sourceFile) => {
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

export const parseExports = (sourceFile) => {
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

export const analyzeFile = ({ absolutePath, relativePath, raw }) => {
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
