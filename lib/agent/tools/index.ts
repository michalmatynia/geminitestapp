import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { chromium, firefox, webkit } from "playwright";
import type { Browser, BrowserContext, Page } from "playwright";

export type AgentToolRequest = {
  name: "playwright";
  input: {
    prompt?: string;
    browser?: string;
    runId?: string;
    runHeadless?: boolean;
    stepId?: string;
    stepLabel?: string;
  };
};

type ToolOutput = {
  url?: string;
  domText?: string;
  snapshotId?: string | null;
  logCount?: number | null;
};

export type AgentToolResult = {
  ok: boolean;
  output?: ToolOutput;
  error?: string;
  errorId?: string;
};

type AgentControlAction = "goto" | "reload" | "snapshot";

const extractTargetUrl = (prompt?: string) => {
  if (!prompt) return null;
  const urlMatch = prompt.match(/https?:\/\/[^\s)]+/i);
  if (urlMatch) return urlMatch[0];
  if (/base\.com/i.test(prompt)) {
    return "https://base.com";
  }
  return null;
};

const parseCredentials = (prompt?: string) => {
  if (!prompt) return null;
  const emailMatch = prompt.match(/email\s*[:=]\s*([^\s]+)/i);
  const userMatch = prompt.match(/(?:username|user|login)\s*[:=]\s*([^\s]+)/i);
  const passMatch = prompt.match(/(?:password|pass|pwd)\s*[:=]\s*([^\s]+)/i);
  const email = emailMatch?.[1];
  const username = userMatch?.[1];
  const password = passMatch?.[1];
  if (!password || (!email && !username)) return null;
  return { email, username, password };
};

const toDataUrl = (buffer: Buffer) =>
  `data:image/png;base64,${buffer.toString("base64")}`;

const safeText = (value: string | null | undefined) => value ?? "";

