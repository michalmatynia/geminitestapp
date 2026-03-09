import process from 'node:process';

import { execScanOutput } from './exec-scan-output.mjs';

const formatFailureDetails = (result) => {
  const parts = [];
  if (typeof result.exitCode === 'number') {
    parts.push(`exit code ${result.exitCode}`);
  }
  if (typeof result.signal === 'string' && result.signal.length > 0) {
    parts.push(`signal ${result.signal}`);
  }

  const exitDetails = parts.length > 0 ? ` (${parts.join(', ')})` : '';
  const errorDetails = result.error ? ` ${result.error}` : '';
  return `${exitDetails}.${errorDetails}`.trim();
};

export const readNumericSummaryFields = (summary, fields, sourceName) => {
  const metrics = {};

  for (const [metricName, summaryKey] of Object.entries(fields)) {
    const value = Number(summary?.[summaryKey]);
    if (!Number.isFinite(value)) {
      throw new Error(`${sourceName} did not produce summary.${summaryKey}.`);
    }

    metrics[metricName] = value;
  }

  return metrics;
};

export const collectNumericSummaryMetrics = async ({
  cwd = process.cwd(),
  env = process.env,
  command = 'node',
  commandArgs,
  sourceName,
  fields,
}) => {
  const result = await execScanOutput({
    command,
    commandArgs,
    cwd,
    env,
    sourceName,
  });

  if (!result.ok) {
    throw new Error(`${sourceName} failed${formatFailureDetails(result)}`);
  }

  return readNumericSummaryFields(result.output?.summary, fields, sourceName);
};
