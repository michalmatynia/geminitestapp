import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { getDomainFromPath, toPosix } from './constants.mjs';

const root = process.cwd();

export const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

export const getNodeName = (nameNode) => {
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

export const isNodeExported = (node) =>
  Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));

export const hash = (value) => crypto.createHash('sha1').update(value).digest('hex').slice(0, 12);

export const resolveImportTarget = async (fromAbsolutePath, moduleSpecifier) => {
  if (!moduleSpecifier) return null;

  let base;
  if (moduleSpecifier.startsWith('@/')) {
    base = path.join(root, 'src', moduleSpecifier.slice(2));
  } else if (moduleSpecifier.startsWith('.')) {
    base = path.resolve(path.dirname(fromAbsolutePath), moduleSpecifier);
  } else {
    return null;
  }

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];

  for (const candidate of candidates) {
    try {
      const stats = await fs.stat(candidate);
      if (stats.isFile()) return path.normalize(candidate);
    } catch {
      // continue
    }
  }

  return null;
};

export const collectStructuredMembers = (members, sourceFile) => {
  const signatures = [];
  const propertyNames = [];

  for (const member of members) {
    if (ts.isPropertySignature(member)) {
      const name = getNodeName(member.name) ?? '<computed>';
      const optional = Boolean(member.questionToken);
      const typeText = member.type ? normalizeWhitespace(member.type.getText(sourceFile)) : 'unknown';
      propertyNames.push(name);
      signatures.push(`prop:${name}${optional ? '?' : ''}:${typeText}`);
      continue;
    }

    if (ts.isMethodSignature(member)) {
      const name = getNodeName(member.name) ?? '<computed>';
      const optional = Boolean(member.questionToken);
      const params = member.parameters
        .map((parameter) => {
          const parameterName = getNodeName(parameter.name) ?? '<param>';
          const parameterType = parameter.type
            ? normalizeWhitespace(parameter.type.getText(sourceFile))
            : 'unknown';
          return `${parameterName}:${parameterType}`;
        })
        .join(',');
      const returnType = member.type ? normalizeWhitespace(member.type.getText(sourceFile)) : 'void';
      signatures.push(`method:${name}${optional ? '?' : ''}(${params}):${returnType}`);
      continue;
    }

    if (ts.isIndexSignatureDeclaration(member)) {
      const indexType = member.parameters
        .map((parameter) => {
          const parameterName = getNodeName(parameter.name) ?? 'key';
          const parameterType = parameter.type
            ? normalizeWhitespace(parameter.type.getText(sourceFile))
            : 'unknown';
          return `${parameterName}:${parameterType}`;
        })
        .join(',');
      const valueType = member.type ? normalizeWhitespace(member.type.getText(sourceFile)) : 'unknown';
      signatures.push(`index:[${indexType}]=>${valueType}`);
      continue;
    }

    signatures.push(`member:${ts.SyntaxKind[member.kind]}`);
  }

  signatures.sort();
  propertyNames.sort();

  return { signatures, propertyNames };
};

export const buildDeclarationRecord = (declaration, sourceFile, absolutePath) => {
  const name = declaration.name?.text;
  if (!name) return null;

  const toRelativePosix = (abs) => toPosix(path.relative(root, abs));
  const relativePath = toRelativePosix(absolutePath);
  const domain = getDomainFromPath(relativePath);
  const line = ts.getLineAndCharacterOfPosition(sourceFile, declaration.getStart(sourceFile)).line + 1;

  let kind;
  let shapeKind;
  let signatures = [];
  let propertyNames = [];
  let rawTypeText;

  if (ts.isInterfaceDeclaration(declaration)) {
    kind = 'interface';
    shapeKind = 'structural-members';
    const members = collectStructuredMembers(declaration.members, sourceFile);
    signatures = members.signatures;
    propertyNames = members.propertyNames;
  } else {
    kind = 'type';
    if (ts.isTypeLiteralNode(declaration.type)) {
      shapeKind = 'structural-members';
      const members = collectStructuredMembers(declaration.type.members, sourceFile);
      signatures = members.signatures;
      propertyNames = members.propertyNames;
    } else {
      shapeKind = 'type-expression';
      rawTypeText = normalizeWhitespace(declaration.type.getText(sourceFile));
      signatures = [rawTypeText];
    }
  }

  const normalizedShape = `${shapeKind}|${signatures.join(';')}`;
  const propertySignature = propertyNames.length > 0 ? propertyNames.join('|') : null;
  const id = `${relativePath}#${name}`;

  return {
    id,
    name,
    kind,
    shapeKind,
    normalizedShape,
    normalizedShapeHash: hash(normalizedShape),
    propertySignature,
    propertySignatureHash: propertySignature ? hash(propertySignature) : null,
    signatures,
    rawTypeText,
    memberCount: signatures.length,
    source: {
      path: relativePath,
      line,
      domain,
    },
    usageCount: 0,
    importedBy: [],
  };
};

export const collectDeclarations = async (absolutePath) => {
  const content = await fs.readFile(absolutePath, 'utf8');
  const sourceFile = ts.createSourceFile(absolutePath, content, ts.ScriptTarget.Latest, true);
  const declarations = [];

  const visit = (node) => {
    if (ts.isInterfaceDeclaration(node) && isNodeExported(node)) {
      const record = buildDeclarationRecord(node, sourceFile, absolutePath);
      if (record) declarations.push(record);
    }

    if (ts.isTypeAliasDeclaration(node) && isNodeExported(node)) {
      const record = buildDeclarationRecord(node, sourceFile, absolutePath);
      if (record) declarations.push(record);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return {
    sourceFile,
    declarations,
  };
};

export const collectNamedImports = async (absolutePath) => {
  const content = await fs.readFile(absolutePath, 'utf8');
  const sourceFile = ts.createSourceFile(absolutePath, content, ts.ScriptTarget.Latest, true);
  const imports = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!statement.importClause?.namedBindings) continue;
    if (!ts.isNamedImports(statement.importClause.namedBindings)) continue;

    const moduleSpecifier = statement.moduleSpecifier.getText(sourceFile).slice(1, -1);
    const target = await resolveImportTarget(absolutePath, moduleSpecifier);
    if (!target) continue;

    for (const element of statement.importClause.namedBindings.elements) {
      const importedName = element.propertyName ? element.propertyName.text : element.name.text;
      imports.push({
        importedName,
        target,
      });
    }
  }

  return imports;
};
