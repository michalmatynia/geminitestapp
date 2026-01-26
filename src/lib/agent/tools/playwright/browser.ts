import { chromium, firefox, webkit } from "playwright";
import type { Browser, BrowserContext, Page } from "playwright";
import prisma from "@/lib/prisma";
import path from "path";
import { promises as fs } from "fs";
import { toDataUrl } from "../utils";

export const launchBrowser = async (
  browserName: string = "chromium",
  headless: boolean = true
) => {
  const browserType =
    browserName === "firefox"
      ? firefox
      : browserName === "webkit"
        ? webkit
        : chromium;
  return browserType.launch({ headless });
};

export const createBrowserContext = async (
  browser: Browser,
  runDir: string,
  videoSize = { width: 1280, height: 720 }
) => {
  return browser.newContext({
    viewport: videoSize,
    recordVideo: {
      dir: runDir,
      size: videoSize,
    },
  });
};

export const captureSessionContext = async (
  page: Page,
  context: BrowserContext,
  runId: string,
  label: string,
  log?: (level: string, message: string, metadata?: Record<string, unknown>) => Promise<void>,
  activeStepId?: string | null
) => {
  if (!page || !context) return;
  try {
    const cookies = await context.cookies();
    const cookieSummary = cookies.map((cookie) => ({
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

    await prisma.agentAuditLog.create({
      data: {
        runId,
        level: "info",
        message: "Captured session context.",
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
    if (log) {
      await log("info", "Captured session context.", {
        label,
        url: page.url(),
        title: await page.title(),
        cookies: cookieSummary,
        storage: storageSummary,
        stepId: activeStepId ?? null,
      });
    }
  } catch (error) {
    if (log) {
      await log("warning", "Failed to capture session context.", {
        label,
        error: error instanceof Error ? error.message : String(error),
        stepId: activeStepId ?? null,
      });
    }
  }
};

export const captureSnapshot = async (
  page: Page,
  runId: string,
  runDir: string,
  label: string,
  log?: (level: string, message: string, metadata?: Record<string, unknown>) => Promise<void>,
  activeStepId?: string | null
) => {
  if (!page) {
    return { domText: "", domHtml: "", url: "" };
  }
  const domHtml = await page.content();
  const domText = await page.evaluate(
    () => document.body?.innerText || document.documentElement?.innerText || ""
  );
  const title = await page.title();
  const snapshotUrl = page.url();
  const screenshotBuffer = await page.screenshot({ fullPage: true });
  const safeLabel = label.replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
  const screenshotFile = `snapshot-${Date.now()}-${safeLabel}.png`;
  const screenshotPath = path.join(runDir, screenshotFile);
  await fs.writeFile(screenshotPath, screenshotBuffer);
  const viewport = page.viewportSize();

  await prisma.agentBrowserSnapshot.create({
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
  });

  if (log) {
    await log("info", "Captured DOM snapshot.", {
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

  return { domText, domHtml, url: snapshotUrl };
};
