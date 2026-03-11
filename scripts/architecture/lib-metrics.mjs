import fs from 'node:fs/promises';
import path from 'node:path';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

const toPosix = (value) => value.split(path.sep).join('/');

const isSourceFile = (filePath) => SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase());

const countLines = (content) => {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
};

const countMatches = (content, pattern) => {
  let total = 0;
  for (const match of content.matchAll(pattern)) {
    if (match[0] !== undefined) {
      total += 1;
    }
  }
  return total;
};

const IMPORT_SPECIFIER_PATTERNS = [
  /from\s+['"]([^'"\n]+)['"]/g,
  /import\(\s*['"]([^'"\n]+)['"]\s*\)/g,
];

const resolveImportTargetPath = (importerPath, specifier) => {
  if (!specifier) return null;
  if (specifier.startsWith('@/')) {
    return `src/${specifier.slice(2)}`;
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return toPosix(path.posix.normalize(path.posix.join(path.posix.dirname(importerPath), specifier)));
  }
  return null;
};

const countResolvedImportsToPrefix = (record, prefix) => {
  let total = 0;
  for (const pattern of IMPORT_SPECIFIER_PATTERNS) {
    for (const match of record.content.matchAll(pattern)) {
      const specifier = match[1];
      const resolvedPath = resolveImportTargetPath(record.path, specifier);
      if (resolvedPath?.startsWith(prefix)) {
        total += 1;
      }
    }
  }
  return total;
};

const parseNamedImports = (content) => {
  const bindings = new Map();
  const importRegex = /import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"]/g;

  for (const match of content.matchAll(importRegex)) {
    const source = match[2];
    const specifiers = match[1].split(',');
    for (const specifier of specifiers) {
      const cleaned = specifier.trim().replace(/^type\s+/, '');
      if (!cleaned) continue;
      const [importedRaw, localRaw] = cleaned.split(/\s+as\s+/);
      const imported = importedRaw?.trim();
      const local = (localRaw ?? importedRaw)?.trim();
      if (!imported || !local) continue;
      bindings.set(local, { imported, source });
    }
  }

  return bindings;
};

const parseNamespaceImports = (content) => {
  const bindings = new Map();
  const importRegex = /import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g;

  for (const match of content.matchAll(importRegex)) {
    const namespace = match[1];
    const source = match[2];
    if (!namespace || !source) continue;
    bindings.set(namespace, source);
  }

  return bindings;
};

const isDelegatedImportSource = (source) =>
  /^@\/features\/[^'"]+\/(?:server|api\/[^'"]+\/(?:handler|route))$/.test(source);

const isDelegatedRoute = (content) => {
  if (
    /export\s*{\s*[^}]+\s*}\s*from\s*['"]@\/features\/[^'"]+\/(?:server|api\/[^'"]+\/(?:handler|route))['"]/.test(
      content
    )
  ) {
    return true;
  }

  const namedImports = parseNamedImports(content);
  const namespaceImports = parseNamespaceImports(content);
  const methodExportRegex =
    /export const (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*;/g;

  for (const match of content.matchAll(methodExportRegex)) {
    const method = match[1];
    const assignedValue = match[2];
    if (!HTTP_METHODS.has(method)) continue;

    const namedBinding = namedImports.get(assignedValue);
    if (namedBinding) {
      if (namedBinding.imported === method) return true;
      if (isDelegatedImportSource(namedBinding.source) && !/_handler$/i.test(namedBinding.imported)) {
        return true;
      }
    }

    const namespaceAssignment = assignedValue.match(
      /^([A-Za-z_$][\w$]*)\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/
    );
    if (!namespaceAssignment) continue;

    const namespace = namespaceAssignment[1];
    const delegatedMethod = namespaceAssignment[2];
    const namespaceSource = namespaceImports.get(namespace);
    if (delegatedMethod === method && namespaceSource && isDelegatedImportSource(namespaceSource)) {
      return true;
    }
  }

  return false;
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
      if (entry.isDirectory()) {
        return walk(fullPath);
      }
      return [fullPath];
    })
  );

  return children.flat();
};

