import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import ts from 'typescript';

import { buildScanOutput } from './lib/scan-output.mjs';

const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');
const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);

const collectOptionValues = (flagName) => {
  const values = [];
  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index];
    if (!token) continue;

    if (token === flagName) {
      const nextToken = rawArgs[index + 1];
      if (nextToken && !nextToken.startsWith('-')) {
        values.push(nextToken);
        index += 1;
      }
      continue;
    }

    if (token.startsWith(`${flagName}=`)) {
      const value = token.slice(flagName.length + 1);
      if (value.length > 0) values.push(value);
    }
  }
  return values;
};

const readNumberOption = (flagName, fallbackValue) => {
  const [rawValue] = collectOptionValues(flagName);
  if (!rawValue) return fallbackValue;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallbackValue;
  return parsed;
};

const HISTORY_DISABLED = args.has('--ci') || args.has('--no-history');
const SUMMARY_JSON_ONLY = args.has('--summary-json');
const INIT_ONLY = args.has('--init');
const DOMAIN_FILTERS = collectOptionValues('--domain');
const MIN_RISK = readNumberOption('--min-risk', 0);
const TOP_LIMIT = Math.max(1, Math.floor(readNumberOption('--top', 25)));
const PLAN_TOP_LIMIT = Math.max(1, Math.floor(readNumberOption('--plan-top', 20)));

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const SKIP_SEGMENTS = new Set([
  'node_modules',
  '.next',
  '.git',
  'coverage',
  'dist',
  'build',
  'tmp',
]);

const toPosix = (value) => value.split(path.sep).join('/');
const toRelativePosix = (absolutePath) => toPosix(path.relative(root, absolutePath));

const walk = async (directory) => {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_SEGMENTS.has(entry.name)) return [];
        return walk(fullPath);
      }
      return [fullPath];
    })
  );

  return nested.flat();
};

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const getDomainFromPath = (relativePath) => {
  const featureMatch = relativePath.match(/^src\/features\/([^/]+)\//);
  if (featureMatch) return `feature:${featureMatch[1]}`;
  if (relativePath.startsWith('src/shared/contracts/')) return 'shared:contracts';
  if (relativePath.startsWith('src/shared/')) return 'shared';
  if (relativePath.startsWith('src/app/')) return 'app';
  return 'other';
};

const getNodeName = (nameNode) => {
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

const isNodeExported = (node) =>
  Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));

const hash = (value) => crypto.createHash('sha1').update(value).digest('hex').slice(0, 12);

const PRIMITIVE_ALIAS_TYPES = new Set([
  'string',
  'number',
  'boolean',
  'unknown',
  'any',
  'never',
  'null',
  'undefined',
  'void',
]);

