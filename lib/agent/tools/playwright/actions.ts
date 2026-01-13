import type { Page } from "playwright";
import { captureSessionContext } from "./browser";

export const findFirstVisible = async (locator: ReturnType<Page["locator"]>) => {
  const count = await locator.count();
  for (let i = 0; i < count; i += 1) {
    const candidate = locator.nth(i);
    if (await candidate.isVisible()) {
      return candidate;
    }
  }
  return null;
};

export const dismissConsent = async (
  page: Page,
  label: string,
  log?: (level: string, message: string, metadata?: Record<string, unknown>) => Promise<void>,
  activeStepId?: string | null
) => {
  if (!page) return;
  const buttonText = 
    /accept|agree|ok|got it|allow all|accept all|dismiss|close/i;
  const selectors = [
    "button",
    "[role='button']",
    "input[type='button']",
    "input[type='submit']",
    "[data-testid*='consent' i]",
    "[data-testid*='cookie' i]",
    "[aria-label*='accept' i]",
    "[aria-label*='cookie' i]",
  ];
  try {
    const candidates = page.locator(selectors.join(", "));
    const count = await candidates.count();
    for (let i = 0; i < count; i += 1) {
      const candidate = candidates.nth(i);
      const text = (await candidate.innerText()).trim();
      if (text && buttonText.test(text)) {
        await candidate.click({ timeout: 2000 });
        if (log) {
          await log("info", "Dismissed consent banner.", {
            label,
            text,
            stepId: activeStepId ?? null,
          });
        }
        return;
      }
    }
  } catch {
    // ignore consent failures
  }
};

export const inferLoginCandidates = async (
  page: Page,
  log?: (level: string, message: string, metadata?: Record<string, unknown>) => Promise<void>,
  activeStepId?: string | null
) => {
  if (!page) return null;
  try {
    const candidates = await page.evaluate(() => {
      const cssPath = (el: Element) => {
        if (!(el instanceof Element)) return null;
        if (el.id) {
          return `#${CSS.escape(el.id)}`;
        }
        const parts: string[] = [];
        let node: Element | null = el;
        while (node && node.nodeType === 1 && node !== document.documentElement) {
          let part = node.tagName.toLowerCase();
          const name = node.getAttribute("name");
          const dataTest =
            node.getAttribute("data-testid") ||
            node.getAttribute("data-test") ||
            node.getAttribute("data-qa");
          if (name) {
            part += `[name="${name.replace(/"/g, '"')}"]`;
          } else if (dataTest) {
            part += `[data-testid="${dataTest.replace(/"/g, '"')}"]`;
          }
          const parent = node.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter(
              (child) => child.tagName === node!.tagName
            );
            if (siblings.length > 1) {
              const index = siblings.indexOf(node) + 1;
              part += `:nth-of-type(${index})`;
            }
          }
          parts.unshift(part);
          node = node.parentElement;
        }
        return parts.join(" > ");
      };

      const scoreInput = (el: HTMLInputElement) => {
        const attrs = [
          el.name,
          el.id,
          el.placeholder,
          el.getAttribute("aria-label"),
          el.getAttribute("autocomplete"),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        let score = 0;
        if (el.type === "email") score += 5;
        if (el.type === "password") score += 5;
        if (attrs.includes("email")) score += 4;
        if (attrs.includes("user") || attrs.includes("login")) score += 3;
        if (attrs.includes("password") || attrs.includes("pass")) score += 4;
        return score;
      };

      const describe = (el: Element) => ({
        tag: el.tagName.toLowerCase(),
        id: (el as HTMLElement).id || null,
        name: (el as HTMLInputElement).name || null,
        type: (el as HTMLInputElement).type || null,
        text: (el as HTMLElement).innerText?.trim().slice(0, 120) || null,
        placeholder: (el as HTMLInputElement).placeholder || null,
        ariaLabel: el.getAttribute("aria-label"),
        selector: cssPath(el),
      });

      const inputs = Array.from(
        document.querySelectorAll("input, textarea, select")
      )
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => ({
          ...describe(el),
          score:
            el instanceof HTMLInputElement ? scoreInput(el) : 0,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);

      const buttons = Array.from(
        document.querySelectorAll("button, input[type='submit'], input[type='button']")
      )
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => ({
          ...describe(el),
          score: /log in|login|sign in|submit|continue|zaloguj|zaloguj się/i.test(
            (el as HTMLElement).innerText || (el as HTMLInputElement).value || ""
          )
            ? 5
            : 1,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);

      return { inputs, buttons };
    });

    if (log) {
      await log("info", "Inferred login candidates.", {
        stepId: activeStepId ?? null,
        candidates,
      });
    }
    return candidates;
  } catch (error) {
    if (log) {
      await log("warning", "Failed to infer login candidates.", {
        error: error instanceof Error ? error.message : String(error),
        stepId: activeStepId ?? null,
      });
    }
  }
  return null;
};

export const ensureLoginFormVisible = async (
  page: Page,
  runId: string,
  log?: (level: string, message: string, metadata?: Record<string, unknown>) => Promise<void>
) => {
  if (!page) return;
  const passwordSelector =
    'input[type="password"], input[name*="pass" i], input[autocomplete*="current-password" i]';
  const passwordField = await findFirstVisible(page.locator(passwordSelector));
  if (passwordField) return true;

  const loginTrigger = await findFirstVisible(
    page.locator(
      'a, button, [role="button"]'
    ).filter({
      hasText: /log in|login|sign in|zaloguj|zalogować|zaloguj się|inloggen|logga in|connexion|accedi/i,
    })
  );

  if (loginTrigger) {
    await loginTrigger.click();
    if (log) await log("info", "Clicked login trigger.");
    // We cannot call captureSessionContext here easily without importing context, 
    // but better to keep actions pure-ish or passed context. 
    // For now omitting session capture inside helper to avoid circular dep, 
    // or we assume context is passed if we want. 
    // Let's assume the caller handles context capture or we pass the browser context.
    try {
      await page.waitForSelector(passwordSelector, { timeout: 10000 });
    } catch {
      if (log) await log("warning", "Login form did not appear after clicking trigger.");
    }
    const postClickPassword = await findFirstVisible(page.locator(passwordSelector));
    if (postClickPassword) return true;
  }

  const currentUrl = page.url();
  try {
    const target = new URL(currentUrl);
    const loginUrl = `${target.origin}/login`;
    await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    if (log) await log("info", "Navigated to fallback login URL.", { loginUrl });
  } catch {
    if (log) await log("warning", "Failed to navigate to fallback login URL.");
  }
  const fallbackPassword = await findFirstVisible(page.locator(passwordSelector));
  if (fallbackPassword) return true;
  if (log) await log("warning", "Login form still not visible after fallback navigation.");
  return false;
};

export const checkForChallenge = async (
  page: Page,
  source: string,
  log?: (level: string, message: string, metadata?: Record<string, unknown>) => Promise<void>,
  stepId?: string | null
) => {
  if (!page) return false;
  const html = await page.content();
  const text = await page.evaluate(
    () => document.body?.innerText || document.documentElement?.innerText || ""
  );
  const detectChallenge = (t: string) =>
      /cloudflare|attention required|cf-browser-verification|challenge-platform|cf-turnstile/i.test(
        t
      );
  if (detectChallenge(text) || detectChallenge(html)) {
    if (log) {
       await log("warning", "Cloudflare challenge detected.", {
        source,
        detail: "challenge markers in DOM/HTML",
        stepId: stepId ?? null,
      });
    }
    return true;
  }
  return false;
};
