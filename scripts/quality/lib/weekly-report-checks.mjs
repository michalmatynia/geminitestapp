import { spawn } from 'node:child_process';
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

export const runCommandCheckAttempt = ({ command, commandArgs, timeoutMs, cwd, maxOutputBytes = DEFAULT_maxOutputBytes }) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(command, commandArgs, {
      cwd,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    let completed = false;
    let timedOut = false;

    const append = (chunk) => {
      output += chunk.toString();
      if (output.length > maxOutputBytes) {
        output = output.slice(-maxOutputBytes);
      }
    };

    child.stdout?.on('data', append);
    child.stderr?.on('data', append);

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!completed) {
          child.kill('SIGKILL');
        }
      }, 5000);
    }, timeoutMs);

    child.on('error', (error) => {
      completed = true;
      clearTimeout(timer);
      resolve({
        status: 'fail',
        exitCode: null,
        signal: null,
        durationMs: Date.now() - startedAt,
        output: truncateWeeklyCheckOutput(`${output}\n${error.stack ?? String(error)}`.trim(), maxOutputBytes),
      });
    });

    child.on('close', (exitCode, signal) => {
      completed = true;
      clearTimeout(timer);
      resolve({
        status: timedOut ? 'timeout' : exitCode === 0 ? 'pass' : 'fail',
        exitCode,
        signal,
        durationMs: Date.now() - startedAt,
        output: output.length <= maxOutputBytes ? output.trim() : output.slice(-maxOutputBytes).trim(),
      });
    });
  });

export const runCommandCheck = async ({
  id,
  label,
  command,
  commandArgs,
  timeoutMs,
  enabled = true,
  disabledOutput = 'Skipped by configuration.',
  confirmFailureRetries = 0,
  cwd,
  maxOutputBytes = DEFAULT_maxOutputBytes,
}) => {
  if (!enabled) {
    return {
      id,
      label,
      command: [command, ...commandArgs].join(' '),
      status: 'skipped',
      exitCode: null,
      signal: null,
      durationMs: 0,
      output: disabledOutput,
    };
  }

  const commandString = [command, ...commandArgs].join(' ');
  const attempts = [];

  for (let attemptIndex = 0; attemptIndex <= confirmFailureRetries; attemptIndex += 1) {
    const result = await runCommandCheckAttempt({
      command,
      commandArgs,
      timeoutMs,
      cwd,
      maxOutputBytes,
    });
    attempts.push(result);

    if (result.status === 'pass' || result.status === 'timeout') {
      const outputPrefix =
        attemptIndex > 0
          ? `[retry] ${label} passed on confirmation attempt ${attemptIndex + 1} of ${confirmFailureRetries + 1}.`
          : '';
      return {
        id,
        label,
        command: commandString,
        status: result.status,
        exitCode: result.exitCode,
        signal: result.signal,
        durationMs: attempts.reduce((total, value) => total + value.durationMs, 0),
        output:
          [outputPrefix, result.output].filter(Boolean).join('\n').length <= maxOutputBytes
            ? [outputPrefix, result.output].filter(Boolean).join('\n')
            : [outputPrefix, result.output].filter(Boolean).join('\n').slice(-maxOutputBytes),
      };
    }
  }

  const finalResult = attempts.at(-1);
  return {
    id,
    label,
    command: commandString,
    status: finalResult.status,
    exitCode: finalResult.exitCode,
    signal: finalResult.signal,
    durationMs: attempts.reduce((total, value) => total + value.durationMs, 0),
    output: (() => {
      const output = attempts
        .map((attempt, index) =>
          [`[attempt ${index + 1}/${attempts.length}]`, attempt.output].filter(Boolean).join('\n')
        )
        .join('\n\n');
      return output.length <= maxOutputBytes ? output : output.slice(-maxOutputBytes);
    })(),
  };
};

