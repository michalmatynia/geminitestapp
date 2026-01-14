import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/utils/encryption";
import { chromium, devices } from "playwright";
import { randomUUID } from "crypto";
import { mkdir, readdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import type {
  Browser,
  BrowserContext,
  Page,
  BrowserContextOptions,
} from "playwright";

/**
 * POST /api/integrations/[id]/connections/[connectionId]/test
 * Performs a lightweight credential check for the integration connection.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  let integrationId: string | null = null;
  let integrationConnectionId: string | null = null;
  const steps: {
    step: string;
    status: "pending" | "ok" | "failed";
    timestamp: string;
    detail: string;
  }[] = [];
  const pushStep = (
    step: string,
    status: "pending" | "ok" | "failed",
    detail: string
  ) => {
    steps.push({
      step,
      status,
      detail,
      timestamp: new Date().toISOString(),
    });
  };

  const fail = (step: string, detail: string, status = 400) => {
    const errorId = randomUUID();
    const safeDetail = detail?.trim() ? detail : "Unknown error";
    pushStep(step, "failed", safeDetail);
    console.error("[integrations][connections][test] Failed", {
      errorId,
      integrationId,
      connectionId: integrationConnectionId,
      step,
      status,
      detail: safeDetail,
    });
    return NextResponse.json(
      {
        error: safeDetail,
        steps,
        errorId,
        integrationId,
        connectionId: integrationConnectionId,
      },
      { status }
    );
  };

  try {
    const { id, connectionId } = await params;
    integrationId = id;
    integrationConnectionId = connectionId;
    pushStep("Loading connection", "pending", "Fetching stored credentials");
    const connection = await prisma.integrationConnection.findFirst({
      where: { id: connectionId, integrationId: id },
    });

    if (!connection) {
      return fail("Loading connection", "Connection not found", 404);
    }
    pushStep("Loading connection", "ok", "Connection loaded");

    // Decrypt to ensure credentials are readable with the configured key.
    pushStep(
      "Decrypting credentials",
      "pending",
      "Validating encryption key and decrypting password"
    );
    const decryptedPassword = decryptSecret(connection.password);
    pushStep("Decrypting credentials", "ok", "Password decrypted successfully");

    const storedState: null = null;

    if (connection.playwrightStorageState) {
      pushStep(
        "Loading session",
        "pending",
        "Loading stored Playwright session"
      );
      try {
        const raw = decryptSecret(connection.playwrightStorageState);
        const parsed = JSON.parse(raw);

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

    const headless = connection.playwrightHeadless;
    const slowMo = connection.playwrightSlowMo;
    const defaultTimeout = connection.playwrightTimeout;
    const navigationTimeout = connection.playwrightNavigationTimeout;
    const humanizeMouse = connection.playwrightHumanizeMouse;
    const mouseJitter = Math.max(0, connection.playwrightMouseJitter);
    const clickDelayMin = Math.max(0, connection.playwrightClickDelayMin);
    const clickDelayMax = Math.max(
      clickDelayMin,
      connection.playwrightClickDelayMax
    );
    const inputDelayMin = Math.max(0, connection.playwrightInputDelayMin);
    const inputDelayMax = Math.max(
      inputDelayMin,
      connection.playwrightInputDelayMax
    );
    const actionDelayMin = Math.max(0, connection.playwrightActionDelayMin);
    const actionDelayMax = Math.max(
      actionDelayMin,
      connection.playwrightActionDelayMax
    );
    const proxyEnabled = connection.playwrightProxyEnabled;
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
    const emulateDevice = connection.playwrightEmulateDevice;
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
      pushStep(
        "Launching Playwright",
        "pending",
        `Starting Chromium (headless=${headless ? "on" : "off"}, slowMo=${slowMo}ms)`
      );
      browser = await chromium.launch({
        headless,
        slowMo,
        proxy:
          proxyEnabled && proxyServer
            ? {
                server: proxyServer,
                username: proxyUsername || undefined,
                password: proxyPassword || undefined,
              }
            : undefined,
      });

      const deviceContextOptions: BrowserContextOptions = deviceProfile
        ? (({ defaultBrowserType: _ignore, ...rest }) => rest)(deviceProfile)
        : {};

      const contextOptions: BrowserContextOptions = {
        ...deviceContextOptions,
        ...(storedState ? { storageState: storedState } : {}),
      };

      context = await browser.newContext(contextOptions);
      context.setDefaultTimeout(defaultTimeout);
      context.setDefaultNavigationTimeout(navigationTimeout);
      page = await context.newPage();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return fail("Launching Playwright", message);
    }
    try {
      const randomBetween = (min: number, max: number) =>
        Math.floor(Math.random() * (max - min + 1)) + min;
      const safeWaitForSelector = async (
        selector: string,
        options: Parameters<typeof page.waitForSelector>[1],
        label: string
      ) => {
        try {
          return await page.waitForSelector(selector, options);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          throw new Error(`${label} wait failed: ${message}`);
        }
      };
      const safeWaitFor = async (
        locator: ReturnType<typeof page.locator>,
        options: Parameters<ReturnType<typeof page.locator>["waitFor"]>[0],
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
        locator: ReturnType<typeof page.locator>,
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
        locator: ReturnType<typeof page.locator>,
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
        locator: ReturnType<typeof page.locator>,
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
        options: Parameters<typeof page.goto>[1],
        label: string
      ) => {
        try {
          return await page.goto(url, options);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          throw new Error(`${label} navigation failed: ${message}`);
        }
      };
      const safeWaitForLoadState = async (
        state: Parameters<typeof page.waitForLoadState>[0],
        options: Parameters<typeof page.waitForLoadState>[1],
        label: string
      ) => {
        try {
          return await page.waitForLoadState(state, options);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          throw new Error(`${label} load state failed: ${message}`);
        }
      };
      const captureDebugArtifacts = async (label: string) => {
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
        if (!humanizeMouse) return;
        const delay = randomBetween(min, max);
        if (delay > 0) {
          await page.waitForTimeout(delay);
        }
      };
      const humanizedClick = async (
        locator: ReturnType<typeof page.locator>
      ) => {
        if (!humanizeMouse) {
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
        locator: ReturnType<typeof page.locator>,
        value: string
      ) => {
        await locator.fill(value);
        if (!humanizeMouse) return;
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
        'a[href*="/my"]',
      ].join(", ");
      const errorSelector = [
        '[data-testid*="error"]',
        '[data-test*="error"]',
        '[role="alert"]',
        ".alert",
        ".form-error",
        ".error",
        ".text-red-500",
      ].join(", ");

      let sessionReused = false;
      if (storedState) {
        pushStep("Reusing session", "pending", "Checking existing session");
        try {
          await safeGoto(
            "https://www.tradera.com/en",
            {
              waitUntil: "domcontentloaded",
              timeout: 30000,
            },
            "Session check"
          );
          await humanizedPause();
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
        "https://www.tradera.com/en",
      ];
      const openLoginPage = async () => {
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
        return loginUrls[loginUrls.length - 1];
      };
      const loginUrl = sessionReused ? loginUrls[0] : await openLoginPage();

      const formSelector = [
        "#sign-in-form",
        'form[data-sign-in-form="true"]',
        'form[data-sentry-component="LoginForm"]',
      ].join(", ");
      const emailSelector = '#email, input[name="email"], input[type="email"]';
      const passwordSelector =
        '#password, input[name="password"], input[type="password"]';

      let form = page.locator(formSelector).first();
      const findInput = async (selectors: string[]) => {
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
                'button[aria-label*="Logga in"]',
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
        form = page.locator(formSelector).first();
        pushStep("Locating login form", "ok", "Sign-in form detected");

        pushStep("Filling credentials", "pending", "Locating login fields");
        const usernameSelectors = [
          "#email",
          'input[name="email"]',
          'input[type="email"]',
        ];
        const passwordSelectors = [
          "#password",
          'input[type="password"]',
          'input[name="password"]',
        ];

        const findInputInForm = async (selectors: string[]) => {
          for (const selector of selectors) {
            const locator = form.locator(selector).first();
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
          'button:has-text("Logga in")',
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
              timeout: 15000,
            }),
            humanizedClick(submitButton.locator),
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
          "captcha:n",
        ];
        try {
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
                form,
                { state: "hidden", timeout: 120000 },
                "Captcha form hide"
              ).then(() => "form-hidden"),
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
            ).then(() => "error"),
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
        const storageState = await page.context().storageState();
        await prisma.integrationConnection.update({
          where: { id: connection.id },
          data: {
            playwrightStorageState: encryptSecret(JSON.stringify(storageState)),
            playwrightStorageStateUpdatedAt: new Date(),
          },
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
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      pushStep("Unexpected error", "failed", error.message);
      console.error("[integrations][connections][test] Unexpected error", {
        errorId,
        integrationId,
        connectionId: integrationConnectionId,
        message: error.message,
      });
      return NextResponse.json(
        {
          error: error.message,
          steps,
          errorId,
          integrationId,
          connectionId: integrationConnectionId,
        },
        { status: 400 }
      );
    }
    pushStep("Unexpected error", "failed", "Failed to test connection");
    console.error("[integrations][connections][test] Unknown error", {
      errorId,
      integrationId,
      connectionId: integrationConnectionId,
      error,
    });
    return NextResponse.json(
      {
        error: "Failed to test connection",
        steps,
        errorId,
        integrationId,
        connectionId: integrationConnectionId,
      },
      { status: 500 }
    );
  }
}
