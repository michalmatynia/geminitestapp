import fs from 'node:fs';
import path from 'node:path';

import {
  createIssue,
  sortIssues,
  summarizeIssues,
  summarizeRules,
  toRepoRelativePath,
} from './check-runner.mjs';

const SOURCE_ROOT = 'src';
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

// Directories where direct Prisma client usage is acceptable
const PRISMA_ALLOWED_PATTERNS = [
  /^src\/app\/api\//,
  /^src\/features\/[^/]+\/server\//,
  /^src\/shared\/lib\/db\//,
  /^prisma\//,
  /^scripts\//,
];

// Feature barrel exports — importing from these paths is acceptable
const BARREL_SUFFIXES = ['/index', '/public', '/server', '/types'];

const INTERNAL_IMPORT_ALLOWLIST = new Set([
  // Add justified cross-feature internal imports here
]);

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
    const ext = path.extname(entry.name);
    if (!SOURCE_EXTENSIONS.has(ext)) continue;
    if (/\.test\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) continue;
    acc.push(absolutePath);
  }
  return acc;
};

const getFeatureName = (relativePath) => {
  const match = relativePath.match(/^src\/features\/([^/]+)/);
  return match ? match[1] : null;
};

const extractImports = (text) => {
  const imports = [];
  // Static imports and re-exports
  const importRegex = /(?:import|export)\s+(?:(?:type\s+)?(?:\{[^}]*\}|[^;'"]*)\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(text)) !== null) {
    imports.push({ path: match[1], index: match.index });
  }
  // Dynamic imports
  const dynamicRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicRegex.exec(text)) !== null) {
    imports.push({ path: match[1], index: match.index });
  }
  return imports;
};

const getLineNumber = (text, index) => {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
};

const detectCycles = (graph) => {
  const cycles = [];
  const visited = new Set();
  const inStack = new Set();
  const stack = [];

  const dfs = (node) => {
    if (inStack.has(node)) {
      const cycleStart = stack.indexOf(node);
      cycles.push(stack.slice(cycleStart).concat(node));
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    stack.push(node);

    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      dfs(neighbor);
    }

    stack.pop();
    inStack.delete(node);
  };

  for (const node of graph.keys()) {
    dfs(node);
  }

  // Deduplicate cycles (normalize by starting with the smallest node)
  const seen = new Set();
  return cycles.filter((cycle) => {
    const normalized = [...cycle.slice(0, -1)]; // Remove duplicate end node
    const minIdx = normalized.indexOf(
      normalized.reduce((a, b) => (a < b ? a : b))
    );
    const key = [...normalized.slice(minIdx), ...normalized.slice(0, minIdx)].join(' -> ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const analyzeImportBoundaries = ({ root = process.cwd() } = {}) => {
  const issues = [];
  let fileCount = 0;

  const sourceFiles = listSourceFiles(path.join(root, SOURCE_ROOT));

  // Build feature dependency graph for cycle detection
  const featureGraph = new Map(); // featureName -> Set<featureName>

  for (const absolutePath of sourceFiles) {
    const relativePath = toRepoRelativePath(root, absolutePath);
    const rawText = fs.readFileSync(absolutePath, 'utf8');
    fileCount++;

    const currentFeature = getFeatureName(relativePath);
    const imports = extractImports(rawText);

    for (const imp of imports) {
      const line = getLineNumber(rawText, imp.index);

      // Rule: deep-relative-import (3+ levels of ../)
      const deepRelativeMatch = imp.path.match(/^(\.\.\/){3,}/);
      if (deepRelativeMatch) {
        issues.push(
          createIssue({
            severity: 'warn',
            ruleId: 'deep-relative-import',
            file: relativePath,
            line,
            message: `Deep relative import (${imp.path.split('/').filter((s) => s === '..').length} levels up). Consider using path aliases.`,
          })
        );
      }

      // Rule: cross-feature-internal-import
      const featureImportMatch = imp.path.match(/^@\/features\/([^/]+)(\/(.+))?$/);
      if (featureImportMatch && currentFeature) {
        const importedFeature = featureImportMatch[1];
        const subPath = featureImportMatch[3];

        // Track feature-to-feature edges
        if (importedFeature !== currentFeature) {
          if (!featureGraph.has(currentFeature)) {
            featureGraph.set(currentFeature, new Set());
          }
          featureGraph.get(currentFeature).add(importedFeature);

          // Check if it's an internal import (not a barrel)
          if (subPath && !BARREL_SUFFIXES.some((s) => subPath === s.replace(/^\//, ''))) {
            const allowlistKey = `${relativePath}:${imp.path}`;
            if (!INTERNAL_IMPORT_ALLOWLIST.has(allowlistKey)) {
              issues.push(
                createIssue({
                  severity: 'error',
                  ruleId: 'cross-feature-internal-import',
                  file: relativePath,
                  line,
                  message: `Imports internal path from feature "${importedFeature}": ${imp.path}. Use the barrel export instead.`,
                })
              );
            }
          }
        }
      }

      // Rule: prisma-outside-server
      if (imp.path === '@prisma/client' || imp.path.startsWith('@prisma/client/')) {
        const isAllowed = PRISMA_ALLOWED_PATTERNS.some((pattern) => pattern.test(relativePath));
        if (!isAllowed) {
          issues.push(
            createIssue({
              severity: 'error',
              ruleId: 'prisma-outside-server',
              file: relativePath,
              line,
              message: 'Direct @prisma/client import outside of allowed server directories. Use the db provider abstraction.',
            })
          );
        }
      }
    }
  }

  // Rule: circular-feature-dep
  const cycles = detectCycles(featureGraph);
  for (const cycle of cycles) {
    issues.push(
      createIssue({
        severity: 'error',
        ruleId: 'circular-feature-dep',
        message: `Circular dependency between features: ${cycle.join(' -> ')}`,
      })
    );
  }

  const sortedIssues = sortIssues(issues);
  const summary = summarizeIssues(sortedIssues);

  return {
    generatedAt: new Date().toISOString(),
    status: summary.status,
    summary: {
      ...summary,
      fileCount,
      featureCount: featureGraph.size,
      circularDependencyCount: cycles.length,
    },
    scope: {
      root: SOURCE_ROOT,
      prismaAllowedPatterns: PRISMA_ALLOWED_PATTERNS.map((r) => r.source),
      internalImportAllowlist: [...INTERNAL_IMPORT_ALLOWLIST],
    },
    featureGraph: Object.fromEntries(
      [...featureGraph.entries()].map(([k, v]) => [k, [...v].sort()])
    ),
    circularDependencies: cycles,
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
