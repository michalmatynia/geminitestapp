import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  capturePlaywrightConnectionTestDebugArtifacts,
  createPlaywrightConnectionTestFailWithDebug,
} from './connection-test-debug';

describe('capturePlaywrightConnectionTestDebugArtifacts', () => {
  let originalCwd: string;
  let testDir: string;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00.000Z'));
    originalCwd = process.cwd();
    testDir = await mkdtemp(path.join(os.tmpdir(), 'playwright-connection-test-debug-'));
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
    vi.useRealTimers();
  });

  it('captures screenshot and html artifacts', async () => {
    const screenshotMock = vi.fn().mockImplementation(async ({ path: filePath }: { path: string }) => {
      await writeFile(filePath, 'png');
    });
    const contentMock = vi.fn().mockResolvedValue('<html>snapshot</html>');

    const debugInfo = await capturePlaywrightConnectionTestDebugArtifacts({
      page: {
        screenshot: screenshotMock,
        content: contentMock,
      } as never,
      connectionId: 'connection-1',
      label: 'Login failed',
    });

    const expectedRelativeBasePath = path.join(
      'playwright-debug',
      'connection-1-2026-04-10T12-00-00-000Z-login-failed'
    );

    expect(screenshotMock).toHaveBeenCalledWith({
      path: expect.stringContaining(`${expectedRelativeBasePath}.png`),
      fullPage: true,
    });
    const actualScreenshotPath = screenshotMock.mock.calls[0]?.[0]?.path as string;
    const actualHtmlPath = actualScreenshotPath.replace(/\.png$/, '.html');

    await expect(readFile(actualHtmlPath, 'utf8')).resolves.toBe(
      '<html>snapshot</html>'
    );
    expect(debugInfo).toBe(`Screenshot: ${actualScreenshotPath}\nHTML: ${actualHtmlPath}`);
  });

  it('logs unexpected failures and returns an empty debug payload', async () => {
    const onError = vi.fn();

    const debugInfo = await capturePlaywrightConnectionTestDebugArtifacts({
      page: {
        content: vi.fn().mockResolvedValue('<html>unused</html>'),
      } as never,
      connectionId: 'connection-2',
      label: 'Wait timeout',
      onError,
    });

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(debugInfo).toBe('');
  });
});

describe('createPlaywrightConnectionTestFailWithDebug', () => {
  let originalCwd: string;
  let testDir: string;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00.000Z'));
    originalCwd = process.cwd();
    testDir = await mkdtemp(path.join(os.tmpdir(), 'playwright-connection-test-fail-'));
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
    vi.useRealTimers();
  });

  it('appends debug details before delegating to the provided fail handler', async () => {
    const fail = vi.fn().mockRejectedValue(new Error('failure'));
    const failWithDebug = createPlaywrightConnectionTestFailWithDebug({
      page: {
        screenshot: vi.fn().mockImplementation(async ({ path: filePath }: { path: string }) => {
          await writeFile(filePath, 'png');
        }),
        content: vi.fn().mockResolvedValue('<html>debug</html>'),
      } as never,
      connectionId: 'connection-3',
      fail,
    });

    await expect(failWithDebug('Login', 'Authentication failed', 401)).rejects.toThrow('failure');

    expect(fail).toHaveBeenCalledTimes(1);
    const [step, detail, status] = fail.mock.calls[0] ?? [];

    expect(step).toBe('Login');
    expect(status).toBe(401);
    expect(detail).toContain('Authentication failed\n\nDebug:\nScreenshot:');
    expect(detail).toContain(
      path.join('playwright-debug', 'connection-3-2026-04-10T12-00-00-000Z-login.png')
    );
  });
});
