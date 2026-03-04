import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'docs', 'ui-consolidation');

const COMPONENT_FAMILY_RE =
  /(Modal|Panel|Table|List|Form|Picker|Filter|Toolbar|Header|Sidebar|Tabs|Tab|Card|Dialog|Drawer|Section|Settings)\.tsx$/;

const GENERIC_FILE_NAMES = new Set([
  'index.tsx',
  'page.tsx',
  'layout.tsx',
  'error.tsx',
  'not-found.tsx',
  'loading.tsx',
  'template.tsx',
  'ClientPage.tsx',
]);

const NON_CONSOLIDATION_NAME_RE = /(Context|Provider)\.tsx$/;

const CLUSTER_FAMILY_ALLOWLIST = new Set([
  'Modal',
  'Panel',
  'Table',
  'List',
  'Form',
  'Picker',
  'Filter',
  'Toolbar',
  'Header',
  'Sidebar',
  'Tabs',
  'Tab',
  'Card',
  'Dialog',
  'Drawer',
  'Section',
  'Settings',
]);

const STOP_WORDS = new Set([
  'const',
  'function',
  'return',
  'true',
  'false',
  'null',
  'undefined',
  'from',
  'import',
  'export',
  'default',
  'class',
  'classname',
  'react',
  'props',
  'children',
  'type',
  'interface',
  'string',
  'number',
  'boolean',
  'void',
  'async',
  'await',
  'this',
  'that',
  'with',
  'without',
  'for',
  'while',
  'case',
  'break',
  'continue',
  'switch',
  'value',
  'values',
  'label',
  'labels',
  'items',
  'item',
  'open',
  'close',
  'set',
  'get',
  'then',
  'else',
  'new',
  'use',
  'data',
  'state',
  'context',
  'option',
  'options',
  'button',
  'input',
  'select',
  'dialog',
  'modal',
  'panel',
  'table',
  'card',
  'header',
  'body',
  'footer',
  'div',
  'span',
  'grid',
  'flex',
  'text',
  'size',
  'style',
  'props',
  'tsx',
  'tsxs',
]);

const FAMILY_WEIGHTS = {
  Modal: 1.4,
  Dialog: 1.4,
  Drawer: 1.35,
  Panel: 1.35,
  Filter: 1.3,
  Picker: 1.2,
  Form: 1.15,
  Table: 1.1,
  List: 1.1,
  Toolbar: 1.05,
  Header: 1,
  Sidebar: 1,
  Tabs: 1,
  Tab: 1,
  Card: 0.95,
  Section: 0.95,
  Settings: 1,
  Unknown: 0.85,
};

const METHOD_WEIGHTS = {
  token_similarity: 1.3,
  prop_signature: 1.2,
  duplicate_name: 1.1,
};

const toPosix = (value) => value.split(path.sep).join('/');

const countLines = (content) => {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
};

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

const shouldIncludeFile = (relativePath) => {
  if (!relativePath.endsWith('.tsx')) return false;
  if (relativePath.includes('/__tests__/')) return false;
  if (relativePath.startsWith('src/shared/ui/')) return true;
  if (relativePath.includes('/components/')) return true;
  if (relativePath.startsWith('src/app/')) return true;
  if (COMPONENT_FAMILY_RE.test(relativePath)) return true;
  return false;
};

const getFamily = (basename, relativePath) => {
  const match = basename.match(COMPONENT_FAMILY_RE) ?? relativePath.match(COMPONENT_FAMILY_RE);
  if (match) return match[1];
  if (basename === 'page.tsx') return 'Page';
  return 'Unknown';
};

const isClusterEligible = (candidate) => {
  if (NON_CONSOLIDATION_NAME_RE.test(candidate.basename)) return false;
  if (!CLUSTER_FAMILY_ALLOWLIST.has(candidate.family)) return false;
  return true;
};

