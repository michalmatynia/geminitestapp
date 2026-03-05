import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH,
  evaluateLegacyPruneManifest,
  loadLegacyPruneManifest,
} from './legacy-prune-manifest-utils.mjs';
import { evaluateCanonicalManifestPathRules } from './canonical-manifest-paths-utils.mjs';

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

const violations = [];

const reportViolation = (file, message) => {
  violations.push({ file, message });
};

const checkValidationManifestSourcePaths = () => {
  const findings = evaluateCanonicalManifestPathRules({ root: ROOT });
  for (const finding of findings) {
    reportViolation(finding.file, finding.message);
  }
};

const checkManifestLegacyPruneRules = () => {
  let manifest;
  try {
    manifest = loadLegacyPruneManifest(ROOT, DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to load legacy prune manifest';
    reportViolation(DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH, message);
    return;
  }

  const findings = evaluateLegacyPruneManifest(manifest, {
    root: ROOT,
    includeTargetFileMissingFindings: true,
  });

  for (const finding of findings) {
    reportViolation(finding.file, `manifest rule "${finding.ruleId}" ${finding.message}`);
  }
};

const main = () => {
  const sourceFiles = collectSourceFiles(SRC_DIR);

  checkManifestLegacyPruneRules();
  checkValidationManifestSourcePaths();

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
