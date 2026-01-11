import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/utils/encryption";
import { chromium } from "playwright";

/**
 * POST /api/integrations/[id]/connections/[connectionId]/test
 * Performs a lightweight credential check for the integration connection.
 */
export async function POST(
  _req: Request,
  {
    params,
  }: { params: Promise<{ id: string; connectionId: string }> }
) {
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
    const safeDetail = detail?.trim() ? detail : "Unknown error";
    pushStep(step, "failed", safeDetail);
    return NextResponse.json({ error: safeDetail, steps }, { status });
  };

  try {
    const { id, connectionId } = await params;
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
    pushStep(
      "Decrypting credentials",
      "ok",
      "Password decrypted successfully"
    );

    let storedState: { cookies: unknown[]; origins: unknown[] } | null = null;
    if (connection.playwrightStorageState) {
      pushStep("Loading session", "pending", "Loading stored Playwright session");
      try {
        storedState = JSON.parse(decryptSecret(connection.playwrightStorageState)) as {
          cookies: unknown[];
          origins: unknown[];
        };
        pushStep("Loading session", "ok", "Stored session loaded");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        pushStep("Loading session", "failed", `Failed to load session: ${message}`);
      }
    }

    pushStep("Launching Playwright", "pending", "Starting Chromium");
    const browser = await chromium.launch({ headless: false, slowMo: 50 });
    const context = storedState
      ? await browser.newContext({ storageState: storedState })
      : await browser.newContext();
    const page = await context.newPage();
    try {
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
        await page.goto("https://www.tradera.com/en", {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        const loggedIn = await page
          .locator(successSelector)
          .first()
          .isVisible()
          .catch(() => false);
        if (loggedIn) {
          pushStep("Reusing session", "ok", "Session still valid");
          sessionReused = true;
        } else {
          pushStep("Reusing session", "failed", "Session invalid or expired");
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
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
          await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
          const formLocator = page.locator("#sign-in-form").first();
          if ((await formLocator.count()) > 0) {
            pushStep("Opening login page", "ok", `Login page loaded: ${url}`);
            return url;
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
      const emailSelector = "#email, input[name=\"email\"], input[type=\"email\"]";
      const passwordSelector = "#password, input[name=\"password\"], input[type=\"password\"]";

      let form = page.locator(formSelector).first();
      const findInput = async (selectors: string[]) => {
        for (const selector of selectors) {
          const locator = page.locator(selector).first();
          if ((await locator.count()) > 0) {
            const visible = await locator.isVisible().catch(() => false);
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
          await page.waitForSelector(formSelector, { state: "attached", timeout: 15000 });
          const formLocator = page.locator(formSelector).first();
          const isVisible = await formLocator.isVisible().catch(() => false);
          if (!isVisible) {
            throw new Error("Login form not visible yet");
          }
        } catch {
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
          if ((await signInTrigger.count()) > 0) {
            pushStep("Locating login form", "pending", "Opening sign-in modal");
            await signInTrigger.click();
          }
          await page.waitForSelector(formSelector, { state: "attached", timeout: 20000 });
          await page.locator(formSelector).first().waitFor({ state: "visible", timeout: 20000 });
        }
        await page.locator(emailSelector).first().waitFor({ state: "visible", timeout: 15000 });
        await page.locator(passwordSelector).first().waitFor({ state: "visible", timeout: 15000 });
        form = page.locator(formSelector).first();
        pushStep("Locating login form", "ok", "Sign-in form detected");

        pushStep("Filling credentials", "pending", "Locating login fields");
        const usernameSelectors = ["#email", 'input[name="email"]', 'input[type="email"]'];
        const passwordSelectors = ["#password", 'input[type="password"]', 'input[name="password"]'];

        const findInputInForm = async (selectors: string[]) => {
          for (const selector of selectors) {
            const locator = form.locator(selector).first();
            if ((await locator.count()) > 0) {
              const visible = await locator.isVisible().catch(() => false);
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
          return fail(
            "Filling credentials",
            "Login fields not found on Tradera page"
          );
        }
        await usernameField.locator.fill(connection.username);
        await passwordField.locator.fill(decryptedPassword);
        pushStep(
          "Filling credentials",
          "ok",
          `Filled fields (${usernameField.selector}, ${passwordField.selector})`
        );
      }

      if (!sessionReused) {
        pushStep("Submitting login", "pending", "Attempting to submit form");
        const stayLoggedIn = page.locator('input[name="keepMeLoggedIn"]').first();
        if ((await stayLoggedIn.count()) > 0) {
          const isChecked = await stayLoggedIn.isChecked().catch(() => false);
          if (!isChecked) {
            await stayLoggedIn.check().catch(() => undefined);
            pushStep("Keep me logged in", "ok", "Enabled stay logged in");
          } else {
            pushStep("Keep me logged in", "ok", "Already enabled");
          }
        } else {
          pushStep("Keep me logged in", "failed", "Checkbox not found");
        }
        const submitSelectors = [
          'button[data-login-submit="true"]',
          "#sign-in-form button[type=\"submit\"]",
          'button:has-text("Sign in")',
          'button:has-text("Logga in")',
        ];
        const submitButton = await findInput(submitSelectors);
        if (!submitButton) {
          return fail("Submitting login", "Submit button not found");
        }
        await Promise.allSettled([
          page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }),
          submitButton.locator.click(),
        ]);
        pushStep("Submitting login", "ok", `Clicked ${submitButton.selector}`);

        await page.waitForTimeout(1000);
        const postSubmitUrl = page.url();
        const postSubmitError = await page
          .locator(errorSelector)
          .first()
          .innerText()
          .catch(() => "");
        const postSubmitDetail = `URL: ${postSubmitUrl}${
          postSubmitError?.trim() ? `\nError: ${postSubmitError}` : "\nError: (none visible)"
        }`;
        pushStep("Post-submit debug", "ok", postSubmitDetail);

        const captchaHints = [
          "captcha",
          "recaptcha",
          "fylla i captcha",
          "captcha:n",
        ];
        const postSubmitErrorLower = postSubmitError.toLowerCase();
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
            page
              .locator(successSelector)
              .first()
              .waitFor({ state: "visible", timeout: 120000 })
              .then(() => "success"),
            form
              .waitFor({ state: "hidden", timeout: 120000 })
              .then(() => "form-hidden"),
          ]).catch(() => "timeout");

          if (captchaResult === "timeout") {
            return fail(
              "Captcha required",
              "Captcha not solved within 2 minutes."
            );
          }
          pushStep("Captcha required", "ok", "Captcha solved.");
        }

        pushStep("Verifying session", "pending", "Checking for logged-in state");
        const formLocator = page.locator(formSelector).first();

        const result = await Promise.race([
          page
            .locator(successSelector)
            .first()
            .waitFor({ state: "visible", timeout: 12000 })
            .then(() => "success"),
          formLocator
            .waitFor({ state: "hidden", timeout: 12000 })
            .then(() => "form-hidden"),
          page
            .locator(errorSelector)
            .first()
            .waitFor({ state: "visible", timeout: 12000 })
            .then(() => "error"),
        ]).catch(() => "timeout");

        if (result === "error") {
          const errorText = await page
            .locator(errorSelector)
            .first()
            .innerText()
            .catch(() => "Login error displayed.");
          const safeErrorText = errorText?.trim()
            ? errorText
            : "Login error displayed but no message was found.";
          return fail("Verifying session", safeErrorText);
        }

        if (result === "timeout") {
          const currentUrl = page.url();
          const hint =
            currentUrl === loginUrl || currentUrl.includes("/login")
              ? "Still on login page (invalid credentials, CAPTCHA, or extra verification required)."
              : `Current URL: ${currentUrl}`;
          return fail("Verifying session", `Login verification timed out. ${hint}`);
        }
      } else {
        pushStep("Verifying session", "ok", "Session restored from storage");
      }

      pushStep("Saving session", "pending", "Storing Playwright session cookies");
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
        const message = error instanceof Error ? error.message : "Unknown error";
        pushStep("Saving session", "failed", `Failed to store session: ${message}`);
      }

      pushStep("Verifying session", "ok", "Login appears successful");
    } finally {
      await page.close().catch(() => undefined);
      await context.close().catch(() => undefined);
      await browser.close().catch(() => undefined);
    }

    return NextResponse.json({ ok: true, steps });
  } catch (error: unknown) {
    if (error instanceof Error) {
      pushStep("Unexpected error", "failed", error.message);
      return NextResponse.json({ error: error.message, steps }, { status: 400 });
    }
    pushStep("Unexpected error", "failed", "Failed to test connection");
    return NextResponse.json(
      { error: "Failed to test connection", steps },
      { status: 500 }
    );
  }
}