const getScope = (relativePath) => {
  const featureMatch = relativePath.match(/^src\/features\/([^/]+)\//);
  if (featureMatch) return `feature:${featureMatch[1]}`;
  if (relativePath.startsWith('src/shared/ui/')) return 'shared-ui';
  if (relativePath.startsWith('src/shared/lib/')) return 'shared-lib';
  if (relativePath.startsWith('src/shared/')) return 'shared';
  if (relativePath.startsWith('src/app/')) return 'app';
  return 'other';
};

const getDomain = (relativePath) => {
  if (relativePath.startsWith('src/features/')) return 'feature';
  if (relativePath.startsWith('src/shared/ui/')) return 'shared-ui';
  if (relativePath.startsWith('src/shared/')) return 'shared';
  if (relativePath.startsWith('src/app/')) return 'app';
  return 'other';
};

const stripCommentsAndStrings = (content) =>
  content
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/`(?:\\.|[^`])*`/g, ' ')
    .replace(/"(?:\\.|[^"])*"/g, ' ')
    .replace(/'(?:\\.|[^'])*'/g, ' ');

const extractSimilarityTokens = (content) => {
  const stripped = stripCommentsAndStrings(content).toLowerCase();
  const rawTokens = stripped.match(/[a-z][a-z0-9_-]{2,}/g) ?? [];
  const tokens = [];
  for (const token of rawTokens) {
    if (STOP_WORDS.has(token)) continue;
    tokens.push(token);
  }
  return new Set(tokens);
};

const parsePropsSignature = (content) => {
  const patterns = [
    /function\s+[A-Z][A-Za-z0-9_]*\s*\(\s*{([^)]{1,800})}\s*(?::[^)]*)?\)/m,
    /const\s+[A-Z][A-Za-z0-9_]*\s*=\s*\(\s*{([^)]{1,800})}\s*(?::[^)]*)?\)\s*=>/m,
    /const\s+[A-Z][A-Za-z0-9_]*\s*:\s*React\.FC<[^>]+>\s*=\s*\(\s*{([^)]{1,800})}\s*\)\s*=>/m,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (!match) continue;
    const inside = match[1];
    const keys = inside
      .split(',')
      .map((raw) => raw.trim())
      .filter(Boolean)
      .map((raw) => raw.replace(/=.*$/, '').trim())
      .map((raw) => raw.replace(/^\.{3}/, '').trim())
      .map((raw) => raw.replace(/:.*$/, '').trim())
      .filter((raw) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(raw));

    const deduped = [...new Set(keys)].sort();
    if (deduped.length < 2) return null;
    return deduped.join('|');
  }

  return null;
};

const extractImports = (content) => {
  const imports = new Set();
  for (const match of content.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    imports.add(match[1]);
  }
  for (const match of content.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    imports.add(match[1]);
  }
  return [...imports];
};

const intersectionCount = (left, right) => {
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  let count = 0;
  for (const value of small) {
    if (large.has(value)) count += 1;
  }
  return count;
};

const jaccard = (left, right) => {
  if (left.size === 0 && right.size === 0) return 1;
  const intersection = intersectionCount(left, right);
  const union = left.size + right.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
};

class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_x, index) => index);
    this.rank = Array.from({ length: size }, () => 0);
  }

  find(index) {
    if (this.parent[index] !== index) {
      this.parent[index] = this.find(this.parent[index]);
    }
    return this.parent[index];
  }

  union(left, right) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot === rightRoot) return;
    if (this.rank[leftRoot] < this.rank[rightRoot]) {
      this.parent[leftRoot] = rightRoot;
      return;
    }
    if (this.rank[leftRoot] > this.rank[rightRoot]) {
      this.parent[rightRoot] = leftRoot;
      return;
    }
    this.parent[rightRoot] = leftRoot;
    this.rank[leftRoot] += 1;
  }
}

const toCsvLine = (fields) =>
  fields
    .map((field) => {
      const value = String(field ?? '');
      if (!/[",\n]/.test(value)) return value;
      return `"${value.replace(/"/g, '""')}"`;
    })
    .join(',');