const getTopByLineCount = (records, limit = 20) =>
  [...records]
    .sort((a, b) => b.lines - a.lines)
    .slice(0, limit)
    .map((record) => ({
      path: record.path,
      lines: record.lines,
    }));

export const collectMetrics = async ({ root = process.cwd() } = {}) => {
  const srcDir = path.join(root, 'src');
  const srcFilesRaw = await walk(srcDir);
  const srcFiles = srcFilesRaw.filter((filePath) => isSourceFile(filePath));

  const sourceRecords = [];
  for (const absolutePath of srcFiles) {
    const raw = await fs.readFile(absolutePath, 'utf8');
    sourceRecords.push({
      absolutePath,
      path: toPosix(path.relative(root, absolutePath)),
      content: raw,
      lines: countLines(raw),
    });
  }

  const totalSourceLines = sourceRecords.reduce((sum, record) => sum + record.lines, 0);
  const filesOver800 = sourceRecords.filter((record) => record.lines >= 800);
  const filesOver1000 = sourceRecords.filter((record) => record.lines >= 1000);
  const filesOver1500 = sourceRecords.filter((record) => record.lines >= 1500);

  const useClientFiles = sourceRecords.filter((record) =>
    /^\s*['"]use client['"]\s*;?/m.test(record.content)
  );

  const apiRouteRecords = sourceRecords.filter(
    (record) => record.path.startsWith('src/app/api/') && /\/route\.tsx?$/.test(record.path)
  );

  const apiRoutesWithHandler = apiRouteRecords.filter((record) =>
    /\bapiHandlerWithParams\b|\bapiHandler\s*\(/.test(record.content)
  );

  const delegatedServerRoutes = apiRouteRecords.filter((record) => isDelegatedRoute(record.content));

  const forceDynamicRoutes = apiRouteRecords.filter((record) =>
    /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/.test(record.content)
  );

  const revalidateRoutes = apiRouteRecords.filter((record) =>
    /export\s+const\s+revalidate\s*=/.test(record.content)
  );

  const cacheHeaderRoutes = apiRouteRecords.filter((record) =>
    /Cache-Control/.test(record.content)
  );

  const cacheOptionRoutes = apiRouteRecords.filter((record) =>
    /cacheControl\s*:/.test(record.content)
  );

  const explicitCachePolicyRouteSet = new Set(
    [
      ...apiRoutesWithHandler,
      ...forceDynamicRoutes,
      ...revalidateRoutes,
      ...cacheHeaderRoutes,
      ...cacheOptionRoutes,
    ].map((record) => record.path)
  );

  const appRecords = sourceRecords.filter((record) => record.path.startsWith('src/app/'));
  const appUiRecords = appRecords.filter((record) => !record.path.startsWith('src/app/api/'));

  const appFeatureBarrelImports = appUiRecords.reduce(
    (sum, record) => sum + countMatches(record.content, /from\s+['"]@\/features\/[^/'"\n]+['"]/g),
    0
  );
  const appFeatureDeepImports = appUiRecords.reduce(
    (sum, record) =>
      sum +
      countMatches(
        record.content,
        /from\s+['"]@\/features\/[^/'"\n]+\/(?!public(?:['"/])|server(?:['"/]))/g
      ),
    0
  );

  const sharedRecords = sourceRecords.filter((record) => record.path.startsWith('src/shared/'));
  const sharedToFeaturesStaticImports = sharedRecords.reduce(
    (sum, record) => sum + countMatches(record.content, /from\s+['"]@\/features\//g),
    0
  );
  const sharedToFeaturesDynamicImports = sharedRecords.reduce(
    (sum, record) => sum + countMatches(record.content, /import\(\s*['"]@\/features\//g),
    0
  );

  const featureRecords = sourceRecords.filter((record) => record.path.startsWith('src/features/'));
  const featureToSharedTotalImports = featureRecords.reduce(
    (sum, record) => sum + countResolvedImportsToPrefix(record, 'src/shared/'),
    0
  );
  const featureToAppApiTotalImports = featureRecords.reduce(
    (sum, record) => sum + countResolvedImportsToPrefix(record, 'src/app/api/'),
    0
  );
  const featureStatsMap = new Map();
  const crossFeatureEdgeMap = new Map();

  for (const record of featureRecords) {
    const [, , featureName] = record.path.split('/');
    if (!featureName) continue;

    const featureStats = featureStatsMap.get(featureName) ?? { files: 0, lines: 0 };
    featureStats.files += 1;
    featureStats.lines += record.lines;
    featureStatsMap.set(featureName, featureStats);

    const importPatterns = [
      /from\s+['"]@\/features\/([^/'"\n]+)/g,
      /import\(\s*['"]@\/features\/([^/'"\n]+)/g,
    ];

    for (const pattern of importPatterns) {
      for (const match of record.content.matchAll(pattern)) {
        const toFeature = match[1];
        if (!toFeature || toFeature === featureName) continue;
        const edgeKey = `${featureName} -> ${toFeature}`;
        crossFeatureEdgeMap.set(edgeKey, (crossFeatureEdgeMap.get(edgeKey) ?? 0) + 1);
      }
    }
  }

  const crossFeatureEdges = [...crossFeatureEdgeMap.entries()]
    .map(([edge, references]) => ({ edge, references }))
    .sort((a, b) => b.references - a.references);

  const pageRecords = sourceRecords.filter((record) => /\/page\.tsx?$/.test(record.path));

  const setIntervalOccurrences = sourceRecords.reduce(
    (sum, record) => sum + countMatches(record.content, /\bsetInterval\s*\(/g),
    0
  );

  // --- New: deep relative imports ---
  const deepRelativeImportFiles = sourceRecords.filter(
    (record) => /from\s+['"](\.\.\/){3,}/.test(record.content)
  );

  // --- New: circular feature dependencies ---
  const featureDepGraph = new Map();
  for (const [edge] of crossFeatureEdgeMap) {
    const [from, , to] = edge.split(' ');
    if (!featureDepGraph.has(from)) featureDepGraph.set(from, new Set());
    featureDepGraph.get(from).add(to);
  }

  const detectCycles = (graph) => {
    const cycles = [];
    const visited = new Set();
    const inStack = new Set();
    const stack = [];
    const dfs = (node) => {
      if (inStack.has(node)) {
        const start = stack.indexOf(node);
        cycles.push(stack.slice(start).concat(node));
        return;
      }
      if (visited.has(node)) return;
      visited.add(node);
      inStack.add(node);
      stack.push(node);
      for (const neighbor of graph.get(node) || []) dfs(neighbor);
      stack.pop();
      inStack.delete(node);
    };
    for (const node of graph.keys()) dfs(node);
    const seen = new Set();
    return cycles.filter((cycle) => {
      const norm = cycle.slice(0, -1);
      const minIdx = norm.indexOf(norm.reduce((a, b) => (a < b ? a : b)));
      const key = [...norm.slice(minIdx), ...norm.slice(0, minIdx)].join('->');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const circularFeatureDeps = detectCycles(featureDepGraph);

  // --- New: hook complexity (top hooks by effect/callback/memo count) ---
  const hookRecords = sourceRecords.filter(
    (record) => /\/use[A-Z]/.test(record.path) && !record.path.includes('.test.')
  );
  const hookComplexity = hookRecords
    .map((record) => ({
      path: record.path,
      useEffectCount: countMatches(record.content, /\buseEffect\s*\(/g),
      useCallbackCount: countMatches(record.content, /\buseCallback\s*\(/g),
      useMemoCount: countMatches(record.content, /\buseMemo\s*\(/g),
    }))
    .map((h) => ({ ...h, total: h.useEffectCount + h.useCallbackCount + h.useMemoCount }))
    .filter((h) => h.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 25);

  return {
    generatedAt: new Date().toISOString(),
    source: {
      totalFiles: sourceRecords.length,
      totalLines: totalSourceLines,
      useClientFiles: useClientFiles.length,
      filesOver800: filesOver800.length,
      filesOver1000: filesOver1000.length,
      filesOver1500: filesOver1500.length,
      largestFile: getTopByLineCount(sourceRecords, 1)[0] ?? null,
    },
    api: {
      totalRoutes: apiRouteRecords.length,
      routesWithApiHandler: apiRoutesWithHandler.length,
      delegatedServerRoutes: delegatedServerRoutes.length,
      routesWithoutApiHandler:
        apiRouteRecords.length - apiRoutesWithHandler.length - delegatedServerRoutes.length,
      forceDynamicRoutes: forceDynamicRoutes.length,
      revalidateRoutes: revalidateRoutes.length,
      routesWithCacheHeader: cacheHeaderRoutes.length,
      routesWithCacheOption: cacheOptionRoutes.length,
      routesWithExplicitCachePolicy: explicitCachePolicyRouteSet.size,
      routesWithoutExplicitCachePolicy: apiRouteRecords.length - explicitCachePolicyRouteSet.size,
      topRouteHotspots: getTopByLineCount(apiRouteRecords, 20),
    },
    imports: {
      appFeatureBarrelImports,
      appFeatureDeepImports,
      featureToSharedTotalImports,
      featureToAppApiTotalImports,
      sharedToFeaturesStaticImports,
      sharedToFeaturesDynamicImports,
      sharedToFeaturesTotalImports: sharedToFeaturesStaticImports + sharedToFeaturesDynamicImports,
    },
    architecture: {
      crossFeatureEdgePairs: crossFeatureEdges.length,
      topCrossFeatureEdges: crossFeatureEdges.slice(0, 25),
      featureSizeByLines: [...featureStatsMap.entries()]
        .map(([feature, stats]) => ({ feature, ...stats }))
        .sort((a, b) => b.lines - a.lines),
    },
    runtime: {
      setIntervalOccurrences,
    },
    codeHealth: {
      deepRelativeImportCount: deepRelativeImportFiles.length,
      circularFeatureDeps,
      hookComplexity,
    },
    hotspots: {
      topFilesByLines: getTopByLineCount(sourceRecords, 30),
      topPagesByLines: getTopByLineCount(pageRecords, 20),
    },
  };
};

export const formatCompactSummary = (metrics) => {
  const lines = [];
  lines.push(`Generated: ${metrics.generatedAt}`);
  lines.push(`Source files: ${metrics.source.totalFiles} (${metrics.source.totalLines} lines)`);
  lines.push(
    `Large files: >=800: ${metrics.source.filesOver800}, >=1000: ${metrics.source.filesOver1000}, >=1500: ${metrics.source.filesOver1500}`
  );
  lines.push(`use client files: ${metrics.source.useClientFiles}`);
  lines.push(
    `API routes: ${metrics.api.totalRoutes} (without apiHandler/delegation: ${metrics.api.routesWithoutApiHandler}, delegated: ${metrics.api.delegatedServerRoutes})`
  );
  lines.push(
    `API explicit cache policy coverage: ${metrics.api.routesWithExplicitCachePolicy}/${metrics.api.totalRoutes}`
  );
  lines.push(`Cross-feature edge pairs: ${metrics.architecture.crossFeatureEdgePairs}`);
  lines.push(`Shared -> features imports: ${metrics.imports.sharedToFeaturesTotalImports}`);
  lines.push(
    `Forbidden feature imports: shared=${metrics.imports.featureToSharedTotalImports}, app/api=${metrics.imports.featureToAppApiTotalImports}`
  );
  lines.push(`setInterval occurrences: ${metrics.runtime.setIntervalOccurrences}`);
  if (metrics.codeHealth) {
    lines.push(`Deep relative imports (3+ levels): ${metrics.codeHealth.deepRelativeImportCount}`);
    lines.push(`Circular feature deps: ${metrics.codeHealth.circularFeatureDeps.length}`);
    lines.push(`Top hook complexity: ${metrics.codeHealth.hookComplexity.length} hooks tracked`);
  }
  if (metrics.propDrilling) {
    lines.push(
      `Prop drilling chains: depth>=3: ${metrics.propDrilling.candidateChains}, depth>=4: ${metrics.propDrilling.depthGte4Chains}`
    );
  }
  return lines.join('\n');
};
