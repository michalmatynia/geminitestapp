import type { Page } from 'playwright';

const COOKIE_ACCEPT_SELECTORS = [
  '#onetrust-accept-btn-handler',
  'button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  'button:has-text("Accept all cookies")',
  'button:has-text("Accept all")',
  'button:has-text("Acceptera alla cookies")',
  'button:has-text("Acceptera alla kakor")',
  'button:has-text("Godkänn alla cookies")',
  'button:has-text("Tillåt alla cookies")',
] as const;

const AUTH_FAIL_URL_HINTS = ['/login', '/captcha', '/challenge', '/verification', '/verify'] as const;
const AUTH_FAIL_SELECTORS = [
  'form[action*="login"]',
  'input[type="password"]',
] as const;

type WaitFn = (ms: number) => Promise<void>;

type PageAutomationInput = {
  page: Page;
  wait: WaitFn;
};

/* eslint-disable no-await-in-loop -- Auth and cookie probes must run serially because only the first visible match should be acted on. */
export const isOnTraderaListingFormAuthPage = async (page: Page): Promise<boolean> => {
  const url = page.url().toLowerCase();
  if (AUTH_FAIL_URL_HINTS.some((hint) => url.includes(hint))) return true;

  for (const selector of AUTH_FAIL_SELECTORS) {
    const visible = await page
      .locator(selector)
      .first()
      .isVisible({ timeout: 500 })
      .catch(() => false);
    if (visible) return true;
  }

  return false;
};

export const acceptTraderaListingFormCategoryCookies = async (
  input: PageAutomationInput
): Promise<boolean> => {
  for (const selector of COOKIE_ACCEPT_SELECTORS) {
    const locator = input.page.locator(selector).first();
    if (!(await locator.isVisible().catch(() => false))) continue;

    await locator.click().catch(() => undefined);
    await input.wait(600);
    return true;
  }

  return false;
};
/* eslint-enable no-await-in-loop */
