import { execScanOutput } from '../../architecture/lib/exec-scan-output.mjs';

const DEFAULT_MAX_OUTPUT_BYTES = 160_000;

export const truncateWeeklyCheckOutput = (value, maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES) => {
  if (!value) {
    return '';
  }
  if (value.length <= maxOutputBytes) {
    return value;
  }
  return value.slice(-maxOutputBytes);
};

export const createWeeklyCheckResult = ({
  id,
  label,
  command,
  status,
  output,
}) => ({
  id,
  label,
  command,
  status,
  exitCode: null,
  signal: null,
  durationMs: 0,
  output,
});

export const formatStructuredCheckOutput = ({
  result,
  maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
}) => {
  const scan = result.output;

  if (!scan) {
    return truncateWeeklyCheckOutput(
      [
        '[summary-json] unavailable',
        result.error,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join('\n'),
      maxOutputBytes
    );
  }

  const lines = [
    `[summary-json] scanner=${scan.scanner.name} status=${scan.status} summary=${JSON.stringify(scan.summary)}`,
  ];

  if (result.error) {
    lines.push(`[exec] ${result.error}`);
  }

  const stdout =
    typeof scan.details?.stdout === 'string' && scan.details.stdout.length > 0
      ? scan.details.stdout
      : result.stdout;
  const stderr =
    typeof scan.details?.stderr === 'string' && scan.details.stderr.length > 0
      ? scan.details.stderr
      : result.stderr;

  if (scan.status !== 'ok' || !result.ok) {
    if (stdout) {
      lines.push(stdout);
    }
    if (stderr) {
      lines.push(stderr);
    }
  }

  return truncateWeeklyCheckOutput(lines.join('\n'), maxOutputBytes);
};

const buildStructuredCheckSnapshot = (scan) => {
  if (!scan) {
    return null;
  }

  return {
    scanner: scan.scanner,
    status: scan.status,
    summary: scan.summary,
    paths: scan.paths,
    filters: scan.filters,
    notes: scan.notes,
  };
};

const resolveStructuredCheckStatus = ({ result, durationMs, timeoutMs }) => {
  if (result.timedOut || (result.killed && timeoutMs > 0 && durationMs >= timeoutMs)) {
    return 'timeout';
  }

  return result.exitCode === 0 && result.output?.status === 'ok' ? 'pass' : 'fail';
};

export const runStructuredCommandCheck = async ({
  id,
  label,
  command,
  commandArgs,
  timeoutMs,
  enabled = true,
  disabledOutput = 'Skipped by configuration.',
  cwd,
  env,
  sourceName,
  maxBuffer = 8 * 1024 * 1024,
  maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
}) => {
  if (!enabled) {
    return createWeeklyCheckResult({
      id,
      label,
      command: [command, ...commandArgs].join(' '),
      status: 'skipped',
      output: disabledOutput,
    });
  }

  const startedAt = Date.now();
  const result = await execScanOutput({
    command,
    commandArgs,
    cwd,
    env,
    sourceName,
    maxBuffer,
    timeoutMs,
  });
  const durationMs = Date.now() - startedAt;

  return {
    id,
    label,
    command: [command, ...commandArgs].join(' '),
    status: resolveStructuredCheckStatus({
      result,
      durationMs,
      timeoutMs,
    }),
    exitCode: result.exitCode,
    signal: result.signal,
    durationMs,
    output: formatStructuredCheckOutput({
      result,
      maxOutputBytes,
    }),
    scanSummary: buildStructuredCheckSnapshot(result.output),
  };
};
