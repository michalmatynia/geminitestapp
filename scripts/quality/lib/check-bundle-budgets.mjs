import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import { createIssue, sortIssues, summarizeIssues, summarizeRules, toRepoRelativePath } from './check-runner.mjs';

export const DEFAULT_BUNDLE_BUDGET_CONFIG_PATH = path.join(
  'scripts',
  'quality',
  'config',
  'bundle-budgets.json'
);

const formatBytesValue = (value) => {
  if (!Number.isFinite(value)) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
};

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const toPositiveInteger = (value) => {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.trunc(value);
  return rounded > 0 ? rounded : null;
};

const readJsonFile = (absolutePath) => JSON.parse(fs.readFileSync(absolutePath, 'utf8'));

const normalizeChunkReference = (value) => {
  const chunk = normalizeString(value)
    .replace(/^\/_next\//, '')
    .replace(/^_next\//, '')
    .replace(/^\//, '');
  if (!chunk.startsWith('static/')) return null;
  if (!chunk.endsWith('.js')) return null;
  return chunk;
};

const resolveChunkFile = (buildDir, chunkReference) => {
  const normalized = normalizeChunkReference(chunkReference);
  if (!normalized) return null;

  const candidates = [normalized];
  try {
    const decoded = decodeURIComponent(normalized);
    if (decoded !== normalized) {
      candidates.push(decoded);
    }
  } catch {}

  for (const chunkPath of candidates) {
    const absolutePath = path.join(buildDir, chunkPath);
    if (fs.existsSync(absolutePath)) {
      return {
        chunkPath,
        absolutePath,
        exists: true,
        bytes: fs.statSync(absolutePath).size,
      };
    }
  }

  return {
    chunkPath: candidates[0],
    absolutePath: path.join(buildDir, candidates[0]),
    exists: false,
    bytes: null,
  };
};

const collectBaseChunkFiles = (buildDir, buildManifest) => {
  const references = [
    ...(Array.isArray(buildManifest?.polyfillFiles) ? buildManifest.polyfillFiles : []),
    ...(Array.isArray(buildManifest?.rootMainFiles) ? buildManifest.rootMainFiles : []),
  ];
  const chunkMap = new Map();

  for (const reference of references) {
    const resolved = resolveChunkFile(buildDir, reference);
    if (!resolved) continue;
    chunkMap.set(resolved.chunkPath, resolved);
  }

  return [...chunkMap.values()].sort((left, right) => left.chunkPath.localeCompare(right.chunkPath));
};

const loadClientReferenceManifest = (absolutePath) => {
  const source = fs.readFileSync(absolutePath, 'utf8');
  const context = { globalThis: {} };
  vm.runInNewContext(source, context, { filename: absolutePath });
  return context.globalThis.__RSC_MANIFEST;
};

const collectRouteChunkFiles = (buildDir, routeManifest) => {
  const chunkMap = new Map();

  for (const entry of Object.values(routeManifest?.clientModules ?? {})) {
    if (!entry || !Array.isArray(entry.chunks)) continue;
    for (const reference of entry.chunks) {
      const resolved = resolveChunkFile(buildDir, reference);
      if (!resolved) continue;
      chunkMap.set(resolved.chunkPath, resolved);
    }
  }

  return [...chunkMap.values()].sort((left, right) => left.chunkPath.localeCompare(right.chunkPath));
};

const summarizeChunkBytes = (chunks) =>
  chunks.reduce((total, chunk) => total + (Number.isFinite(chunk.bytes) ? chunk.bytes : 0), 0);

const summarizeRouteStatus = ({ missingDependency, totalBytes, maxTotalBytes, routeBytes, maxRouteBytes, chunkCount, maxChunkCount }) => {
  if (missingDependency) return 'fail';
  if (Number.isFinite(maxTotalBytes) && totalBytes > maxTotalBytes) return 'fail';
  if (Number.isFinite(maxRouteBytes) && routeBytes > maxRouteBytes) return 'fail';
  if (Number.isFinite(maxChunkCount) && chunkCount > maxChunkCount) return 'fail';
  return 'pass';
};

const coerceConfig = (config) => {
  const sharedBase = config && typeof config === 'object' ? config.sharedBase : null;
  const routes = config && typeof config === 'object' && Array.isArray(config.routes) ? config.routes : [];

  return {
    sharedBase: {
      maxBytes: toPositiveInteger(sharedBase?.maxBytes),
      maxChunkCount: toPositiveInteger(sharedBase?.maxChunkCount),
    },
    routes: routes.map((entry, index) => ({
      id: normalizeString(entry?.id) || `route-${index + 1}`,
      name: normalizeString(entry?.name) || normalizeString(entry?.route) || `Route ${index + 1}`,
      route: normalizeString(entry?.route),
      maxTotalBytes: toPositiveInteger(entry?.maxTotalBytes),
      maxRouteBytes: toPositiveInteger(entry?.maxRouteBytes),
      maxChunkCount: toPositiveInteger(entry?.maxChunkCount),
    })),
  };
};

export const analyzeBundleBudgets = ({
  root = process.cwd(),
  buildDir = path.join(process.cwd(), '.next'),
  configPath = DEFAULT_BUNDLE_BUDGET_CONFIG_PATH,
  config = null,
  generatedAt = new Date().toISOString(),
} = {}) => {
  const issues = [];
  const absoluteConfigPath = config ? null : path.join(root, configPath);
  let normalizedConfig = coerceConfig(config ?? {});

  if (!config) {
    if (!fs.existsSync(absoluteConfigPath)) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'bundle-budget-config-missing',
          message: `Bundle budget config is missing at ${configPath}.`,
          file: configPath,
        })
      );
    } else {
      try {
        normalizedConfig = coerceConfig(readJsonFile(absoluteConfigPath));
      } catch (error) {
        issues.push(
          createIssue({
            severity: 'error',
            ruleId: 'bundle-budget-config-invalid',
            message: `Bundle budget config could not be parsed: ${
              error instanceof Error ? error.message : String(error)
            }`,
            file: configPath,
          })
        );
      }
    }
  }

  const requiredArtifacts = [
    path.join(buildDir, 'build-manifest.json'),
    path.join(buildDir, 'app-path-routes-manifest.json'),
    path.join(buildDir, 'server', 'app-paths-manifest.json'),
  ];

  const missingArtifacts = requiredArtifacts.filter((artifactPath) => !fs.existsSync(artifactPath));
  for (const artifactPath of missingArtifacts) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'bundle-build-artifact-missing',
        message: `Missing Next build artifact: ${toRepoRelativePath(root, artifactPath)}. Run npm run build before checking bundle budgets.`,
        file: toRepoRelativePath(root, artifactPath),
      })
    );
  }

  if (issues.length > 0) {
    const sortedIssues = sortIssues(issues);
    const summary = summarizeIssues(sortedIssues);
    return {
      generatedAt,
      status: summary.status,
      summary: {
        ...summary,
        discoveredPageRouteCount: 0,
        configuredRouteCount: normalizedConfig.routes.length,
        evaluatedRouteCount: 0,
        passingRouteCount: 0,
        failingRouteCount: 0,
        baseBytes: 0,
        baseChunkCount: 0,
      },
      config: {
        path: absoluteConfigPath ? toRepoRelativePath(root, absoluteConfigPath) : null,
        sharedBase: normalizedConfig.sharedBase,
      },
      base: {
        status: 'fail',
        bytes: 0,
        maxBytes: normalizedConfig.sharedBase.maxBytes,
        chunkCount: 0,
        maxChunkCount: normalizedConfig.sharedBase.maxChunkCount,
        chunks: [],
      },
      routes: [],
      issues: sortedIssues,
      rules: summarizeRules(sortedIssues),
    };
  }

  const buildManifest = readJsonFile(path.join(buildDir, 'build-manifest.json'));
  const appPathRoutesManifest = readJsonFile(path.join(buildDir, 'app-path-routes-manifest.json'));
  const serverAppPathsManifest = readJsonFile(path.join(buildDir, 'server', 'app-paths-manifest.json'));

  const pageRouteEntries = Object.entries(appPathRoutesManifest).filter(([routeKey]) =>
    routeKey.endsWith('/page')
  );
  const routeKeyByRoute = new Map(
    pageRouteEntries.map(([routeKey, route]) => [normalizeString(route), routeKey])
  );

  const baseChunks = collectBaseChunkFiles(buildDir, buildManifest);
  const baseBytes = summarizeChunkBytes(baseChunks);

  for (const chunk of baseChunks) {
    if (!chunk.exists) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'bundle-shared-chunk-file-missing',
          message: `Shared client chunk is missing from the build output: ${chunk.chunkPath}.`,
          file: toRepoRelativePath(root, chunk.absolutePath),
        })
      );
    }
  }

  if (
    Number.isFinite(normalizedConfig.sharedBase.maxBytes) &&
    baseBytes > normalizedConfig.sharedBase.maxBytes
  ) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'bundle-shared-base-bytes-exceeded',
        message: `Shared base client JS is ${formatBytesValue(baseBytes)}, over the ${formatBytesValue(
          normalizedConfig.sharedBase.maxBytes
        )} budget.`,
        file: 'build-manifest.json',
        context: {
          actualBytes: baseBytes,
          maxBytes: normalizedConfig.sharedBase.maxBytes,
        },
      })
    );
  }

  if (
    Number.isFinite(normalizedConfig.sharedBase.maxChunkCount) &&
    baseChunks.length > normalizedConfig.sharedBase.maxChunkCount
  ) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'bundle-shared-base-chunk-count-exceeded',
        message: `Shared base client JS uses ${baseChunks.length} chunks, over the ${normalizedConfig.sharedBase.maxChunkCount} chunk budget.`,
        file: 'build-manifest.json',
        context: {
          actualChunkCount: baseChunks.length,
          maxChunkCount: normalizedConfig.sharedBase.maxChunkCount,
        },
      })
    );
  }

  const baseChunkSet = new Set(baseChunks.map((chunk) => chunk.chunkPath));
  const routeResults = normalizedConfig.routes.map((routeBudget) => {
    const routeKey = routeKeyByRoute.get(routeBudget.route) ?? null;
    const serverAppPath = routeKey ? serverAppPathsManifest[routeKey] : null;
    const clientManifestPath = serverAppPath
      ? path.join(buildDir, 'server', serverAppPath.replace(/\.js$/, '_client-reference-manifest.js'))
      : null;

    const result = {
      id: routeBudget.id,
      name: routeBudget.name,
      route: routeBudget.route,
      routeKey,
      manifestPath: clientManifestPath ? toRepoRelativePath(root, clientManifestPath) : null,
      status: 'fail',
      totalBytes: null,
      routeBytes: null,
      baseBytes,
      chunkCount: null,
      maxTotalBytes: routeBudget.maxTotalBytes,
      maxRouteBytes: routeBudget.maxRouteBytes,
      maxChunkCount: routeBudget.maxChunkCount,
      largestRouteChunks: [],
    };

    if (!routeBudget.route) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'bundle-budget-config-invalid',
          message: `Bundle budget entry "${routeBudget.id}" is missing a route path.`,
          file: absoluteConfigPath ? toRepoRelativePath(root, absoluteConfigPath) : configPath,
        })
      );
      return result;
    }

    if (!routeKey) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'bundle-route-not-found',
          message: `Configured route ${routeBudget.route} was not found in app-path-routes-manifest.json.`,
          file: 'app-path-routes-manifest.json',
        })
      );
      return result;
    }

    if (!serverAppPath) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'bundle-route-build-output-missing',
          message: `Missing server app output for ${routeBudget.route} (${routeKey}).`,
          file: 'server/app-paths-manifest.json',
        })
      );
      return result;
    }

    if (!fs.existsSync(clientManifestPath)) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'bundle-route-client-manifest-missing',
          message: `Client reference manifest is missing for ${routeBudget.route}.`,
          file: toRepoRelativePath(root, clientManifestPath),
        })
      );
      return result;
    }

    let routeManifestMap;
    try {
      routeManifestMap = loadClientReferenceManifest(clientManifestPath);
    } catch (error) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'bundle-route-client-manifest-invalid',
          message: `Client reference manifest could not be evaluated for ${routeBudget.route}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          file: toRepoRelativePath(root, clientManifestPath),
        })
      );
      return result;
    }

    const routeManifest = routeManifestMap?.[routeKey] ?? null;
    if (!routeManifest) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'bundle-route-client-manifest-invalid',
          message: `Client reference manifest for ${routeBudget.route} does not expose ${routeKey}.`,
          file: toRepoRelativePath(root, clientManifestPath),
        })
      );
      return result;
    }

    const routeChunks = collectRouteChunkFiles(buildDir, routeManifest);
    for (const chunk of routeChunks) {
      if (!chunk.exists) {
        issues.push(
          createIssue({
            severity: 'error',
            ruleId: 'bundle-route-chunk-file-missing',
            message: `Chunk ${chunk.chunkPath} referenced by ${routeBudget.route} is missing from the build output.`,
            file: toRepoRelativePath(root, clientManifestPath),
          })
        );
      }
    }

    const totalChunks = [...baseChunks];
    const seenChunks = new Set(baseChunkSet);
    for (const chunk of routeChunks) {
      if (seenChunks.has(chunk.chunkPath)) continue;
      seenChunks.add(chunk.chunkPath);
      totalChunks.push(chunk);
    }

    const routeBytes = summarizeChunkBytes(routeChunks);
    const totalBytes = summarizeChunkBytes(totalChunks);
    const largestRouteChunks = [...routeChunks]
      .filter((chunk) => Number.isFinite(chunk.bytes))
      .sort((left, right) => (right.bytes ?? 0) - (left.bytes ?? 0))
      .slice(0, 5)
      .map((chunk) => ({
        path: chunk.chunkPath,
        bytes: chunk.bytes,
      }));

    result.totalBytes = totalBytes;
    result.routeBytes = routeBytes;
    result.chunkCount = totalChunks.length;
    result.largestRouteChunks = largestRouteChunks;
    result.status = summarizeRouteStatus({
      missingDependency: routeChunks.some((chunk) => !chunk.exists),
      totalBytes,
      maxTotalBytes: routeBudget.maxTotalBytes,
      routeBytes,
      maxRouteBytes: routeBudget.maxRouteBytes,
      chunkCount: totalChunks.length,
      maxChunkCount: routeBudget.maxChunkCount,
    });

    if (Number.isFinite(routeBudget.maxTotalBytes) && totalBytes > routeBudget.maxTotalBytes) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'bundle-route-total-bytes-exceeded',
          message: `${routeBudget.route} totals ${formatBytesValue(totalBytes)}, over the ${formatBytesValue(
            routeBudget.maxTotalBytes
          )} budget.`,
          file: toRepoRelativePath(root, clientManifestPath),
          context: {
            route: routeBudget.route,
            actualBytes: totalBytes,
            maxBytes: routeBudget.maxTotalBytes,
          },
        })
      );
    }

    if (Number.isFinite(routeBudget.maxRouteBytes) && routeBytes > routeBudget.maxRouteBytes) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'bundle-route-specific-bytes-exceeded',
          message: `${routeBudget.route} adds ${formatBytesValue(routeBytes)} of route JS, over the ${formatBytesValue(
            routeBudget.maxRouteBytes
          )} budget.`,
          file: toRepoRelativePath(root, clientManifestPath),
          context: {
            route: routeBudget.route,
            actualBytes: routeBytes,
            maxBytes: routeBudget.maxRouteBytes,
          },
        })
      );
    }

    if (Number.isFinite(routeBudget.maxChunkCount) && totalChunks.length > routeBudget.maxChunkCount) {
      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'bundle-route-chunk-count-exceeded',
          message: `${routeBudget.route} uses ${totalChunks.length} client JS chunks, over the ${routeBudget.maxChunkCount} chunk budget.`,
          file: toRepoRelativePath(root, clientManifestPath),
          context: {
            route: routeBudget.route,
            actualChunkCount: totalChunks.length,
            maxChunkCount: routeBudget.maxChunkCount,
          },
        })
      );
    }

    return result;
  });

  const sortedIssues = sortIssues(issues);
  const summary = summarizeIssues(sortedIssues);
  const passingRouteCount = routeResults.filter((route) => route.status === 'pass').length;
  const failingRouteCount = routeResults.filter((route) => route.status === 'fail').length;

  return {
    generatedAt,
    status: summary.status,
    summary: {
      ...summary,
      discoveredPageRouteCount: pageRouteEntries.length,
      configuredRouteCount: normalizedConfig.routes.length,
      evaluatedRouteCount: routeResults.length,
      passingRouteCount,
      failingRouteCount,
      baseBytes,
      baseChunkCount: baseChunks.length,
    },
    config: {
      path: absoluteConfigPath ? toRepoRelativePath(root, absoluteConfigPath) : null,
      sharedBase: normalizedConfig.sharedBase,
    },
    base: {
      status:
        issues.some((issue) =>
          ['bundle-shared-base-bytes-exceeded', 'bundle-shared-base-chunk-count-exceeded', 'bundle-shared-chunk-file-missing'].includes(issue.ruleId)
        )
          ? 'fail'
          : 'pass',
      bytes: baseBytes,
      maxBytes: normalizedConfig.sharedBase.maxBytes,
      chunkCount: baseChunks.length,
      maxChunkCount: normalizedConfig.sharedBase.maxChunkCount,
      chunks: baseChunks.map((chunk) => ({
        path: chunk.chunkPath,
        bytes: chunk.bytes,
      })),
    },
    routes: routeResults,
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};

export const formatBundleBytes = formatBytesValue;