const resolveImportTarget = async (fromAbsolutePath, moduleSpecifier) => {
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

const collectStructuredMembers = (members, sourceFile) => {
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

const buildDeclarationRecord = (declaration, sourceFile, absolutePath) => {
  const name = declaration.name?.text;
  if (!name) return null;

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

const collectDeclarations = async (absolutePath) => {
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

const collectNamedImports = async (absolutePath) => {
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

const scoreCluster = ({ declarationCount, domainCount, totalUsage }) => {
  return declarationCount * 3 + Math.min(domainCount, 5) * 2 + Math.min(totalUsage, 20);
};

const createBaseReport = () => ({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: 'scaffold',
  scanner: {
    name: 'scan-type-clusters',
    version: '0.1.0',
    mode: INIT_ONLY ? 'init' : 'scan',
    scope: 'src/**/*.{ts,tsx}',
  },
  filters: {
    domains: DOMAIN_FILTERS,
    minRisk: MIN_RISK,
  },
  thresholds: {
    minClusterSize: 2,
  },
  summary: {
    filesScanned: 0,
    exportedDeclarationsScanned: 0,
    candidateDeclarationsScanned: 0,
    exactShapeClusters: 0,
    nearShapeClusters: 0,
    clustersAfterFilters: 0,
    declarationsInClusters: 0,
    highestRiskScore: 0,
  },
  clusters: [],
  notes: [
    'This is a scanner scaffold output. Risk and clustering heuristics are intentionally conservative.',
    'Use clusters as review candidates before moving declarations to canonical DTO modules.',
  ],
});

const toClusterReportEntry = (clusterId, clusterKind, declarations) => {
  const domains = [...new Set(declarations.map((declaration) => declaration.source.domain))].sort();
  const totalUsage = declarations.reduce((sum, declaration) => sum + declaration.usageCount, 0);
  const riskScore = scoreCluster({
    declarationCount: declarations.length,
    domainCount: domains.length,
    totalUsage,
  });

  const [sample] = declarations;

  return {
    clusterId,
    clusterKind,
    canonicalDtoCandidate: null,
    riskScore,
    declarationCount: declarations.length,
    domains,
    signature: {
      shapeKind: sample.shapeKind,
      normalizedShapeHash: sample.normalizedShapeHash,
      memberCount: sample.memberCount,
      preview:
        sample.shapeKind === 'type-expression'
          ? sample.rawTypeText?.slice(0, 160) ?? ''
          : sample.signatures.slice(0, 8).join('; '),
    },
    declarations: declarations
      .slice()
      .sort((a, b) => b.usageCount - a.usageCount || a.source.path.localeCompare(b.source.path))
      .map((declaration) => ({
        name: declaration.name,
        kind: declaration.kind,
        path: declaration.source.path,
        line: declaration.source.line,
        domain: declaration.source.domain,
        usageCount: declaration.usageCount,
      })),
    notes: [
      'Review semantics before consolidating structurally similar declarations into one DTO.',
    ],
  };
};

const isClusterCandidateDeclaration = (declaration) => {
  if (declaration.shapeKind === 'structural-members' && declaration.memberCount === 0) {
    return false;
  }

  if (declaration.shapeKind === 'type-expression') {
    const normalizedRaw = declaration.rawTypeText ? normalizeWhitespace(declaration.rawTypeText) : null;
    if (normalizedRaw && PRIMITIVE_ALIAS_TYPES.has(normalizedRaw)) {
      return false;
    }
  }

  return true;
};

const createMarkdownReport = (report) => {
  const lines = [];
  lines.push('# Type Cluster Scanner Report');
  lines.push('');
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Status: ${report.status}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Files scanned: ${report.summary.filesScanned}`);
  lines.push(`- Exported declarations scanned: ${report.summary.exportedDeclarationsScanned}`);
  lines.push(`- Candidate declarations scanned: ${report.summary.candidateDeclarationsScanned}`);
  lines.push(`- Exact-shape clusters: ${report.summary.exactShapeClusters}`);
  lines.push(`- Near-shape clusters: ${report.summary.nearShapeClusters}`);
  lines.push(`- Clusters after filters: ${report.summary.clustersAfterFilters}`);
  lines.push(`- Declarations in clusters: ${report.summary.declarationsInClusters}`);
  lines.push(`- Highest risk score: ${report.summary.highestRiskScore}`);
  if (report.filters.domains.length > 0) {
    lines.push(`- Domain filter: ${report.filters.domains.join(', ')}`);
  }
  if (report.filters.minRisk > 0) {
    lines.push(`- Minimum risk filter: ${report.filters.minRisk}`);
  }
  lines.push('');
  lines.push('## Top Cluster Candidates');
  lines.push('');
  lines.push('| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |');
  lines.push('| --- | --- | ---: | ---: | --- | --- |');

  const topClusters = report.clusters.slice(0, TOP_LIMIT);
  if (topClusters.length === 0) {
    lines.push('| _none_ | - | 0 | 0 | - | - |');
  } else {
    for (const cluster of topClusters) {
      const dto = cluster.canonicalDtoCandidate ? `\`${cluster.canonicalDtoCandidate}\`` : '`TBD`';
      lines.push(
        `| \`${cluster.clusterId}\` | ${cluster.clusterKind} | ${cluster.riskScore} | ${cluster.declarationCount} | ${cluster.domains.join(', ')} | ${dto} |`
      );
    }
  }

  lines.push('');
  lines.push('## Initial DTO Consolidation Workflow');
  lines.push('');
  lines.push('1. Review top cluster candidates and validate semantic equivalence.');
  lines.push('2. Propose canonical DTO module path and naming for each approved cluster.');
  lines.push('3. Migrate imports incrementally and keep compatibility aliases where required.');
  lines.push('4. Re-run scanner and verify duplicate cluster count trends downward.');

  return `${lines.join('\n')}\n`;
};

const escapeCsvValue = (value) => {
  const normalized = String(value ?? '');
  if (!/[",\n]/.test(normalized)) return normalized;
  return `"${normalized.replace(/"/g, '""')}"`;
};

const createCsvReport = (report) => {
  const lines = [];
  lines.push(
    [
      'clusterId',
      'clusterKind',
      'riskScore',
      'declarationCount',
      'domains',
      'canonicalDtoCandidate',
      'signatureHash',
      'signatureKind',
    ].join(',')
  );

  for (const cluster of report.clusters) {
    lines.push(
      [
        cluster.clusterId,
        cluster.clusterKind,
        cluster.riskScore,
        cluster.declarationCount,
        cluster.domains.join('|'),
        cluster.canonicalDtoCandidate ?? '',
        cluster.signature.normalizedShapeHash,
        cluster.signature.shapeKind,
      ]
        .map(escapeCsvValue)
        .join(',')
    );
  }

  return `${lines.join('\n')}\n`;
};

const createPlanMarkdown = (report) => {
  const lines = [];
  lines.push('# Type Cluster Consolidation Plan');
  lines.push('');
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Prioritized Worklist');
  lines.push('');

  const planClusters = report.clusters.slice(0, PLAN_TOP_LIMIT);
  if (planClusters.length === 0) {
    lines.push('No clusters matched current filters.');
    lines.push('');
    return `${lines.join('\n')}\n`;
  }

  let index = 1;
  for (const cluster of planClusters) {
    lines.push(`${index}. [ ] ${cluster.clusterId} (${cluster.clusterKind})`);
    lines.push(`Risk: ${cluster.riskScore} | Declarations: ${cluster.declarationCount}`);
    lines.push(`Domains: ${cluster.domains.join(', ')}`);
    lines.push(`Suggested DTO: ${cluster.canonicalDtoCandidate ?? 'TBD'}`);
    lines.push(`Signature: ${cluster.signature.shapeKind} (${cluster.signature.normalizedShapeHash})`);
    lines.push('Notes: Validate semantic equivalence before migration.');
    lines.push('');
    index += 1;
  }

  lines.push('## Execution Checklist');
  lines.push('');
  lines.push('1. Approve canonical DTO destination and naming per cluster.');
  lines.push('2. Migrate one cluster at a time with compatibility aliases where needed.');
  lines.push('3. Run typecheck and targeted tests after each migration.');
  lines.push('4. Re-run scanner and update this plan after each wave.');

  return `${lines.join('\n')}\n`;
};

const writeOutputs = async (report) => {
  await fs.mkdir(outDir, { recursive: true });

  const latestJsonPath = path.join(outDir, 'type-clusters-latest.json');
  const latestMdPath = path.join(outDir, 'type-clusters-latest.md');
  const latestCsvPath = path.join(outDir, 'type-clusters-latest.csv');
  const latestPlanMdPath = path.join(outDir, 'type-clusters-plan-latest.md');
  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const historyJsonPath = path.join(outDir, `type-clusters-${stamp}.json`);

  await fs.writeFile(latestJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(latestMdPath, createMarkdownReport(report), 'utf8');
  await fs.writeFile(latestCsvPath, createCsvReport(report), 'utf8');
  await fs.writeFile(latestPlanMdPath, createPlanMarkdown(report), 'utf8');

  if (!HISTORY_DISABLED && !INIT_ONLY) {
    await fs.writeFile(historyJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  return {
    latestJsonPath,
    latestMdPath,
    latestCsvPath,
    latestPlanMdPath,
    historyJsonPath,
    wroteHistory: !HISTORY_DISABLED && !INIT_ONLY,
  };
};

const run = async () => {
  const report = createBaseReport();

  if (!INIT_ONLY) {
    const srcDir = path.join(root, 'src');
    const absoluteFiles = (await walk(srcDir)).filter((absolutePath) =>
      SOURCE_EXTENSIONS.has(path.extname(absolutePath).toLowerCase())
    );

    const declarationById = new Map();
    const fileToDeclarations = new Map();

    for (const absolutePath of absoluteFiles) {
      const { declarations } = await collectDeclarations(absolutePath);
      if (declarations.length === 0) continue;

      const declarationIds = [];
      for (const declaration of declarations) {
        declarationById.set(declaration.id, declaration);
        declarationIds.push(declaration.id);
      }
      fileToDeclarations.set(path.normalize(absolutePath), declarationIds);
    }

    const exportNameIndexByFile = new Map();
    for (const [filePath, declarationIds] of fileToDeclarations.entries()) {
      const nameToId = new Map();
      for (const declarationId of declarationIds) {
        const declaration = declarationById.get(declarationId);
        if (!declaration) continue;
        nameToId.set(declaration.name, declaration.id);
      }
      exportNameIndexByFile.set(filePath, nameToId);
    }

    for (const absolutePath of absoluteFiles) {
      const imports = await collectNamedImports(absolutePath);
      const importerPath = toRelativePosix(absolutePath);

      for (const entry of imports) {
        const declarationsByName = exportNameIndexByFile.get(entry.target);
        if (!declarationsByName) continue;
        const declarationId = declarationsByName.get(entry.importedName);
        if (!declarationId) continue;

        const declaration = declarationById.get(declarationId);
        if (!declaration) continue;

        if (!declaration.importedBy.includes(importerPath)) {
          declaration.importedBy.push(importerPath);
        }
      }
    }

    for (const declaration of declarationById.values()) {
      declaration.usageCount = declaration.importedBy.length;
    }

    const clusterCandidates = [...declarationById.values()].filter((declaration) =>
      isClusterCandidateDeclaration(declaration)
    );

    const exactShapeGroups = new Map();
    for (const declaration of clusterCandidates) {
      const key = declaration.normalizedShape;
      const group = exactShapeGroups.get(key) ?? [];
      group.push(declaration);
      exactShapeGroups.set(key, group);
    }

    const exactShapeClusters = [...exactShapeGroups.values()]
      .filter((group) => group.length >= report.thresholds.minClusterSize)
      .sort((a, b) => b.length - a.length);

    const exactShapeMembers = new Set();
    const nearShapeGroups = new Map();
    for (const group of exactShapeClusters) {
      for (const declaration of group) {
        exactShapeMembers.add(declaration.id);
      }
    }

    for (const declaration of clusterCandidates) {
      if (!declaration.propertySignature) continue;
      if (exactShapeMembers.has(declaration.id)) continue;
      const group = nearShapeGroups.get(declaration.propertySignature) ?? [];
      group.push(declaration);
      nearShapeGroups.set(declaration.propertySignature, group);
    }

    const nearShapeClusters = [...nearShapeGroups.values()]
      .filter((group) => group.length >= report.thresholds.minClusterSize)
      .sort((a, b) => b.length - a.length);

    const clusterEntries = [];

    for (const [index, group] of exactShapeClusters.entries()) {
      clusterEntries.push(
        toClusterReportEntry(
          `exact-${String(index + 1).padStart(4, '0')}`,
          'exact-shape',
          group
        )
      );
    }

    for (const [index, group] of nearShapeClusters.entries()) {
      clusterEntries.push(
        toClusterReportEntry(
          `near-${String(index + 1).padStart(4, '0')}`,
          'near-shape',
          group
        )
      );
    }

    clusterEntries.sort(
      (a, b) =>
        b.riskScore - a.riskScore || b.declarationCount - a.declarationCount || a.clusterId.localeCompare(b.clusterId)
    );

    const domainFilteredEntries =
      DOMAIN_FILTERS.length > 0
        ? clusterEntries.filter((cluster) =>
            DOMAIN_FILTERS.some((domainFilter) => cluster.domains.includes(domainFilter))
          )
        : clusterEntries;

    const filteredClusterEntries = domainFilteredEntries.filter(
      (cluster) => cluster.riskScore >= MIN_RISK
    );

    const clusteredDeclarationCount = filteredClusterEntries.reduce(
      (sum, cluster) => sum + cluster.declarationCount,
      0
    );

    report.generatedAt = new Date().toISOString();
    report.status = 'ok';
    report.summary = {
      filesScanned: absoluteFiles.length,
      exportedDeclarationsScanned: declarationById.size,
      candidateDeclarationsScanned: clusterCandidates.length,
      exactShapeClusters: exactShapeClusters.length,
      nearShapeClusters: nearShapeClusters.length,
      clustersAfterFilters: filteredClusterEntries.length,
      declarationsInClusters: clusteredDeclarationCount,
      highestRiskScore: filteredClusterEntries[0]?.riskScore ?? 0,
    };
    report.clusters = filteredClusterEntries;
  }

  const output = await writeOutputs(report);

  if (SUMMARY_JSON_ONLY) {
    process.stdout.write(
      `${JSON.stringify(
        buildScanOutput({
          scannerName: 'scan-type-clusters',
          scannerVersion: '1.0.0',
          summary: report.summary,
          details: {
            clusters: report.clusters,
            status: report.status,
          },
          filters: report.filters,
          paths: {
            latestJson: toRelativePosix(output.latestJsonPath),
            latestMarkdown: toRelativePosix(output.latestMdPath),
            latestCsv: toRelativePosix(output.latestCsvPath),
            latestPlanMarkdown: toRelativePosix(output.latestPlanMdPath),
            historyJson: output.wroteHistory ? toRelativePosix(output.historyJsonPath) : null,
          },
          notes: ['type-clusters scan result'],
        }),
        null,
        2
      )}\n`
    );
    return;
  }

  console.log(`[type-clusters] status=${report.status}`);
  console.log(
    `[type-clusters] scanned files=${report.summary.filesScanned} exportedDeclarations=${report.summary.exportedDeclarationsScanned}`
  );
  console.log(
    `[type-clusters] clusters exact=${report.summary.exactShapeClusters} near=${report.summary.nearShapeClusters}`
  );
  console.log(
    `[type-clusters] filters domains=${report.filters.domains.join('|') || '<none>'} minRisk=${report.filters.minRisk}`
  );
  console.log(`[type-clusters] wrote ${toRelativePosix(output.latestJsonPath)}`);
  console.log(`[type-clusters] wrote ${toRelativePosix(output.latestMdPath)}`);
  console.log(`[type-clusters] wrote ${toRelativePosix(output.latestCsvPath)}`);
  console.log(`[type-clusters] wrote ${toRelativePosix(output.latestPlanMdPath)}`);
  if (output.wroteHistory) {
    console.log(`[type-clusters] wrote ${toRelativePosix(output.historyJsonPath)}`);
  }
};

run().catch((error) => {
  console.error('[type-clusters] scan failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
