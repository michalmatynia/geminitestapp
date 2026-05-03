import 'server-only';

import { mkdir, readdir, stat, unlink, writeFile } from 'fs/promises';
import path from 'path';

import type { Page } from 'playwright';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type ConnectionTestDebugLogger = (error: unknown) => void;

export const capturePlaywrightConnectionTestDebugArtifacts = async (input: {
  page: Page;
  connectionId: string;
  label: string;
  onError?: ConnectionTestDebugLogger;
}): Promise<string> => {
  try {
    const now = new Date().toISOString().replace(/[:.]/g, '-');
    const safeLabel = input.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 40);
    const baseDir = path.join(process.cwd(), 'playwright-debug');
    await mkdir(baseDir, { recursive: true });
    try {
      const entries = await readdir(baseDir);
      const cutoff = Date.now() - THIRTY_DAYS_MS;
      await Promise.all(
        entries.map(async (entry) => {
          const entryPath = path.join(baseDir, entry);
          const info = await stat(entryPath);
          if (info.mtimeMs < cutoff) {
            await unlink(entryPath);
          }
        })
      );
    } catch (error) {
      input.onError?.(error);
      // best-effort cleanup only
    }
    const prefix = `${input.connectionId}-${now}-${safeLabel || 'debug'}`;
    const screenshotPath = path.join(baseDir, `${prefix}.png`);
    const htmlPath = path.join(baseDir, `${prefix}.html`);
    await input.page
      .screenshot({ path: screenshotPath, fullPage: true })
      .catch(() => undefined);
    const html = await input.page.content().catch(() => '');
    if (html) {
      await writeFile(htmlPath, html, 'utf8');
    }
    return `Screenshot: ${screenshotPath}\nHTML: ${htmlPath}`;
  } catch (error) {
    input.onError?.(error);
    return '';
  }
};

export const createPlaywrightConnectionTestFailWithDebug = (input: {
  page: Page;
  connectionId: string;
  fail: (step: string, detail: string, status?: number) => Promise<never>;
  onError?: ConnectionTestDebugLogger;
}) => {
  return async (step: string, detail: string, status = 400): Promise<never> => {
    const debugInfo = await capturePlaywrightConnectionTestDebugArtifacts({
      page: input.page,
      connectionId: input.connectionId,
      label: step,
      ...(input.onError ? { onError: input.onError } : {}),
    });
    const combined = debugInfo ? `${detail}\n\nDebug:\n${debugInfo}` : detail;
    return input.fail(step, combined, status);
  };
};