const recommendationForFamily = (family) => {
  if (family === 'Modal' || family === 'Dialog' || family === 'Drawer') {
    return 'migrate-to-shared-modal-template';
  }
  if (family === 'Panel') return 'migrate-to-panel-template';
  if (family === 'Filter') return 'migrate-to-filter-panel';
  if (family === 'Picker') return 'migrate-to-generic-picker';
  if (family === 'Table' || family === 'List') return 'migrate-to-standard-data-table-panel';
  if (family === 'Form') return 'extract-shared-form-template';
  if (family === 'Toolbar' || family === 'Header' || family === 'Sidebar' || family === 'Tabs') {
    return 'extract-shared-layout-fragment';
  }
  return 'review-for-extraction';
};

const riskForCluster = ({ fileCount, maxLines, featureCount }) => {
  if (maxLines >= 350 || fileCount >= 8 || featureCount >= 5) return 'high';
  if (maxLines >= 180 || fileCount >= 5 || featureCount >= 3) return 'medium';
  return 'low';
};

const scoreCluster = ({ family, method, totalLines, fileCount, featureCount, templateUsers }) => {
  const familyWeight = FAMILY_WEIGHTS[family] ?? FAMILY_WEIGHTS.Unknown;
  const methodWeight = METHOD_WEIGHTS[method] ?? 1;
  const crossFeatureWeight = featureCount > 1 ? 1.25 : 1;
  const templateGapWeight = 1 + ((fileCount - templateUsers) / Math.max(fileCount, 1)) * 0.4;
  const base = Math.max(fileCount - 1, 1) * totalLines;
  return Math.round(base * familyWeight * methodWeight * crossFeatureWeight * templateGapWeight);
};

