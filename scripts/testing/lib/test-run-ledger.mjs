import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { writeMetricsMarkdownFile } from '../../docs/metrics-frontmatter.mjs';

const LEDGER_MAX_ENTRIES = 50;

const toFiniteNumber = (value) => (Number.isFinite(value) ? Number(value) : null);

const readJsonIfExists = async (absolutePath) => {
  try {
    const raw = await fs.readFile(absolutePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const tryExec = (command, args, cwd) => {
  try {
    return execFileSync(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
};

export const readTestingRunLedger = async ({ root = process.cwd() } = {}) => {
  const latestJsonPath = path.join(root, 'docs', 'metrics', 'testing-run-ledger-latest.json');
  const payload = await readJsonIfExists(latestJsonPath);
  if (payload && Array.isArray(payload.entries)) {
    return payload;
  }

  return {
    generatedAt: null,
    summary: {
      totalEntries: 0,
      passingEntries: 0,
      failingEntries: 0,
      warningEntries: 0,
      latestRunAt: null,
    },
    entries: [],
  };
};

const summarizeEntries = (entries) => ({
  totalEntries: entries.length,
  passingEntries: entries.filter((entry) => entry.status === 'ok').length,
  failingEntries: entries.filter((entry) => entry.status === 'failed').length,
  warningEntries: entries.filter((entry) => entry.status === 'warn').length,
  latestRunAt: entries[0]?.recordedAt ?? null,
});

const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) {
    return 'n/a';
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  return `${(seconds / 60).toFixed(1)}m`;
};

const normalizeStatus = (status) => {
  if (status === 'failed' || status === 'warn' || status === 'ok') {
    return status;
  }
  if (status === 'pass' || status === 'passed' || status === 'success') {
    return 'ok';
  }
  if (status === 'fail' || status === 'error') {
    return 'failed';
  }
  return 'warn';
};

export const getTestingLedgerGitContext = ({ root = process.cwd() } = {}) => ({
  sha: tryExec('git', ['rev-parse', '--short', 'HEAD'], root),
  branch: tryExec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], root),
});

export const createTestingRunLedgerEntry = ({
  root = process.cwd(),
  now = new Date(),
  label,
  status,
  laneId = null,
  suiteIds = [],
  suiteResults = [],
  durationMs = null,
  trigger = 'manual',
  actor = process.env['AI_AGENT_ID'] || process.env['GITHUB_ACTOR'] || 'unknown',
  notes = [],
  artifactPaths = [],
  command = null,
  git = getTestingLedgerGitContext({ root }),
}) => {
  const recordedAt = typeof now === 'string' ? now : now.toISOString();
  return {
    id: `${recordedAt}:${laneId ?? label}`,
    recordedAt,
    label,
    status: normalizeStatus(status),
    laneId,
    suiteIds: [...new Set(suiteIds)],
    suiteResults: suiteResults.map((result) => ({
      id: result.id,
      label: result.label,
      status: normalizeStatus(result.status),
      durationMs: toFiniteNumber(result.durationMs),
    })),
    durationMs: toFiniteNumber(durationMs),
    trigger,
    actor,
    notes: notes.filter(Boolean),
    artifactPaths: [...new Set(artifactPaths.filter(Boolean))],
    command,
    git: {
      sha: git?.sha ?? null,
      branch: git?.branch ?? null,
    },
  };
};

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Testing Run Ledger');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Recorded runs: ${payload.summary.totalEntries}`);
  lines.push(`- Passing runs: ${payload.summary.passingEntries}`);
  lines.push(`- Failed runs: ${payload.summary.failingEntries}`);
  lines.push(`- Warning runs: ${payload.summary.warningEntries}`);
  lines.push(`- Latest recorded run: ${payload.summary.latestRunAt ?? 'n/a'}`);
  lines.push('');
  lines.push('## Recent Runs');
  lines.push('');
  if (payload.entries.length === 0) {
    lines.push('- No major test runs have been recorded yet.');
    lines.push('- Use `npm run test:lane:*` for lane-based runs or `npm run testing:record -- --help-like-usage-in-docs` for manual entries.');
    return `${lines.join('\n')}\n`;
  }

  lines.push('| When | Label | Status | Suites | Duration | Actor | Ref |');
  lines.push('| --- | --- | --- | --- | ---: | --- | --- |');
  for (const entry of payload.entries.slice(0, 20)) {
    lines.push(
      `| ${entry.recordedAt} | ${entry.label} | ${String(entry.status).toUpperCase()} | ${
        entry.suiteIds.length > 0 ? entry.suiteIds.map((suiteId) => `\`${suiteId}\``).join(', ') : '-'
      } | ${formatDuration(entry.durationMs)} | ${entry.actor ?? 'unknown'} | ${
        entry.git?.sha ? `\`${entry.git.sha}\`` : '-'
      } |`
    );
  }

  const latestEntry = payload.entries[0];
  lines.push('');
  lines.push('## Latest Run Details');
  lines.push('');
  lines.push(`- Label: ${latestEntry.label}`);
  lines.push(`- Status: ${String(latestEntry.status).toUpperCase()}`);
  lines.push(`- Trigger: ${latestEntry.trigger}`);
  lines.push(`- Lane: ${latestEntry.laneId ?? 'manual'}`);
  lines.push(`- Duration: ${formatDuration(latestEntry.durationMs)}`);
  lines.push(`- Actor: ${latestEntry.actor ?? 'unknown'}`);
  lines.push(`- Git: ${latestEntry.git?.branch ?? 'unknown'} ${latestEntry.git?.sha ?? ''}`.trim());
  if (latestEntry.artifactPaths.length > 0) {
    lines.push('- Artifacts:');
    for (const artifact of latestEntry.artifactPaths) {
      lines.push(`  - \`${artifact}\``);
    }
  }
  if (latestEntry.notes.length > 0) {
    lines.push('- Notes:');
    for (const note of latestEntry.notes) {
      lines.push(`  - ${note}`);
    }
  }
  if (latestEntry.suiteResults.length > 0) {
    lines.push('');
    lines.push('### Latest Suite Results');
    lines.push('');
    lines.push('| Suite | Status | Duration |');
    lines.push('| --- | --- | ---: |');
    for (const result of latestEntry.suiteResults) {
      lines.push(
        `| ${result.label ?? result.id} | ${String(result.status).toUpperCase()} | ${formatDuration(
          result.durationMs
        )} |`
      );
    }
  }

  return `${lines.join('\n')}\n`;
};

