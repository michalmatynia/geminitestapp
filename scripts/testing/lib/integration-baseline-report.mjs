import fs from 'node:fs/promises';
import path from 'node:path';

import { writeMetricsMarkdownFile } from '../../docs/metrics-frontmatter.mjs';

export const MAX_OUTPUT_BYTES = 120_000;

export const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0ms';
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

const truncateOutput = (value) => {
  if (value.length <= MAX_OUTPUT_BYTES) {
    return value;
  }
  return value.slice(-MAX_OUTPUT_BYTES);
};

export const buildIntegrationBaselinePayload = ({
  generatedAt,
  strictMode,
  suiteId,
  suiteName,
  project,
  steps,
}) => {
  const totalDurationMs = steps.reduce((total, step) => total + (Number.isFinite(step.durationMs) ? step.durationMs : 0), 0);
  const failedStep = steps.find((step) => step.status !== 'pass');
  const aggregateStatus = failedStep ? 'fail' : 'pass';
  const aggregateExitCode = failedStep?.exitCode ?? 0;
  const aggregateOutput = truncateOutput(
    steps
      .map((step, index) =>
        [`[step ${index + 1}/${steps.length}] ${step.name}`, step.output].filter(Boolean).join('\n')
      )
      .join('\n\n')
      .trim()
  );

  return {
    generatedAt,
    strictMode,
    summary: {
      total: 1,
      passed: aggregateStatus === 'pass' ? 1 : 0,
      failed: aggregateStatus === 'pass' ? 0 : 1,
      totalDurationMs,
    },
    results: [
      {
        id: suiteId,
        name: suiteName,
        project,
        status: aggregateStatus,
        exitCode: aggregateExitCode,
        durationMs: totalDurationMs,
        command: steps.map((step) => step.command).join(' && '),
        steps,
        output: aggregateOutput,
      },
    ],
  };
};

export const toIntegrationBaselineMarkdown = (payload, { title, notes = [] }) => {
  const result = payload.results[0];
  const lines = [];
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Suites: ${payload.summary.total}`);
  lines.push(`- Passed: ${payload.summary.passed}`);
  lines.push(`- Failed: ${payload.summary.failed}`);
  lines.push(`- Total duration: ${formatDuration(payload.summary.totalDurationMs)}`);
  lines.push('');
  lines.push('## Aggregate Result');
  lines.push('');
  lines.push(`- Project: ${result.project}`);
  lines.push(`- Status: ${result.status.toUpperCase()}`);
  lines.push(`- Exit code: ${result.exitCode ?? '-'}`);
  lines.push(`- Duration: ${formatDuration(result.durationMs)}`);
  lines.push('');
  lines.push('## Step Status');
  lines.push('');
  lines.push('| Step | Status | Duration | Exit | Command |');
  lines.push('| --- | --- | ---: | ---: | --- |');
  for (const step of result.steps) {
    lines.push(
      `| ${step.name} | ${String(step.status).toUpperCase()} | ${formatDuration(step.durationMs)} | ${step.exitCode ?? '-'} | \`${step.command}\` |`
    );
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  if (notes.length === 0) {
    lines.push('- Generated integration baseline artifact.');
  } else {
    for (const note of notes) {
      lines.push(`- ${note}`);
    }
  }
  return `${lines.join('\n')}\n`;
};

export const writeIntegrationBaselineArtifacts = async ({
  root,
  outDir,
  artifactBaseName,
  payload,
  title,
  shouldWriteHistory,
  notes,
}) => {
  await fs.mkdir(outDir, { recursive: true });
  const stamp = payload.generatedAt.replace(/[:.]/g, '-');

  const latestJsonPath = path.join(outDir, `${artifactBaseName}-latest.json`);
  const latestMdPath = path.join(outDir, `${artifactBaseName}-latest.md`);
  const historicalJsonPath = path.join(outDir, `${artifactBaseName}-${stamp}.json`);
  const historicalMdPath = path.join(outDir, `${artifactBaseName}-${stamp}.md`);

  await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeMetricsMarkdownFile({
    root,
    targetPath: latestMdPath,
    content: toIntegrationBaselineMarkdown(payload, { title, notes }),
  });

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await writeMetricsMarkdownFile({
      root,
      targetPath: historicalMdPath,
      content: toIntegrationBaselineMarkdown(payload, { title, notes }),
    });
  }

  return {
    latestJson: path.relative(root, latestJsonPath),
    latestMarkdown: path.relative(root, latestMdPath),
    historicalJson: shouldWriteHistory ? path.relative(root, historicalJsonPath) : null,
    historicalMarkdown: shouldWriteHistory ? path.relative(root, historicalMdPath) : null,
  };
};