const analyze = async () => {
  const srcFiles = await walk(path.join(root, 'src'));
  const candidates = [];

  for (const absolutePath of srcFiles) {
    const relativePath = toPosix(path.relative(root, absolutePath));
    if (!shouldIncludeFile(relativePath)) continue;
    const raw = await fs.readFile(absolutePath, 'utf8');
    const basename = path.basename(relativePath);
    const imports = extractImports(raw);

    const record = {
      path: relativePath,
      basename,
      domain: getDomain(relativePath),
      scope: getScope(relativePath),
      family: getFamily(basename, relativePath),
      lines: countLines(raw),
      useClient: /^\s*['"]use client['"]\s*;?/m.test(raw),
      imports,
      templateImports: imports.filter((entry) => entry.startsWith('@/shared/ui/templates')).length,
      uiPrimitiveImports: imports.filter((entry) => entry.startsWith('@/shared/ui/')).length,
      tokenSet: extractSimilarityTokens(raw),
      propsSignature: parsePropsSignature(raw),
    };

    candidates.push(record);
  }

  const clusterCandidates = candidates.filter((candidate) => isClusterEligible(candidate));

  const byName = new Map();
  for (const candidate of clusterCandidates) {
    if (GENERIC_FILE_NAMES.has(candidate.basename)) continue;
    if (NON_CONSOLIDATION_NAME_RE.test(candidate.basename)) continue;
    const group = byName.get(candidate.basename) ?? [];
    group.push(candidate);
    byName.set(candidate.basename, group);
  }

  const duplicateNameClusters = [...byName.entries()]
    .filter(([_name, group]) => group.length >= 2)
    .map(([name, group]) => ({
      method: 'duplicate_name',
      clusterKey: `name:${name}`,
      family: getFamily(name, name),
      files: group,
      similarity: null,
    }));

  const propByKey = new Map();
  for (const candidate of clusterCandidates) {
    if (!candidate.propsSignature) continue;
    const key = `${candidate.family}|${candidate.propsSignature}`;
    const group = propByKey.get(key) ?? [];
    group.push(candidate);
    propByKey.set(key, group);
  }

  const propSignatureClusters = [...propByKey.entries()]
    .filter(([_key, group]) => group.length >= 2)
    .map(([key, group]) => {
      const [family] = key.split('|');
      return {
        method: 'prop_signature',
        clusterKey: `props:${key}`,
        family: family || 'Unknown',
        files: group,
        similarity: null,
      };
    });

  const familyBuckets = new Map();
  for (const candidate of clusterCandidates) {
    const bucket = familyBuckets.get(candidate.family) ?? [];
    bucket.push(candidate);
    familyBuckets.set(candidate.family, bucket);
  }

  const tokenClusters = [];
  for (const [family, group] of familyBuckets) {
    if (group.length < 2) continue;
    if (group.length > 160) continue;

    const uf = new UnionFind(group.length);
    const similarities = [];

    const threshold = family === 'Modal' || family === 'Panel' || family === 'Form' ? 0.56 : 0.62;
    for (let left = 0; left < group.length; left += 1) {
      for (let right = left + 1; right < group.length; right += 1) {
        const leftRecord = group[left];
        const rightRecord = group[right];
        const maxLines = Math.max(leftRecord.lines, rightRecord.lines);
        const minLines = Math.min(leftRecord.lines, rightRecord.lines);
        if (maxLines > minLines * 2.4) continue;

        const sim = jaccard(leftRecord.tokenSet, rightRecord.tokenSet);
        if (sim < threshold) continue;
        const overlap = intersectionCount(leftRecord.tokenSet, rightRecord.tokenSet);
        if (overlap < 18) continue;

        uf.union(left, right);
        similarities.push(sim);
      }
    }

    const clusterMap = new Map();
    for (let index = 0; index < group.length; index += 1) {
      const rootIndex = uf.find(index);
      const cluster = clusterMap.get(rootIndex) ?? [];
      cluster.push(group[index]);
      clusterMap.set(rootIndex, cluster);
    }

    for (const clusterGroup of clusterMap.values()) {
      if (clusterGroup.length < 2) continue;
      const localPairSimilarities = [];
      for (let left = 0; left < clusterGroup.length; left += 1) {
        for (let right = left + 1; right < clusterGroup.length; right += 1) {
          localPairSimilarities.push(jaccard(clusterGroup[left].tokenSet, clusterGroup[right].tokenSet));
        }
      }
      const averageSimilarity =
        localPairSimilarities.length > 0
          ? Number(
              (
                localPairSimilarities.reduce((sum, value) => sum + value, 0) /
                localPairSimilarities.length
              ).toFixed(3)
            )
          : null;

      tokenClusters.push({
        method: 'token_similarity',
        clusterKey: `tokens:${family}:${clusterGroup.map((entry) => entry.path).sort().join('|')}`,
        family,
        files: clusterGroup,
        similarity: averageSimilarity,
      });
    }

    if (similarities.length === 0) continue;
  }

  const allRawClusters = [...duplicateNameClusters, ...propSignatureClusters, ...tokenClusters];

  const dedupedMap = new Map();
  for (const cluster of allRawClusters) {
    const filePaths = [...new Set(cluster.files.map((entry) => entry.path))].sort();
    if (filePaths.length < 2) continue;
    const key = `${cluster.method}|${cluster.family}|${filePaths.join('|')}`;
    dedupedMap.set(key, { ...cluster, filePaths });
  }

  const opportunities = [...dedupedMap.values()]
    .map((cluster) => {
      const fileCount = cluster.files.length;
      const totalLines = cluster.files.reduce((sum, entry) => sum + entry.lines, 0);
      const maxLines = Math.max(...cluster.files.map((entry) => entry.lines));
    const scopes = [...new Set(cluster.files.map((entry) => entry.scope))].sort();
    const templateUsers = cluster.files.filter((entry) => entry.templateImports > 0).length;
    const featureCount = scopes.length;
    const score = scoreCluster({
      family: cluster.family,
      method: cluster.method,
      totalLines,
      fileCount,
      featureCount,
      templateUsers,
    });

      return {
        method: cluster.method,
        family: cluster.family,
        score,
      fileCount,
      totalLines,
      maxLines,
      featureCount,
      scopes,
      templateUsers,
      templateCoverage: Number((templateUsers / fileCount).toFixed(2)),
      recommendation: recommendationForFamily(cluster.family),
      risk: riskForCluster({ fileCount, maxLines, featureCount }),
      similarity: cluster.similarity,
        files: cluster.files
          .sort((left, right) => right.lines - left.lines)
          .map((entry) => ({
          path: entry.path,
          lines: entry.lines,
          scope: entry.scope,
          family: entry.family,
          templateImports: entry.templateImports,
          useClient: entry.useClient,
          })),
      };
    })
    .filter((entry) => {
      const meaningfulFiles = entry.files.filter((file) => file.lines >= 30).length;
      if (meaningfulFiles >= 2) return true;
      if (entry.fileCount >= 3 && entry.totalLines >= 220) return true;
      return false;
    });

  opportunities.sort((left, right) => right.score - left.score);

  const familyCounts = new Map();
  const domainCounts = new Map();
  for (const candidate of candidates) {
    familyCounts.set(candidate.family, (familyCounts.get(candidate.family) ?? 0) + 1);
    domainCounts.set(candidate.domain, (domainCounts.get(candidate.domain) ?? 0) + 1);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    scannedFileCount: candidates.length,
    duplicateNameClusterCount: duplicateNameClusters.length,
    propSignatureClusterCount: propSignatureClusters.length,
    tokenSimilarityClusterCount: tokenClusters.length,
    totalOpportunities: opportunities.length,
    highPriorityCount: opportunities.filter((entry) => entry.score >= 2000).length,
    familyCounts: [...familyCounts.entries()]
      .map(([family, count]) => ({ family, count }))
      .sort((left, right) => right.count - left.count),
    domainCounts: [...domainCounts.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((left, right) => right.count - left.count),
  };

  return { summary, candidates, opportunities };
};

const buildMarkdown = ({ summary, opportunities }) => {
  const lines = [];
  lines.push('# UI Consolidation Scan');
  lines.push('');
  lines.push(`Generated at: ${summary.generatedAt}`);
  lines.push('');
  lines.push('## Snapshot');
  lines.push('');
  lines.push(`- Scanned UI files: ${summary.scannedFileCount}`);
  lines.push(`- Duplicate-name clusters: ${summary.duplicateNameClusterCount}`);
  lines.push(`- Prop-signature clusters: ${summary.propSignatureClusterCount}`);
  lines.push(`- Token-similarity clusters: ${summary.tokenSimilarityClusterCount}`);
  lines.push(`- Total consolidation opportunities: ${summary.totalOpportunities}`);
  lines.push(`- High-priority opportunities (score >= 2000): ${summary.highPriorityCount}`);
  lines.push('');
  lines.push('## Domain Coverage');
  lines.push('');
  lines.push('| Domain | Files |');
  lines.push('| --- | ---: |');
  for (const entry of summary.domainCounts) {
    lines.push(`| \`${entry.domain}\` | ${entry.count} |`);
  }
  lines.push('');
  lines.push('## Top Families');
  lines.push('');
  lines.push('| Family | Files |');
  lines.push('| --- | ---: |');
  for (const entry of summary.familyCounts.slice(0, 15)) {
    lines.push(`| \`${entry.family}\` | ${entry.count} |`);
  }
  lines.push('');
  lines.push('## Ranked Backlog');
  lines.push('');
  lines.push('| Rank | Score | Family | Method | Files | Scopes | LOC | Template Coverage | Risk | Recommendation |');
  lines.push('| ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | --- | --- |');

  const top = opportunities.slice(0, 35);
  top.forEach((entry, index) => {
    const templatePercent = `${Math.round(entry.templateCoverage * 100)}%`;
    lines.push(
      `| ${index + 1} | ${entry.score} | \`${entry.family}\` | \`${entry.method}\` | ${entry.fileCount} | ${entry.featureCount} | ${entry.totalLines} | ${templatePercent} | ${entry.risk} | ${entry.recommendation} |`
    );
  });

  lines.push('');
  lines.push('## Top Opportunity Details');
  lines.push('');

  for (const [index, entry] of top.slice(0, 12).entries()) {
    lines.push(`### ${index + 1}. ${entry.family} (${entry.method})`);
    lines.push('');
    lines.push(`- Score: ${entry.score}`);
    lines.push(`- Files: ${entry.fileCount}`);
    lines.push(`- Scopes: ${entry.scopes.join(', ')}`);
    lines.push(`- Total LOC: ${entry.totalLines}`);
    lines.push(`- Recommendation: ${entry.recommendation}`);
    lines.push(`- Risk: ${entry.risk}`);
    if (entry.similarity !== null) {
      lines.push(`- Avg token similarity: ${entry.similarity}`);
    }
    lines.push('- Candidate files:');
    for (const file of entry.files.slice(0, 12)) {
      const templateMarker = file.templateImports > 0 ? 'template-import' : 'no-template-import';
      lines.push(`  - \`${file.path}\` (${file.lines} LOC, ${file.scope}, ${templateMarker})`);
    }
    lines.push('');
  }

  lines.push('## Execution Notes');
  lines.push('');
  lines.push('- Start with high score + low risk clusters.');
  lines.push('- Prefer migration to existing templates before creating new abstractions.');
  lines.push('- Re-run this scan after each migration wave and compare rank deltas.');

  return `${lines.join('\n')}\n`;
};

const buildInventoryCsv = (candidates) => {
  const lines = [];
  lines.push(
    toCsvLine([
      'path',
      'domain',
      'scope',
      'family',
      'basename',
      'lines',
      'useClient',
      'templateImports',
      'uiPrimitiveImports',
      'propsSignature',
    ])
  );
  for (const candidate of candidates.sort((left, right) => right.lines - left.lines)) {
    lines.push(
      toCsvLine([
        candidate.path,
        candidate.domain,
        candidate.scope,
        candidate.family,
        candidate.basename,
        candidate.lines,
        candidate.useClient,
        candidate.templateImports,
        candidate.uiPrimitiveImports,
        candidate.propsSignature ?? '',
      ])
    );
  }
  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const result = await analyze();
  await fs.mkdir(outDir, { recursive: true });

  const stamp = result.summary.generatedAt.replace(/[:.]/g, '-');
  const jsonPath = path.join(outDir, 'scan-latest.json');
  const mdPath = path.join(outDir, 'scan-latest.md');
  const csvPath = path.join(outDir, 'inventory-latest.csv');
  const historicalJsonPath = path.join(outDir, `scan-${stamp}.json`);

  await fs.writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await fs.writeFile(mdPath, buildMarkdown(result), 'utf8');
  await fs.writeFile(csvPath, buildInventoryCsv(result.candidates), 'utf8');
  await fs.writeFile(historicalJsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${toPosix(path.relative(root, jsonPath))}`);
  console.log(`Wrote ${toPosix(path.relative(root, mdPath))}`);
  console.log(`Wrote ${toPosix(path.relative(root, csvPath))}`);
  console.log(`Wrote ${toPosix(path.relative(root, historicalJsonPath))}`);
  console.log(
    [
      `Scanned files: ${result.summary.scannedFileCount}`,
      `Opportunities: ${result.summary.totalOpportunities}`,
      `High priority: ${result.summary.highPriorityCount}`,
    ].join(' | ')
  );
};

run().catch((error) => {
  console.error('[ui-consolidation-scan] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
