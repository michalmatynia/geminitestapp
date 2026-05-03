import type { Page } from 'playwright';

import {
  VINTED_IMAGE_UPLOAD_SELECTORS,
  VINTED_LOGIN_FORM_SELECTOR,
  VINTED_LOGIN_SUCCESS_SELECTORS,
  VINTED_PRICE_SELECTORS,
  VINTED_SUBMIT_SELECTORS,
  VINTED_TITLE_SELECTORS,
} from './config';

export type VintedAuthState = {
  currentUrl: string;
  successVisible: boolean;
  loginFormVisible: boolean;
  sellFormVisible: boolean;
  authRouteDetected: boolean;
  googleAuthPageDetected: boolean;
  googleBlockDetected: boolean;
  loggedIn: boolean;
};

const VINTED_AUTH_URL_HINTS = [
  '/member/login',
  '/member/sign_in',
  '/member/signup',
  '/member/register',
] as const;

const VINTED_LOGGED_IN_URL_HINTS = ['/settings'] as const;
const GOOGLE_AUTH_URL_HINT = 'accounts.google.com';
const GOOGLE_BLOCK_TEXT_HINTS = [
  'this browser or app may not be secure',
  'try using a different browser',
] as const;

const VINTED_LOGIN_SUCCESS_SELECTOR = VINTED_LOGIN_SUCCESS_SELECTORS.join(', ');
const VINTED_SELL_FORM_READY_SELECTOR = [
  ...VINTED_TITLE_SELECTORS,
  ...VINTED_PRICE_SELECTORS,
  ...VINTED_IMAGE_UPLOAD_SELECTORS,
  ...VINTED_SUBMIT_SELECTORS,
].join(', ');

export const isVintedAuthRoute = (url: string): boolean => {
  const normalizedUrl = url.trim().toLowerCase();
  if (!normalizedUrl) return false;
  return VINTED_AUTH_URL_HINTS.some((hint) => normalizedUrl.includes(hint));
};

const isGoogleAuthRoute = (url: string): boolean =>
  url.trim().toLowerCase().includes(GOOGLE_AUTH_URL_HINT);

const isGoogleBlockText = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return GOOGLE_BLOCK_TEXT_HINTS.some((hint) => normalized.includes(hint));
};

export const readVintedAuthState = async (page: Page): Promise<VintedAuthState> => {
  const currentUrl = page.url().trim();
  const normalizedUrl = currentUrl.toLowerCase();
  const successVisible = await page
    .locator(VINTED_LOGIN_SUCCESS_SELECTOR)
    .first()
    .isVisible()
    .catch(() => false);
  const loginFormVisible = await page
    .locator(VINTED_LOGIN_FORM_SELECTOR)
    .first()
    .isVisible()
    .catch(() => false);
  const sellFormVisible = await page
    .locator(VINTED_SELL_FORM_READY_SELECTOR)
    .first()
    .isVisible()
    .catch(() => false);
  const authRouteDetected = isVintedAuthRoute(normalizedUrl);
  const googleAuthPageDetected = isGoogleAuthRoute(normalizedUrl);
  const googleBlockDetected = googleAuthPageDetected
    ? isGoogleBlockText(await page.locator('body').innerText().catch(() => ''))
    : false;
  const transientListingRoute = normalizedUrl.includes('/items/new') && !sellFormVisible;
  const hasLoggedInSignal =
    successVisible ||
    sellFormVisible ||
    VINTED_LOGGED_IN_URL_HINTS.some((hint) => normalizedUrl.includes(hint));
  const loggedIn =
    !authRouteDetected &&
    !googleBlockDetected &&
    !loginFormVisible &&
    !transientListingRoute &&
    hasLoggedInSignal;

  return {
    currentUrl,
    successVisible,
    loginFormVisible,
    sellFormVisible,
    authRouteDetected,
    googleAuthPageDetected,
    googleBlockDetected,
    loggedIn,
  };
};

export const waitForVintedManualLogin = async (
  page: Page,
  timeoutMs: number
): Promise<VintedAuthState | null> => {
  const deadline = Date.now() + timeoutMs;
  let stableLoggedInPolls = 0;

  while (Date.now() < deadline) {
    const authState = await readVintedAuthState(page);
    if (authState.loggedIn) {
      stableLoggedInPolls += 1;
      if (stableLoggedInPolls >= 2) {
        return authState;
      }
    } else {
      stableLoggedInPolls = 0;
    }
    await page.waitForTimeout(1000).catch(() => undefined);
  }

  return null;
};