export async function runAgentTool(request: AgentToolRequest): Promise<AgentToolResult> {
  const { runId, prompt, browser, runHeadless, stepId, stepLabel } = request.input;
  const debugEnabled = process.env.DEBUG_CHATBOT === "true";
  if (!runId) {
    return { ok: false, error: "Missing runId for tool execution." };
  }

  if (!("agentBrowserLog" in prisma) || !("agentBrowserSnapshot" in prisma)) {
    return {
      ok: false,
      error: "Agent browser tables not initialized. Run prisma generate/db push.",
    };
  }

  try {
    const targetUrl = extractTargetUrl(prompt) ?? "about:blank";
    const browserType =
      browser === "firefox" ? firefox : browser === "webkit" ? webkit : chromium;

    let launch: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let videoPath: string | null = null;
    const runDir = path.join(process.cwd(), "tmp", "chatbot-agent", runId);
    await fs.mkdir(runDir, { recursive: true });

    launch = await browserType.launch({
      headless: runHeadless ?? true,
    });

    const activeStepId = stepId ?? null;
    const log = async (
      level: string,
      message: string,
      metadata?: Record<string, unknown>
    ) => {
      await prisma.agentBrowserLog.create({
        data: {
          runId,
          stepId: activeStepId,
          level,
          message,
          metadata,
        },
      });
    };

    context = await launch.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: runDir,
        size: { width: 1280, height: 720 },
      },
    });
    page = await context.newPage();
    if (!page) {
      throw new Error("Failed to initialize Playwright page.");
    }

    page.on("console", async (msg) => {
      const type = msg.type();
      await log(type === "error" ? "error" : "info", `[console:${type}] ${msg.text()}`);
    });
    page.on("pageerror", async (err) => {
      await log("error", `Page error: ${err.message}`);
    });
    page.on("requestfailed", async (req) => {
      await log("warning", `Request failed: ${req.url()}`, {
        error: req.failure()?.errorText,
      });
    });

    await log("info", "Playwright tool started.", {
      browser: browser || "chromium",
      runHeadless: runHeadless ?? true,
      targetUrl,
    });

    const captureSnapshot = async (label: string, activeStepId?: string) => {
      if (!page) {
        return { domText: "", url: "" };
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

      await log("info", "Captured DOM snapshot.", {
        label,
        screenshotFile,
        stepId: activeStepId ?? null,
      });
      return { domText, url: snapshotUrl };
    };

    const findFirstVisible = async (locator: ReturnType<Page["locator"]>) => {
      const count = await locator.count();
      for (let i = 0; i < count; i += 1) {
        const candidate = locator.nth(i);
        if (await candidate.isVisible()) {
          return candidate;
        }
      }
      return null;
    };

    let domText = "";
    let finalUrl = targetUrl;
    try {
      if (targetUrl !== "about:blank") {
        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      } else {
        await page.setContent(
          `<html><head><title>Agent preview</title></head><body><h1>Agent browser</h1><p>${safeText(
            prompt
          )}</p></body></html>`
        );
      }

      const initialSnapshot = await captureSnapshot(
        stepLabel ? `step-${stepLabel}` : "initial",
        stepId
      );
      domText = initialSnapshot.domText;
      finalUrl = initialSnapshot.url;

      const credentials = parseCredentials(prompt);
      if (credentials) {
        await log("info", "Detected login credentials.", {
          email: credentials.email ? "[redacted]" : null,
          username: credentials.username ? "[redacted]" : null,
        });
        const emailInput = await findFirstVisible(
          page.locator(
            'input[type="email"], input[name*="email" i], input[autocomplete*="email" i]'
          )
        );
        const usernameInput =
          emailInput ??
          (await findFirstVisible(
            page.locator(
              'input[name*="user" i], input[name*="login" i], input[autocomplete*="username" i], input[type="text"]'
            )
          ));
        const passwordInput = await findFirstVisible(
          page.locator(
            'input[type="password"], input[name*="pass" i], input[autocomplete*="current-password" i]'
          )
        );

        if (usernameInput && (credentials.email || credentials.username)) {
          const value = credentials.email ?? credentials.username ?? "";
          await usernameInput.fill(value);
          await log("info", "Filled username/email field.");
        } else {
          await log("warning", "No visible username/email field found.");
        }

        if (passwordInput) {
          await passwordInput.fill(credentials.password);
          await log("info", "Filled password field.");
        } else {
          await log("warning", "No visible password field found.");
        }

        const submitButton = await findFirstVisible(
          page.locator(
            'button[type="submit"], input[type="submit"], button:has-text("Log in"), button:has-text("Sign in"), button:has-text("Continue")'
          )
        );
        if (submitButton) {
          await submitButton.click();
          await log("info", "Submitted login form.");
        } else if (passwordInput) {
          await passwordInput.press("Enter");
          await log("info", "Submitted login form with Enter.");
        } else {
          await log("warning", "No submit action performed.");
        }

        try {
          await Promise.race([
            page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 }),
            page.waitForTimeout(5000),
          ]);
        } catch {
          await log("warning", "Post-submit wait timed out.");
        }

        const postSnapshot = await captureSnapshot(
          stepLabel ? `step-${stepLabel}-after` : "after-login",
          stepId
        );
        domText = postSnapshot.domText;
        finalUrl = postSnapshot.url;
      } else {
        await log("info", "No credentials found in prompt. Navigation only.");
      }
    } finally {
      if (context) {
        await context.close();
      }
      if (launch) {
        await launch.close();
      }
      try {
        if (page?.video()) {
          const rawPath = await page.video()!.path();
          if (rawPath) {
            const recordingFile = "recording.webm";
            const targetPath = path.join(runDir, recordingFile);
            await fs.copyFile(rawPath, targetPath);
            await fs.unlink(rawPath).catch(() => undefined);
            videoPath = recordingFile;
          }
        }
      } catch (recordError) {
        if (debugEnabled) {
          console.error("[chatbot][agent][tool] Video capture failed", {
            runId,
            recordError,
          });
        }
      }
      if (videoPath) {
        try {
          await prisma.chatbotAgentRun.update({
            where: { id: runId },
            data: { recordingPath: videoPath },
          });
        } catch (updateError) {
          if (debugEnabled) {
            console.error("[chatbot][agent][tool] Recording update failed", {
              runId,
              updateError,
            });
          }
        }
      }
    }

    let latestSnapshotId: string | null = null;
    let logCount: number | null = null;
    try {
      if (stepId) {
        const latest = await prisma.agentBrowserSnapshot.findFirst({
          where: { runId, stepId },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        latestSnapshotId = latest?.id ?? null;
      } else {
        const latest = await prisma.agentBrowserSnapshot.findFirst({
          where: { runId },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        latestSnapshotId = latest?.id ?? null;
      }
      logCount = await prisma.agentBrowserLog.count({ where: { runId } });
    } catch {
      // ignore lookup failures
    }

    return {
      ok: true,
      output: {
        url: finalUrl,
        domText,
        snapshotId: latestSnapshotId,
        logCount,
      },
    };
  } catch (error) {
    const errorId = randomUUID();
    const message = error instanceof Error ? error.message : "Tool failed.";
    if (debugEnabled) {
      console.error("[chatbot][agent][tool] Failed", { runId, errorId, error });
    }
    try {
      await prisma.agentBrowserLog.create({
        data: {
          runId,
          level: "error",
          message,
          metadata: { errorId },
        },
      });
    } catch {
      // ignore logging failures
    }
    return {
      ok: false,
      error: message,
      errorId,
    };
  }
}

export async function runAgentBrowserControl({
  runId,
  action,
  url,
  stepId,
  stepLabel,
}: {
  runId: string;
  action: AgentControlAction;
  url?: string;
  stepId?: string;
  stepLabel?: string;
}): Promise<AgentToolResult> {
  const debugEnabled = process.env.DEBUG_CHATBOT === "true";
  if (!("agentBrowserLog" in prisma) || !("agentBrowserSnapshot" in prisma)) {
    return {
      ok: false,
      error: "Agent browser tables not initialized. Run prisma generate/db push.",
    };
  }

  let launch: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    const run = await prisma.chatbotAgentRun.findUnique({ where: { id: runId } });
    if (!run) {
      return { ok: false, error: "Agent run not found." };
    }

    const browserType =
      run.agentBrowser === "firefox"
        ? firefox
        : run.agentBrowser === "webkit"
          ? webkit
          : chromium;

    const runDir = path.join(process.cwd(), "tmp", "chatbot-agent", runId);
    await fs.mkdir(runDir, { recursive: true });

    const activeStepId = stepId ?? null;
    const log = async (
      level: string,
      message: string,
      metadata?: Record<string, unknown>
    ) => {
      await prisma.agentBrowserLog.create({
        data: {
          runId,
          stepId: activeStepId,
          level,
          message,
          metadata,
        },
      });
    };

    const latestSnapshot = await prisma.agentBrowserSnapshot.findFirst({
      where: { runId },
      orderBy: { createdAt: "desc" },
    });

    const targetUrl =
      action === "goto" && url?.trim()
        ? url.trim()
        : latestSnapshot?.url ?? null;

    if (!targetUrl && action !== "snapshot") {
      return { ok: false, error: "No target URL available for control action." };
    }

    launch = await browserType.launch({
      headless: run.runHeadless ?? true,
    });
    context = await launch.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();

    await log("info", "Agent control action started.", {
      action,
      url: targetUrl,
      browser: run.agentBrowser || "chromium",
    });

    if (targetUrl) {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (action === "reload") {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
      }
    } else {
      await page.setContent(
        `<html><head><title>Agent preview</title></head><body><h1>No target URL</h1></body></html>`
      );
    }

    const domHtml = await page.content();
    const domText = await page.evaluate(
      () => document.body?.innerText || document.documentElement?.innerText || ""
    );
    const title = await page.title();
    const snapshotUrl = page.url();
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    const safeLabel = stepLabel
      ? `step-${stepLabel}`.replace(/[^a-z0-9-_]/gi, "_").toLowerCase()
      : `control-${action}`;
    const screenshotFile = `snapshot-${Date.now()}-${safeLabel}.png`;
    const screenshotPath = path.join(runDir, screenshotFile);
    await fs.writeFile(screenshotPath, screenshotBuffer);
    const viewport = page.viewportSize();

    const createdSnapshot = await prisma.agentBrowserSnapshot.create({
      data: {
        runId,
        url: snapshotUrl,
        title,
        domHtml,
        domText,
        screenshotData: toDataUrl(screenshotBuffer),
        screenshotPath: screenshotFile,
        stepId: stepId ?? null,
        mouseX: null,
        mouseY: null,
        viewportWidth: viewport?.width ?? null,
        viewportHeight: viewport?.height ?? null,
      },
    });

    await log("info", "Agent control snapshot captured.", {
      action,
      url: snapshotUrl,
      screenshotFile,
      stepId: stepId ?? null,
    });

    const logCount = await prisma.agentBrowserLog.count({ where: { runId } });
    return {
      ok: true,
      output: {
        url: snapshotUrl,
        snapshotId: createdSnapshot.id,
        logCount,
      },
    };
  } catch (error) {
    const errorId = randomUUID();
    const message = error instanceof Error ? error.message : "Control action failed.";
    if (debugEnabled) {
      console.error("[chatbot][agent][control] Failed", { runId, errorId, error });
    }
    try {
      await prisma.agentBrowserLog.create({
        data: {
          runId,
          level: "error",
          message,
          metadata: { errorId },
        },
      });
    } catch {
      // ignore logging failures
    }
    return { ok: false, error: message, errorId };
  } finally {
    if (context) {
      await context.close();
    }
    if (launch) {
      await launch.close();
    }
  }
}
