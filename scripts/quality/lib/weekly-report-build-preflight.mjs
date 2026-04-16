import fs from 'node:fs/promises';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

export const isProcessInspectionPermissionError = (error) =>
  Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'EPERM' || error.code === 'EACCES')
  );

export const listProcessCommands = async (cwd) => {
  const { stdout } = await execFile('ps', ['-Ao', 'pid,command'], {
    cwd,
    maxBuffer: 4 * 1024 * 1024,
  });

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
};

export const findActiveRepoBuildProcesses = (processLines, root) =>
  processLines.filter((line) => {
    if (!line.includes('next build')) return false;
    if (!line.includes(root)) return false;
    return true;
  });

export const pathExists = async (absolutePath) => {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
};

export const preflightBuildLock = async ({ root, buildLockPath, buildStandalonePath, buildTracePath }) => {
  const hasLock = await pathExists(buildLockPath);
  const hasStandalone = await pathExists(buildStandalonePath);
  const hasTrace = await pathExists(buildTracePath);

  if (!hasLock && !hasStandalone && !hasTrace) {
    return {
      action: 'none',
      message: 'No build preflight cleanup required.',
    };
  }

  if (hasLock) {
    let processLines;
    try {
      processLines = await listProcessCommands(root);
    } catch (error) {
      if (isProcessInspectionPermissionError(error)) {
        const code = typeof error?.code === 'string' ? error.code : 'unknown';
        return {
          action: 'skip',
          message:
            `Skipping build because .next/lock exists and process inspection is unavailable (${code}).`,
        };
      }
      throw error;
    }

    const activeBuilds = findActiveRepoBuildProcesses(processLines, root);
    if (activeBuilds.length > 0) {
      return {
        action: 'skip',
        message:
          `Skipping build because an active next build process is already running for this workspace (${activeBuilds.length} detected).`,
      };
    }
  }

  const cleanupMessages = [];
  if (hasLock) {
    await fs.unlink(buildLockPath);
    cleanupMessages.push('Removed stale .next/lock before running build check.');
  }
  if (hasStandalone) {
    await fs.rm(buildStandalonePath, { recursive: true, force: true });
    cleanupMessages.push('Removed .next/standalone before build to reclaim disk space.');
  }
  if (hasTrace) {
    await fs.rm(buildTracePath, { recursive: true, force: true });
    cleanupMessages.push('Removed stale .next/trace-build before running build check.');
  }

  return {
    action: 'removed',
    message: cleanupMessages.join(' '),
  };
};

