export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getIntegrationRepository } from "@/features/integrations/server";
import { decryptSecret, encryptSecret } from "@/features/integrations/server";
import { chromium, devices } from "playwright";
import { mkdir, readdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import type {
  Browser,
  BrowserContext,
  Page,
  BrowserContextOptions
} from "playwright";
import { mapStatusToAppError } from "@/shared/errors/error-mapper";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

type TestLogEntry = {
  step: string;
  status: "pending" | "ok" | "failed";
  timestamp: string;
  detail: string;
};

/**
 * POST /api/integrations/[id]/connections/[connectionId]/test
 * Performs a lightweight credential check for the integration connection.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string; connectionId: string }): Promise<Response> {
  let integrationId: string | null = null;
  let integrationConnectionId: string | null = null;
  const steps: TestLogEntry[] = [];
  
  const pushStep = (
    step: string,
    status: "pending" | "ok" | "failed",
    detail: string
  ) => {
    steps.push({
      step,
      status,
      detail,
      timestamp: new Date().toISOString()
    });
  };

  const fail = async (step: string, detail: string, status = 400) => {
    const safeDetail = detail?.trim() ? detail : "Unknown error";
    pushStep(step, "failed", safeDetail);
    
    throw mapStatusToAppError(safeDetail, status);
  };

  const { id, connectionId } = params;
  integrationId = id;
  integrationConnectionId = connectionId;
  if (!integrationId || !integrationConnectionId) {
    return fail("Loading connection", "Integration id and connection id are required", 400);
  }

  pushStep("Loading connection", "pending", "Fetching stored credentials");
  const repo = await getIntegrationRepository();
  const connection = await repo.getConnectionByIdAndIntegration(connectionId, id);

  if (!connection) {
    return fail("Loading connection", "Connection not found", 404);
  }
  pushStep("Loading connection", "ok", "Connection loaded");

  const integration = await repo.getIntegrationById(id);

  if (!integration) {
    return fail("Loading integration", "Integration not found", 404);
  }

  if (integration.slug === "baselinker") {
    // Redirect to Base-specific test endpoint
    const baseTestUrl = `/api/integrations/${id}/connections/${connectionId}/base/test`;
    return NextResponse.json(
      {
        error: `Please use the Base.com-specific test endpoint: POST ${baseTestUrl}`,
        redirectUrl: baseTestUrl
      },
      { status: 400 }
    );
  }

  if (integration.slug !== "tradera") {
    return fail(
      "Connection test",
      `${integration.name} connection tests are not configured yet.`,
      400
    );
  }

  // Decrypt to ensure credentials are readable with the configured key.
  pushStep(
    "Decrypting credentials",
    "pending",
    "Validating encryption key and decrypting password"
  );
  const decryptedPassword = decryptSecret(connection.password);
  pushStep("Decrypting credentials", "ok", "Password decrypted successfully");

  const storedState = null;

  if (connection.playwrightStorageState) {
    pushStep(
      "Loading session",
      "pending",
      "Loading stored Playwright session"
    );
    try {
      const raw = decryptSecret(connection.playwrightStorageState);
      const parsed = JSON.parse(raw) as { cookies?: unknown[]; origins?: unknown[] };

      // minimal validation so TS + runtime both stay sane
      if (Array.isArray(parsed.cookies) && Array.isArray(parsed.origins)) {
        pushStep("Loading session", "ok", "Stored session loaded");
      } else {
        pushStep(
          "Loading session",
          "failed",
          "Stored session has invalid shape"
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      pushStep(
        "Loading session",
        "failed",
        `Failed to load session: ${message}`
      );
    }
  }

  const headless = connection.playwrightHeadless ?? true;
  const slowMo = connection.playwrightSlowMo ?? 0;
  const defaultTimeout = connection.playwrightTimeout ?? 15000;
  const navigationTimeout = connection.playwrightNavigationTimeout ?? 30000;
  const humanizeMouse = connection.playwrightHumanizeMouse ?? false;
  const mouseJitter = Math.max(0, connection.playwrightMouseJitter ?? 0);
  const clickDelayMin = Math.max(0, connection.playwrightClickDelayMin ?? 0);
  const clickDelayMax = Math.max(
    clickDelayMin,
    connection.playwrightClickDelayMax ?? clickDelayMin
  );
  const inputDelayMin = Math.max(0, connection.playwrightInputDelayMin ?? 0);
  const inputDelayMax = Math.max(
    inputDelayMin,
    connection.playwrightInputDelayMax ?? inputDelayMin
  );
  const actionDelayMin = Math.max(0, connection.playwrightActionDelayMin ?? 0);
  const actionDelayMax = Math.max(
    actionDelayMin,
    connection.playwrightActionDelayMax ?? actionDelayMin
  );
  const proxyEnabled = connection.playwrightProxyEnabled ?? false;
  const proxyServer = connection.playwrightProxyServer?.trim() ?? "";
  const proxyUsername = connection.playwrightProxyUsername?.trim() ?? "";
  let proxyPassword = "";
  if (connection.playwrightProxyPassword) {
    try {
      proxyPassword = decryptSecret(connection.playwrightProxyPassword);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      pushStep(
        "Proxy setup",
        "failed",
        `Failed to decrypt proxy password: ${message}`
      );
    }
  }
  const emulateDevice = connection.playwrightEmulateDevice ?? false;
  const deviceName = connection.playwrightDeviceName ?? "";

  if (proxyEnabled && !proxyServer) {
    return fail(
      "Proxy setup",
      "Proxy is enabled but no proxy server is set."
    );
  }
  if (proxyEnabled && proxyServer) {
    pushStep("Proxy setup", "ok", `Using proxy ${proxyServer}`);
  }

  const deviceProfile =
    emulateDevice && deviceName && devices[deviceName]
      ? devices[deviceName]
      : null;
  if (emulateDevice && deviceName && !deviceProfile) {
    pushStep(
      "Device emulation",
      "failed",
      `Unknown device profile: ${deviceName}`
    );
  } else if (emulateDevice && deviceProfile) {
    pushStep("Device emulation", "ok", `Using ${deviceName}`);
  }
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  try {
    try {
      pushStep(
        "Launching Playwright",
        "pending",
        `Starting Chromium (headless=${headless ? "on" : "off"}, slowMo=${slowMo}ms)`
      );
      browser = await chromium.launch({
        headless,
        slowMo,
        ...(proxyEnabled && proxyServer
          ? {
              proxy: {
                server: proxyServer,
                ...(proxyUsername && { username: proxyUsername }),
                ...(proxyPassword && { password: proxyPassword })
              }
            }
          : {})
      });

      const deviceContextOptions: BrowserContextOptions = deviceProfile
        ? (({ defaultBrowserType: _ignore, ...rest }) => rest)(deviceProfile)
        : {};

      const contextOptions: BrowserContextOptions = {
        ...deviceContextOptions,
        ...(storedState ? { storageState: storedState } : {})
      };

      context = await browser.newContext(contextOptions);
      context.setDefaultTimeout(defaultTimeout);
      context.setDefaultNavigationTimeout(navigationTimeout);
      page = await context.newPage();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return fail("Launching Playwright", message);
    }
    
    const randomBetween = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;
    const safeWaitForSelector = async (
      selector: string,
      options: Parameters<NonNullable<typeof page>["waitForSelector"]>[1],
      label: string
    ) => {
      if (!page) throw new Error("Browser page not initialized");
      try {
        return await page.waitForSelector(selector, options);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`${label} wait failed: ${message}`);
      }
    };
    const safeWaitFor = async (
      locator: ReturnType<NonNullable<typeof page>["locator"]>,
      options: Parameters<ReturnType<NonNullable<typeof page>["locator"]>["waitFor"]>[0],
      label: string
    ) => {
      try {
        return await locator.waitFor(options);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`${label} wait failed: ${message}`);
      }
    };
    const safeCount = async (
      locator: ReturnType<NonNullable<typeof page>["locator"]>,
      label: string
    ) => {
      try {
        return await locator.count();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`${label} count failed: ${message}`);
      }
    };
    const safeIsVisible = async (
      locator: ReturnType<NonNullable<typeof page>["locator"]>,
      label: string
    ) => {
      try {
        return await locator.isVisible();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`${label} visibility check failed: ${message}`);
      }
    };
    const safeInnerText = async (
      locator: ReturnType<NonNullable<typeof page>["locator"]>,
      label: string
    ) => {
      try {
        return await locator.innerText();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`${label} text read failed: ${message}`);
      }
    };
    const safeGoto = async (
      url: string,
      options: Parameters<NonNullable<typeof page>["goto"]>[1],
      label: string
    ) => {
      if (!page) throw new Error("Browser page not initialized");
      try {
        return await page.goto(url, options);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`${label} navigation failed: ${message}`);
      }
    };
    const safeWaitForLoadState = async (
      state: Parameters<NonNullable<typeof page>["waitForLoadState"]>[0],
      options: Parameters<NonNullable<typeof page>["waitForLoadState"]>[1],
      label: string
    ) => {
      if (!page) throw new Error("Browser page not initialized");
      try {
        return await page.waitForLoadState(state, options);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`${label} load state failed: ${message}`);
      }
    };
    const captureDebugArtifacts = async (label: string) => {
      if (!page) return "";
      try {
        const now = new Date().toISOString().replace(/[:.]/g, "-");
        const safeLabel = label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 40);
        const baseDir = path.join(process.cwd(), "playwright-debug");
        await mkdir(baseDir, { recursive: true });
        try {
          const entries = await readdir(baseDir);
          const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
          await Promise.all(
            entries.map(async (entry) => {
              const entryPath = path.join(baseDir, entry);
              const info = await stat(entryPath);
              if (info.mtimeMs < cutoff) {
                await unlink(entryPath);
              }
            })
          );
        } catch {
          // best-effort cleanup only
        }
        const prefix = `${connection.id}-${now}-${safeLabel || "debug"}`;
        const screenshotPath = path.join(baseDir, `${prefix}.png`);
        const htmlPath = path.join(baseDir, `${prefix}.html`);
        await page
          .screenshot({ path: screenshotPath, fullPage: true })
          .catch(() => undefined);
        const html = await page.content().catch(() => "");
        if (html) {
          await writeFile(htmlPath, html, "utf8");
        }
        return `Screenshot: ${screenshotPath}\nHTML: ${htmlPath}`;
      } catch {
        return "";
      }
    };
    const failWithDebug = async (
      step: string,
      detail: string,
      status = 400
    ) => {
      const debugInfo = await captureDebugArtifacts(step);
      const combined = debugInfo
        ? `${detail}\n\nDebug:\n${debugInfo}`
        : detail;
      return fail(step, combined, status);
    };
    const humanizedPause = async (
      min = actionDelayMin,
      max = actionDelayMax
    ) => {
      if (!humanizeMouse || !page) return;
      const delay = randomBetween(min, max);
      if (delay > 0) {
        await page.waitForTimeout(delay);
      }
    };
    const humanizedClick = async (
      locator: ReturnType<NonNullable<typeof page>["locator"]>
    ) => {
      if (!humanizeMouse) {
        await locator.click();
        return;
      }
      if (!page) {
        await locator.click();
        return;
      }
      const box = await locator.boundingBox();
      if (!box) {
        await locator.click();
        return;
      }
      const offsetX = randomBetween(-mouseJitter, mouseJitter);
      const offsetY = randomBetween(-mouseJitter, mouseJitter);
      const targetX = box.x + box.width / 2 + offsetX;
      const targetY = box.y + box.height / 2 + offsetY;
      const steps = randomBetween(8, 18);
      await page.mouse.move(targetX, targetY, { steps });
      const delay = randomBetween(clickDelayMin, clickDelayMax);
      await page.mouse.click(targetX, targetY, { delay });
    };
    const humanizedFill = async (
      locator: ReturnType<NonNullable<typeof page>["locator"]>,
      value: string
    ) => {
      await locator.fill(value);
      if (!humanizeMouse || !page) return;
      const delay = randomBetween(inputDelayMin, inputDelayMax);
      if (delay > 0) {
        await page.waitForTimeout(delay);
      }
    };
    const successSelector = [
      'a[href*="logout"]',
      'a:has-text("Logga ut")',
      'a:has-text("Logout")',
      'a:has-text("Mina sidor")',
      'a:has-text("My pages")',
      'button[aria-label*="Account"]',
      'button[aria-label*="Profile"]',
      'a[href*="/profile"]',
      'a[href*="/my"]'
    ].join(", ");
    const errorSelector = [
      '[data-testid*="error"]',
      '[data-test*="error"]',
      '[role="alert"]',
      ".alert",
      ".form-error",
      ".error",
      ".text-red-500"
    ].join(", ");

    let sessionReused = false;
    if (storedState) {
      pushStep("Reusing session", "pending", "Checking existing session");
      try {
        await safeGoto(
          "https://www.tradera.com/en",
          {
            waitUntil: "domcontentloaded",
            timeout: 30000
          },
          "Session check"
        );
        await humanizedPause();
        if (!page) throw new Error("Page not found");
        const loggedIn = await safeIsVisible(
          page.locator(successSelector).first(),
          "Session check"
        ).catch(() => false);
        if (loggedIn) {
          pushStep("Reusing session", "ok", "Session still valid");
          sessionReused = true;
        } else {
          pushStep("Reusing session", "failed", "Session invalid or expired");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        pushStep(
          "Reusing session",
          "failed",
          `Failed to check session: ${message}`
        );
      }
    }

    const loginUrls = [
      "https://www.tradera.com/login",
      "https://www.tradera.com/en/login",
      "https://www.tradera.com/en"
    ];
    const openLoginPage = async () => {
      if (!page) throw new Error("Page not found");
      for (const url of loginUrls) {
        pushStep("Opening login page", "pending", url);
        try {
          await safeGoto(
            url,
            { waitUntil: "domcontentloaded", timeout: 30000 },
            "Opening login page"
          );
          await safeWaitForLoadState(
            "networkidle",
            { timeout: 15000 },
            "Opening login page"
          ).catch(() => undefined);
          await humanizedPause();
          const formLocator = page.locator("#sign-in-form").first();
          if ((await safeCount(formLocator, "Login form")) > 0) {
            pushStep("Opening login page", "ok", `Login page loaded: ${url}`);
            return url;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          pushStep(
            "Opening login page",
            "failed",
            `${url} failed: ${message}`
          );
        }
      }
      return loginUrls[loginUrls.length - 1]!;
    };
    const loginUrl = sessionReused ? loginUrls[0]! : await openLoginPage();

    const formSelector = [
      "#sign-in-form",
      'form[data-sign-in-form="true"]',
      'form[data-sentry-component="LoginForm"]'
    ].join(", ");
    const emailSelector = '#email, input[name="email"], input[type="email"]';
    const passwordSelector =
      '#password, input[name="password"], input[type="password"]';

    const findInput = async (selectors: string[]) => {
      if (!page) throw new Error("Page not found");
      for (const selector of selectors) {
        const locator = page.locator(selector).first();
        if ((await safeCount(locator, `Find input ${selector}`)) > 0) {
          const visible = await safeIsVisible(
            locator,
            `Find input ${selector}`
          ).catch(() => false);
          if (visible) {
            return { selector, locator };
          }
        }
      }
      return null;
    };

    if (!sessionReused) {
      pushStep("Locating login form", "pending", "Waiting for sign-in form");
      try {
        await safeWaitForSelector(
          formSelector,
          { state: "attached", timeout: 15000 },
          "Login form"
        );
        if (!page) throw new Error("Page not found");
        const formLocator = page.locator(formSelector).first();
        const isVisible = await safeIsVisible(
          formLocator,
          "Login form"
        ).catch(() => false);
        if (!isVisible) {
          throw new Error("Login form not visible yet");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        pushStep(
          "Locating login form",
          "failed",
          `Form not ready: ${message}`
        );
        if (!page) throw new Error("Page not found");
        const signInTrigger = page
          .locator(
            [
              'a:has-text("Sign in")',
              'button:has-text("Sign in")',
              'a:has-text("Logga in")',
              'button:has-text("Logga in")',
              'a[href*="/login"]',
              'a[href*="login"]',
              'button[aria-label*="Sign in"]',
              'button[aria-label*="Logga in"]'
            ].join(", ")
          )
          .first();
        if ((await safeCount(signInTrigger, "Sign-in trigger")) > 0) {
          pushStep("Locating login form", "pending", "Opening sign-in modal");
          try {
            await humanizedClick(signInTrigger);
            await humanizedPause();
          } catch (clickError) {
            const clickMessage =
              clickError instanceof Error
                ? clickError.message
                : "Unknown error";
            pushStep(
              "Locating login form",
              "failed",
              `Failed to open sign-in modal: ${clickMessage}`
            );
          }
        }
        try {
          await safeWaitForSelector(
            formSelector,
            { state: "attached", timeout: 20000 },
            "Login form"
          );
          await safeWaitFor(
            page.locator(formSelector).first(),
            { state: "visible", timeout: 20000 },
            "Login form"
          );
        } catch (waitError) {
          const waitMessage =
            waitError instanceof Error ? waitError.message : "Unknown error";
          return await failWithDebug(
            "Locating login form",
            `Form still not visible: ${waitMessage}`
          );
        }
      }
      try {
        if (!page) throw new Error("Page not found");
        await safeWaitFor(
          page.locator(emailSelector).first(),
          { state: "visible", timeout: 15000 },
          "Email field"
        );
        await safeWaitFor(
          page.locator(passwordSelector).first(),
          { state: "visible", timeout: 15000 },
          "Password field"
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return await failWithDebug(
          "Locating login form",
          `Input fields not visible: ${message}`
        );
      }
      pushStep("Locating login form", "ok", "Sign-in form detected");

      pushStep("Filling credentials", "pending", "Locating login fields");
      const usernameSelectors = [
        "#email",
        'input[name="email"]',
        'input[type="email"]'
      ];
      const passwordSelectors = [
        "#password",
        'input[type="password"]',
        'input[name="password"]'
      ];

      const findInputInForm = async (selectors: string[]) => {
        if (!page) throw new Error("Page not found");
        for (const selector of selectors) {
          const locator = page.locator(formSelector).first().locator(selector).first();
          if ((await safeCount(locator, `Find form input ${selector}`)) > 0) {
            const visible = await safeIsVisible(
              locator,
              `Find form input ${selector}`
            ).catch(() => false);
            if (visible) {
              return { selector, locator };
            }
          }
        }
        return null;
      };

      const usernameField = await findInputInForm(usernameSelectors);
      const passwordField = await findInputInForm(passwordSelectors);
      if (!usernameField || !passwordField) {
        return await failWithDebug(
          "Filling credentials",
          "Login fields not found on Tradera page"
        );
      }
      try {
        await humanizedFill(usernameField.locator, connection.username);
        await humanizedFill(passwordField.locator, decryptedPassword);
        await humanizedPause();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return await failWithDebug(
          "Filling credentials",
          `Failed to fill fields: ${message}`
        );
      }
      pushStep(
        "Filling credentials",
        "ok",
        `Filled fields (${usernameField.selector}, ${passwordField.selector})`
      );
    }

    if (!sessionReused) {
      pushStep("Submitting login", "pending", "Attempting to submit form");
      if (!page) throw new Error("Page not found");
      const stayLoggedIn = page
        .locator('input[name="keepMeLoggedIn"]')
        .first();
      try {
        if ((await safeCount(stayLoggedIn, "Stay logged in")) > 0) {
          const isChecked = await stayLoggedIn.isChecked().catch(() => false);
          if (!isChecked) {
            await humanizedClick(stayLoggedIn);
            await humanizedPause();
            pushStep("Keep me logged in", "ok", "Enabled stay logged in");
          } else {
            pushStep("Keep me logged in", "ok", "Already enabled");
          }
        } else {
          pushStep("Keep me logged in", "failed", "Checkbox not found");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        pushStep("Keep me logged in", "failed", `Checkbox error: ${message}`);
      }
      const submitSelectors = [
        'button[data-login-submit="true"]',
        '#sign-in-form button[type="submit"]',
        'button:has-text("Sign in")',
        'button:has-text("Logga in")'
      ];
      const submitButton = await findInput(submitSelectors);
      if (!submitButton) {
        return await failWithDebug(
          "Submitting login",
          "Submit button not found"
        );
      }
      try {
        await Promise.allSettled([
          page.waitForNavigation({
            waitUntil: "domcontentloaded",
            timeout: 15000
          }),
          humanizedClick(submitButton.locator)
        ]);
        await humanizedPause();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return await failWithDebug(
          "Submitting login",
          `Submit failed: ${message}`
        );
      }
      pushStep("Submitting login", "ok", `Clicked ${submitButton.selector}`);

      try {
        if (!page) throw new Error("Page not found");
        await page.waitForTimeout(1000);
        const postSubmitUrl = page.url();
        const postSubmitError = await safeInnerText(
          page.locator(errorSelector).first(),
          "Post-submit error"
        ).catch(() => "");
        const postSubmitDetail = `URL: ${postSubmitUrl}${
          postSubmitError?.trim()
            ? `\nError: ${postSubmitError}`
            : "\nError: (none visible)"
        }`;
        pushStep("Post-submit debug", "ok", postSubmitDetail);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        pushStep("Post-submit debug", "failed", `Debug failed: ${message}`);
      }

      const captchaHints = [
        "captcha",
        "recaptcha",
        "fylla i captcha",
        "captcha:n"
      ];
      try {
        if (!page) throw new Error("Page not found");
        const postSubmitErrorLower = (
          await safeInnerText(
            page.locator(errorSelector).first(),
            "Post-submit error"
          ).catch(() => "")
        ).toLowerCase();
        const captchaDetected = captchaHints.some((hint) =>
          postSubmitErrorLower.includes(hint)
        );
        if (captchaDetected) {
          pushStep(
            "Captcha required",
            "pending",
            "Solve the captcha in the opened browser window to continue."
          );
          const captchaResult = await Promise.race([
            safeWaitFor(
              page.locator(successSelector).first(),
              { state: "visible", timeout: 120000 },
              "Captcha success"
            ).then(() => "success"),
            safeWaitFor(
              page.locator(formSelector).first(),
              { state: "hidden", timeout: 120000 },
              "Captcha form hide"
            ).then(() => "form-hidden")
          ]).catch(() => "timeout");

          if (captchaResult === "timeout") {
            return await failWithDebug(
              "Captcha required",
              "Captcha not solved within 2 minutes."
            );
          }
          pushStep("Captcha required", "ok", "Captcha solved.");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        pushStep(
          "Captcha required",
          "failed",
          `Captcha check failed: ${message}`
        );
      }

      pushStep(
        "Verifying session",
        "pending",
        "Checking for logged-in state"
      );
      try {
        if (!page) throw new Error("Page not found");
        const formLocator = page.locator(formSelector).first();
        const result = await Promise.race([
          safeWaitFor(
            page.locator(successSelector).first(),
            { state: "visible", timeout: 12000 },
            "Login success"
          ).then(() => "success"),
          safeWaitFor(
            formLocator,
            { state: "hidden", timeout: 12000 },
            "Login form hide"
          ).then(() => "form-hidden"),
          safeWaitFor(
            page.locator(errorSelector).first(),
            { state: "visible", timeout: 12000 },
            "Login error"
          ).then(() => "error")
        ]).catch(() => "timeout");

        if (result === "error") {
          const errorText = await safeInnerText(
            page.locator(errorSelector).first(),
            "Login error"
          ).catch(() => "Login error displayed.");
          const safeErrorText = errorText?.trim()
            ? errorText
            : "Login error displayed but no message was found.";
          return await failWithDebug("Verifying session", safeErrorText);
        }

        if (result === "timeout") {
          const currentUrl = page.url();
          const hint =
            currentUrl === loginUrl || currentUrl.includes("/login")
              ? "Still on login page (invalid credentials, CAPTCHA, or extra verification required)."
              : `Current URL: ${currentUrl}`;
          return await failWithDebug(
            "Verifying session",
            `Login verification timed out. ${hint}`
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return await failWithDebug(
          "Verifying session",
          `Verification failed: ${message}`
        );
      }
    } else {
      pushStep("Verifying session", "ok", "Session restored from storage");
    }

    pushStep(
      "Saving session",
      "pending",
      "Storing Playwright session cookies"
    );
    try {
      if (!page) throw new Error("Page not found");
      const storageStateResult = await page.context().storageState();
      await repo.updateConnection(connection.id, {
        playwrightStorageState: encryptSecret(JSON.stringify(storageStateResult)),
        playwrightStorageStateUpdatedAt: new Date()
      });
      pushStep("Saving session", "ok", "Session stored for reuse");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      pushStep(
        "Saving session",
        "failed",
        `Failed to store session: ${message}`
      );
    }

    pushStep("Verifying session", "ok", "Login appears successful");
  } finally {
    await page?.close().catch(() => undefined);
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }

  return NextResponse.json({ ok: true, steps });
}

export const POST = apiHandlerWithParams<{ id: string; connectionId: string }>(
  POST_handler,
  { source: "integrations.[id].connections.[connectionId].test.POST", requireCsrf: false }
);