import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  applyLegacyPruneManifest,
  DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH,
  evaluateLegacyPruneManifest,
  loadLegacyPruneManifest,
} from './legacy-prune-manifest-utils.mjs';

const ROOT = process.cwd();

const parseArgs = (argv) => {
  const options = {
    mode: 'scan',
    manifestPath: DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH,
    writeReport: null,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--mode') {
      options.mode = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (token === '--manifest') {
      options.manifestPath = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (token === '--write-report') {
      options.writeReport = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (token === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      options.mode = 'help';
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return options;
};

const printUsage = () => {
  console.log('Usage: node scripts/ai-paths/bulk-prune.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --mode scan|apply        Scanner mode (default: scan).');
  console.log(
    `  --manifest <path>       Manifest relative path (default: ${DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH}).`
  );
  console.log('  --write-report <path>    Write JSON report (relative to repo root).');
  console.log('  --dry-run                Apply mode only; computes rewrites without writing files.');
  console.log('  --help                   Show this help.');
};

const writeJsonReport = (reportPath, report) => {
  const absoluteReportPath = path.isAbsolute(reportPath)
    ? reportPath
    : path.join(ROOT, reportPath);
  fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true });
  fs.writeFileSync(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return absoluteReportPath;
};

const groupFindingsByRule = (findings) => {
  const grouped = new Map();
  for (const finding of findings) {
    const current = grouped.get(finding.ruleId) ?? 0;
    grouped.set(finding.ruleId, current + 1);
  }
  return [...grouped.entries()].map(([ruleId, count]) => ({ ruleId, count }));
};

const summarizeManifest = (manifest) => ({
  manifestVersion: manifest.version,
  ruleCount: manifest.rules.length,
  targetCount: manifest.rules.reduce((count, rule) => count + rule.targets.length, 0),
});

const printFindings = (findings) => {
  if (findings.length === 0) return;
  console.error('[ai-paths:bulk-prune] findings:');
  for (const finding of findings) {
    console.error(`- [${finding.ruleId}] ${finding.file}: ${finding.message}`);
  }
};

const runScanMode = (options, manifest) => {
  const findings = evaluateLegacyPruneManifest(manifest, {
    root: ROOT,
    includeTargetFileMissingFindings: true,
  });
  const manifestSummary = summarizeManifest(manifest);

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: options.mode,
    manifestPath: options.manifestPath,
    ...manifestSummary,
    findingCount: findings.length,
    findingsByRule: groupFindingsByRule(findings),
  };

  const report = {
    summary,
    findings,
  };

  if (options.writeReport) {
    const saved = writeJsonReport(options.writeReport, report);
    console.log(`[ai-paths:bulk-prune] wrote report: ${saved}`);
  }

  if (findings.length === 0) {
    console.log('[ai-paths:bulk-prune] scan passed');
    console.log(
      `[ai-paths:bulk-prune] checked ${summary.ruleCount} rules across ${summary.targetCount} target(s)`
    );
    return;
  }

  console.error('[ai-paths:bulk-prune] scan found issues');
  printFindings(findings);
  process.exitCode = 1;
};

const runApplyMode = (options, manifest) => {
  const applyResult = applyLegacyPruneManifest(manifest, {
    root: ROOT,
    dryRun: options.dryRun,
  });
  const findings = evaluateLegacyPruneManifest(manifest, {
    root: ROOT,
    includeTargetFileMissingFindings: true,
  });
  const manifestSummary = summarizeManifest(manifest);

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: options.mode,
    dryRun: options.dryRun,
    manifestPath: options.manifestPath,
    ...manifestSummary,
    changedFileCount: applyResult.changedFileCount,
    replacedSnippetCount: applyResult.replacedSnippetCount,
    findingCount: findings.length,
    findingsByRule: groupFindingsByRule(findings),
  };

  const report = {
    summary,
    apply: applyResult,
    findings,
  };

  if (options.writeReport) {
    const saved = writeJsonReport(options.writeReport, report);
    console.log(`[ai-paths:bulk-prune] wrote report: ${saved}`);
  }

  const modeLabel = options.dryRun ? 'apply dry-run' : 'apply';
  console.log(
    `[ai-paths:bulk-prune] ${modeLabel} replaced ${summary.replacedSnippetCount} snippet(s) across ${summary.changedFileCount} file(s)`
  );

  if (findings.length > 0) {
    console.error('[ai-paths:bulk-prune] apply completed with remaining findings');
    printFindings(findings);
    process.exitCode = 1;
    return;
  }

  console.log(`[ai-paths:bulk-prune] ${modeLabel} passed`);
};

const main = () => {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse args.';
    console.error(`[ai-paths:bulk-prune] ${message}`);
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (options.mode === 'help') {
    printUsage();
    return;
  }

  if (options.mode !== 'scan' && options.mode !== 'apply') {
    console.error(`[ai-paths:bulk-prune] unsupported mode: ${options.mode}`);
    printUsage();
    process.exitCode = 1;
    return;
  }

  let manifest;
  try {
    manifest = loadLegacyPruneManifest(ROOT, options.manifestPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to load manifest';
    console.error(`[ai-paths:bulk-prune] ${message}`);
    process.exitCode = 1;
    return;
  }

  if (options.mode === 'scan') {
    runScanMode(options, manifest);
    return;
  }

  runApplyMode(options, manifest);
};

main();
