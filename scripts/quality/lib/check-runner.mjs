import fs from 'node:fs/promises';
import path from 'node:path';

import { parseCommonCheckArgs, writeSummaryJson } from '../../lib/check-cli.mjs';
import { writeMetricsMarkdownFile } from '../../docs/metrics-frontmatter.mjs';

const SEVERITY_ORDER = {
  error: 0,
  warn: 1,
  info: 2,
};

export { parseCommonCheckArgs };

export const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${(seconds / 60).toFixed(1)}m`;
};

export const toRepoRelativePath = (root, absolutePath) =>
  path.relative(root, absolutePath).replace(/\\/g, '/');

export const createIssue = ({
  severity,
  ruleId,
  message,
  file = null,
  line = null,
  column = null,
  snippet = null,
  context = null,
}) => ({
  severity,
  ruleId,
  message,
  file,
  line,
  column,
  snippet,
  context,
});

export const sortIssues = (issues) =>
  [...issues].sort((left, right) => {
    const severityDelta =
      (SEVERITY_ORDER[left.severity] ?? Number.MAX_SAFE_INTEGER) -
      (SEVERITY_ORDER[right.severity] ?? Number.MAX_SAFE_INTEGER);
    if (severityDelta !== 0) return severityDelta;
    const fileDelta = (left.file ?? '').localeCompare(right.file ?? '');
    if (fileDelta !== 0) return fileDelta;
    const lineDelta = (left.line ?? Number.MAX_SAFE_INTEGER) - (right.line ?? Number.MAX_SAFE_INTEGER);
    if (lineDelta !== 0) return lineDelta;
    return (left.ruleId ?? '').localeCompare(right.ruleId ?? '');
  });

export const summarizeIssues = (issues) => {
  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warn').length;
  const infoCount = issues.filter((issue) => issue.severity === 'info').length;
  return {
    total: issues.length,
    errorCount,
    warningCount,
    infoCount,
    status: errorCount > 0 ? 'failed' : warningCount > 0 ? 'warn' : 'passed',
  };
};

export const summarizeRules = (issues) => {
  const byRule = new Map();
  for (const issue of issues) {
    const entry = byRule.get(issue.ruleId) ?? {
      ruleId: issue.ruleId,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
    };
    if (issue.severity === 'error') entry.errorCount += 1;
    if (issue.severity === 'warn') entry.warningCount += 1;
    if (issue.severity === 'info') entry.infoCount += 1;
    byRule.set(issue.ruleId, entry);
  }

  return [...byRule.values()].sort((left, right) => {
    if (right.errorCount !== left.errorCount) return right.errorCount - left.errorCount;
    if (right.warningCount !== left.warningCount) return right.warningCount - left.warningCount;
    return left.ruleId.localeCompare(right.ruleId);
  });
};

export const formatIssueLocation = (issue) => {
  if (!issue.file) return '-';
  if (!Number.isFinite(issue.line)) return issue.file;
  if (!Number.isFinite(issue.column)) return `${issue.file}:${issue.line}`;
  return `${issue.file}:${issue.line}:${issue.column}`;
};

const escapeTable = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br/>');

export const renderIssueTable = (issues) => {
  const lines = [];
  lines.push('| Severity | Rule | Location | Message |');
  lines.push('| --- | --- | --- | --- |');
  for (const issue of issues) {
    lines.push(
      `| ${issue.severity.toUpperCase()} | ${escapeTable(issue.ruleId)} | ${escapeTable(
        formatIssueLocation(issue)
      )} | ${escapeTable(issue.message)} |`
    );
  }
  return lines;
};

export const renderRuleTable = (rules) => {
  const lines = [];
  lines.push('| Rule | Errors | Warnings | Info |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const rule of rules) {
    lines.push(
      `| ${escapeTable(rule.ruleId)} | ${rule.errorCount} | ${rule.warningCount} | ${rule.infoCount} |`
    );
  }
  return lines;
};

export const writeCheckArtifacts = async ({
  root,
  slug,
  payload,
  markdown,
  shouldWriteHistory,
}) => {
  const outDir = path.join(root, 'docs', 'metrics');
  await fs.mkdir(outDir, { recursive: true });

  const stamp = payload.generatedAt.replace(/[:.]/g, '-');
  const latestJsonPath = path.join(outDir, `${slug}-latest.json`);
  const latestMdPath = path.join(outDir, `${slug}-latest.md`);
  const historicalJsonPath = path.join(outDir, `${slug}-${stamp}.json`);
  const historicalMdPath = path.join(outDir, `${slug}-${stamp}.md`);

  await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeMetricsMarkdownFile({ root, targetPath: latestMdPath, content: markdown });

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await writeMetricsMarkdownFile({ root, targetPath: historicalMdPath, content: markdown });
  }

  return {
    latestJsonPath,
    latestMdPath,
    historicalJsonPath,
    historicalMdPath,
  };
};

export const runQualityCheckCli = async ({
  id,
  slug = id,
  analyze,
  toMarkdown,
  buildLogLines = () => [],
}) => {
  try {
    const root = process.cwd();
    const startedAt = Date.now();
    const { strictMode, failOnWarnings, shouldWriteHistory, noWrite, summaryJson } = parseCommonCheckArgs();
    const payload = await analyze({ root, env: process.env });
    payload.durationMs = Date.now() - startedAt;

    const shouldWriteArtifacts = !noWrite;
    const outputs = shouldWriteArtifacts
      ? await writeCheckArtifacts({
          root,
          slug,
          payload,
          markdown: toMarkdown(payload),
          shouldWriteHistory,
        })
      : null;

    if (summaryJson) {
      const details = Object.fromEntries(
        Object.entries(payload).filter(([key]) => !['generatedAt', 'status', 'summary'].includes(key))
      );
      writeSummaryJson({
        scannerName: id,
        generatedAt: payload.generatedAt,
        status: payload.status,
        summary: payload.summary,
        details,
        paths: outputs
          ? {
              latestJson: toRepoRelativePath(root, outputs.latestJsonPath),
              latestMarkdown: toRepoRelativePath(root, outputs.latestMdPath),
              historicalJson: shouldWriteHistory
                ? toRepoRelativePath(root, outputs.historicalJsonPath)
                : null,
              historicalMarkdown: shouldWriteHistory
                ? toRepoRelativePath(root, outputs.historicalMdPath)
                : null,
            }
          : null,
        filters: {
          strictMode,
          failOnWarnings,
          historyDisabled: !shouldWriteHistory,
          noWrite,
        },
        notes: [`${id} quality check result`],
      });
    } else {
      const logLines = buildLogLines({
        root,
        payload,
        outputs,
        formatDuration,
      });
      for (const line of Array.isArray(logLines) ? logLines : []) {
        if (typeof line === 'string' && line.length > 0) {
          console.log(line);
        }
      }

      if (outputs) {
        console.log(`Wrote ${path.relative(root, outputs.latestJsonPath)}`);
        console.log(`Wrote ${path.relative(root, outputs.latestMdPath)}`);
        if (shouldWriteHistory) {
          console.log(`Wrote ${path.relative(root, outputs.historicalJsonPath)}`);
          console.log(`Wrote ${path.relative(root, outputs.historicalMdPath)}`);
        }
      }
    }

    if (strictMode && Number(payload.summary?.errorCount ?? 0) > 0) {
      process.exit(1);
    }
    if (strictMode && failOnWarnings && Number(payload.summary?.warningCount ?? 0) > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`[${id}] failed`);
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  }
};
