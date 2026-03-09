import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

import { parseScanOutput } from './scan-output.mjs';

const execFile = promisify(execFileCallback);

const toText = (value) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toString' in value) {
    return value.toString();
  }
  return '';
};

const extractExecErrorDetails = (error) => {
  const stdout = toText(error?.stdout);
  const stderr = toText(error?.stderr);
  const exitCode = typeof error?.code === 'number' ? error.code : null;
  const signal = typeof error?.signal === 'string' ? error.signal : null;
  const message = error instanceof Error ? error.message : String(error);

  return {
    stdout,
    stderr,
    exitCode,
    signal,
    message,
  };
};

export const execScanOutput = async ({
  command = 'node',
  commandArgs,
  cwd,
  env,
  sourceName,
  maxBuffer = 8 * 1024 * 1024,
}) => {
  try {
    const { stdout, stderr } = await execFile(command, commandArgs, {
      cwd,
      encoding: 'utf8',
      env,
      maxBuffer,
    });

    return {
      ok: true,
      output: parseScanOutput(stdout, sourceName),
      stdout,
      stderr,
      exitCode: 0,
      signal: null,
      error: null,
    };
  } catch (error) {
    const details = extractExecErrorDetails(error);

    try {
      const output = parseScanOutput(details.stdout, sourceName);
      return {
        ok: false,
        output,
        stdout: details.stdout,
        stderr: details.stderr,
        exitCode: details.exitCode,
        signal: details.signal,
        error: details.message,
      };
    } catch (parseError) {
      const parseMessage = parseError instanceof Error ? parseError.message : String(parseError);
      return {
        ok: false,
        output: null,
        stdout: details.stdout,
        stderr: details.stderr,
        exitCode: details.exitCode,
        signal: details.signal,
        error: `${details.message} | ${parseMessage}`,
      };
    }
  }
};