export const writeTestingRunLedgerArtifacts = async ({
  root = process.cwd(),
  entries,
  shouldWriteHistory = false,
  generatedAt = new Date().toISOString(),
}) => {
  const outDir = path.join(root, 'docs', 'metrics');
  await fs.mkdir(outDir, { recursive: true });

  const payload = {
    generatedAt,
    summary: summarizeEntries(entries),
    entries,
  };

  const stamp = generatedAt.replace(/[:.]/g, '-');
  const latestJsonPath = path.join(outDir, 'testing-run-ledger-latest.json');
  const latestMdPath = path.join(outDir, 'testing-run-ledger-latest.md');
  const historicalJsonPath = path.join(outDir, `testing-run-ledger-${stamp}.json`);
  const historicalMdPath = path.join(outDir, `testing-run-ledger-${stamp}.md`);

  await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeMetricsMarkdownFile({
    root,
    targetPath: latestMdPath,
    content: toMarkdown(payload),
  });

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await writeMetricsMarkdownFile({
      root,
      targetPath: historicalMdPath,
      content: toMarkdown(payload),
    });
  }

  return {
    payload,
    paths: {
      latestJson: path.relative(root, latestJsonPath),
      latestMarkdown: path.relative(root, latestMdPath),
      historicalJson: shouldWriteHistory ? path.relative(root, historicalJsonPath) : null,
      historicalMarkdown: shouldWriteHistory ? path.relative(root, historicalMdPath) : null,
    },
  };
};

export const appendTestingRunLedgerEntry = async ({
  root = process.cwd(),
  entry,
  shouldWriteHistory = false,
}) => {
  const ledger = await readTestingRunLedger({ root });
  const remainingEntries = ledger.entries.filter((existingEntry) => existingEntry.id !== entry.id);
  const entries = [entry, ...remainingEntries]
    .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))
    .slice(0, LEDGER_MAX_ENTRIES);

  return writeTestingRunLedgerArtifacts({
    root,
    entries,
    shouldWriteHistory,
    generatedAt: new Date().toISOString(),
  });
};

export const ensureTestingRunLedgerArtifacts = async ({
  root = process.cwd(),
  shouldWriteHistory = false,
}) => {
  const ledger = await readTestingRunLedger({ root });
  return writeTestingRunLedgerArtifacts({
    root,
    entries: ledger.entries,
    shouldWriteHistory,
    generatedAt: new Date().toISOString(),
  });
};
