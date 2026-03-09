import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH,
  evaluateLegacyPruneManifest,
  loadLegacyPruneManifest,
} from './legacy-prune-manifest-utils.mjs';
import {
  DOCS_REGISTRY_CONSTANTS_PATH,
  NODE_VALIDATOR_MANIFEST_PATH,
  TOOLTIP_MANIFEST_PATH,
  evaluateCanonicalManifestPathRules,
} from './canonical-manifest-paths-utils.mjs';
import {
  buildStaticCheckFilters,
  parseCommonCheckArgs,
  writeSummaryJson,
} from '../lib/check-cli.mjs';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

const isSourceCodeFile = (file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file);

const collectSourceFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const stack = [dir];
  const files = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!isSourceCodeFile(entry.name)) continue;
      files.push(absolute);
    }
  }

  return files;
};

const checkValidationManifestSourcePaths = (violations) => {
  const findings = evaluateCanonicalManifestPathRules({ root: ROOT });
  for (const finding of findings) {
    violations.push({ file: finding.file, message: finding.message });
  }
};

const checkManifestLegacyPruneRules = (violations) => {
  let manifest;
  try {
    manifest = loadLegacyPruneManifest(ROOT, DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to load legacy prune manifest';
    violations.push({ file: DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH, message });
    return;
  }

  const findings = evaluateLegacyPruneManifest(manifest, {
    root: ROOT,
    includeTargetFileMissingFindings: true,
  });

  for (const finding of findings) {
    violations.push({ file: finding.file, message: `manifest rule "${finding.ruleId}" ${finding.message}` });
  }
};

const evaluateCanonicalCheck = () => {
  const sourceFiles = collectSourceFiles(SRC_DIR);
  const violations = [];

  checkManifestLegacyPruneRules(violations);
  checkValidationManifestSourcePaths(violations);

  return {
    sourceFiles,
    violations,
  };
};

const main = () => {
  const { summaryJson, strictMode, failOnWarnings } = parseCommonCheckArgs();
  const generatedAt = new Date().toISOString();
  const { sourceFiles, violations } = evaluateCanonicalCheck();

  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'ai-paths-check-canonical',
      generatedAt,
      status: violations.length === 0 ? 'ok' : 'failed',
      summary: {
        sourceFileCount: sourceFiles.length,
        violationCount: violations.length,
      },
      details: {
        violations,
        scope: {
          srcDir: 'src',
          constantsFile: DOCS_REGISTRY_CONSTANTS_PATH,
          nodeValidatorManifest: NODE_VALIDATOR_MANIFEST_PATH,
          tooltipManifest: TOOLTIP_MANIFEST_PATH,
          legacyPruneManifest: DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH,
        },
      },
      filters: buildStaticCheckFilters({ strictMode, failOnWarnings }),
      notes: ['ai-paths canonical check result'],
    });
    if (violations.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (violations.length > 0) {
    console.error('[ai-paths:check:canonical] failed with violations:');
    for (const violation of violations) {
      console.error(`- ${violation.file}: ${violation.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('[ai-paths:check:canonical] passed');
  console.log(`[ai-paths:check:canonical] scanned ${sourceFiles.length} source file(s) under src/`);
};

main();
