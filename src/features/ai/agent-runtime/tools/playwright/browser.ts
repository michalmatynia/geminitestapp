import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

import {
  getAgentAuditLogDelegate,
  getAgentBrowserSnapshotDelegate,
} from '@/features/ai/agent-runtime/store-delegates';

import { toDataUrl } from '../utils';

import type { Browser, BrowserContext, Page, Cookie } from 'playwright';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


type PlaywrightModule = {
  chromium: { launch: (opts: { headless: boolean }) => Promise<Browser> };
  firefox: { launch: (opts: { headless: boolean }) => Promise<Browser> };
  webkit: { launch: (opts: { headless: boolean }) => Promise<Browser> };
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const isBrowserType = (
  value: unknown
): value is { launch: (opts: { headless: boolean }) => Promise<Browser> } => {
  const record = asRecord(value);
  return record !== null && typeof record['launch'] === 'function';
};

const isPlaywrightModule = (value: unknown): value is PlaywrightModule => {
  const record = asRecord(value);
  return (
    record !== null &&
    isBrowserType(record['chromium']) &&
    isBrowserType(record['firefox']) &&
    isBrowserType(record['webkit'])
  );
};

const getPlaywright = async (): Promise<PlaywrightModule> => {
  const playwrightModule = await import('playwright');
  if (!isPlaywrightModule(playwrightModule)) {
    throw new Error('Playwright runtime is unavailable.');
  }
  return playwrightModule;
};

export const launchBrowser = async (
  browserName: string = 'chromium',
  headless: boolean = true
): Promise<Browser> => {
  const { chromium, firefox, webkit } = await getPlaywright();
  const browserType =
    browserName === 'firefox' ? firefox : browserName === 'webkit' ? webkit : chromium;
  return browserType.launch({ headless });
};

export const createBrowserContext = async (
  browser: Browser,
  runDir: string,
  videoSize: { width: number; height: number } = { width: 1280, height: 720 }
): Promise<BrowserContext> => {
  return browser.newContext({
    viewport: videoSize,
    recordVideo: {
      dir: runDir,
      size: videoSize,
    },
  });
};

export type CaptureOptions = {
  runId: string;
  label: string;
  log?: (level: string, message: string, metadata?: Record<string, unknown>) => Promise<void>;
  activeStepId?: string | null;
};

export const captureSessionContext = async (
  page: Page,
  context: BrowserContext,
  options: CaptureOptions
): Promise<void> => {
  if (!page || !context) return;
  const { runId, label, log, activeStepId } = options;
  const agentAuditLog = getAgentAuditLogDelegate();
  try {
    const cookies = await context.cookies();
    const cookieSummary = cookies.map((cookie: Cookie) => ({
      name: cookie.name,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      valueLength: cookie.value?.length ?? 0,
    }));

    const storageSummary = await page.evaluate(() => {
      const localKeys = Object.keys(localStorage ?? {});
      const sessionKeys = Object.keys(sessionStorage ?? {});
      return {
        localKeys,
        sessionKeys,
        localCount: localKeys.length,
        sessionCount: sessionKeys.length,
      };
    });

    if (agentAuditLog) {
      await agentAuditLog.create({
        data: {
          runId,
          level: 'info',
          message: 'Captured session context.',
          metadata: {
            label,
            url: page.url(),
            title: await page.title(),
            cookies: cookieSummary,
            storage: storageSummary,
            stepId: activeStepId ?? null,
          },
        },
      });
    }
    if (log) {
      await log('info', 'Captured session context.', {
        label,
        url: page.url(),
        title: await page.title(),
        cookies: cookieSummary,
        storage: storageSummary,
        stepId: activeStepId ?? null,
      });
    }
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (log) {
      await log('warning', 'Failed to capture session context.', {
        label,
        error: error instanceof Error ? error.message : String(error),
        stepId: activeStepId ?? null,
      });
    }
  }
};

export const captureSnapshot = async (
  page: Page,
  runDir: string,
  options: CaptureOptions
): Promise<{ id: string; domText: string; domHtml: string; url: string }> => {
  if (!page) {
    return { id: '', domText: '', domHtml: '', url: '' };
  }
  const { runId, label, log, activeStepId } = options;
  const agentBrowserSnapshot = getAgentBrowserSnapshotDelegate();
  const domHtml = await page.content();
  const domText = await page.evaluate(
    () => document.body?.innerText || document.documentElement?.innerText || ''
  );
  const title = await page.title();
  const snapshotUrl = page.url();
  const screenshotBuffer = await page.screenshot({ fullPage: true });
  const safeLabel = label.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
  const screenshotFile = `snapshot-${Date.now()}-${safeLabel}.png`;
  const screenshotPath = path.join(runDir, screenshotFile);
  await fs.writeFile(screenshotPath, screenshotBuffer);
  const viewport = page.viewportSize();

  const snapshot = agentBrowserSnapshot
    ? await agentBrowserSnapshot.create<{ id: string }>({
      data: {
        runId,
        url: snapshotUrl,
        title,
        domHtml,
        domText,
        screenshotData: toDataUrl(screenshotBuffer),
        screenshotPath: screenshotFile,
        stepId: activeStepId ?? null,
        mouseX: null,
        mouseY: null,
        viewportWidth: viewport?.width ?? null,
        viewportHeight: viewport?.height ?? null,
      },
    })
    : null;

  if (log) {
    await log('info', 'Captured DOM snapshot.', {
      label,
      screenshotFile,
      domTextLength: domText.length,
      domHtmlLength: domHtml.length,
      stepId: activeStepId ?? null,
    });
  }

  // Note: collectUiInventory and captureSessionContext calls removed from here
  // to avoid circular dependency and keep functions focused.
  // Caller should call them if needed.

  return { id: snapshot?.id ?? '', domText, domHtml, url: snapshotUrl };
};
