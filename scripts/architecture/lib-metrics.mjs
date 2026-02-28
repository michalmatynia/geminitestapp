import fs from 'node:fs/promises';
import path from 'node:path';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const toPosix = (value) => value.split(path.sep).join('/');

const isSourceFile = (filePath) => SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase());

const countLines = (content) => {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
};

const countMatches = (content, pattern) => {
  let total = 0;
  for (const _match of content.matchAll(pattern)) {
    total += 1;
  }
  return total;
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

  const delegatedServerRoutes = apiRouteRecords.filter((record) =>
    /export\s*{\s*[^}]+\s*}\s*from\s*['"]@\/features\/[^'"]+\/server['"]/.test(record.content)
  );

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
  const appFeatureBarrelImports = appRecords.reduce(
    (sum, record) => sum + countMatches(record.content, /from\s+['"]@\/features\/[^/'"\n]+['"]/g),
    0
  );
  const appFeatureDeepImports = appRecords.reduce(
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
  lines.push(`setInterval occurrences: ${metrics.runtime.setIntervalOccurrences}`);
  return lines.join('\n');
};
