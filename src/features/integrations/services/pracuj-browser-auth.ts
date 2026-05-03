import type { Locator, Page } from 'playwright';

import { findVisibleLocator } from '@/features/integrations/services/tradera-listing/utils';

export const PRACUJ_AUTH_ENTRY_URL = 'https://login.pracuj.pl/';
export const PRACUJ_ACCOUNT_CHECK_URL = 'https://www.pracuj.pl/moje-aplikacje';
export const PRACUJ_AUTH_REQUIRED_DETAIL =
  'AUTH_REQUIRED: Pracuj.pl session expired or is missing. Open the Pracuj.pl login window and refresh the session.';

const EMAIL_SELECTORS = [
  'input[type="email"]',
  'input[name*="email" i]',
  'input[name*="login" i]',
  'input[autocomplete="username"]',
] as const;

const PASSWORD_SELECTORS = [
  'input[type="password"]',
  'input[autocomplete="current-password"]',
] as const;

const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'button:has-text("Dalej")',
  'button:has-text("Zaloguj")',
  'button:has-text("Log in")',
  'button:has-text("Continue")',
] as const;

const COOKIE_ACCEPT_SELECTORS = [
  'button:has-text("Akceptuję")',
  'button:has-text("Akceptuj")',
  'button:has-text("Accept")',
  '#onetrust-accept-btn-handler',
] as const;

const GOOGLE_LOGIN_SELECTORS = [
  'button:has-text("Zaloguj przez Google")',
  'button:has-text("Zaloguj się przez Google")',
  'button:has-text("Google")',
  'a:has-text("Zaloguj przez Google")',
  '[data-testid*="google"]',
] as const;

const ONE_TIME_CODE_BUTTON_SELECTORS = [
  'button:has-text("Zaloguj się jednorazowym kodem")',
  'button:has-text("jednorazowym kodem")',
  'a:has-text("Zaloguj się jednorazowym kodem")',
  'a:has-text("jednorazowym kodem")',
] as const;

export type PracujLoginMode = 'password' | 'google' | 'one_time_code';

const LOGGED_IN_TEXT_PATTERNS = [
  /wyloguj/i,
  /moje aplikacje/i,
  /moje cv/i,
  /centrum aplikowania/i,
  /profil kandydata/i,
  /ustawienia konta/i,
] as const;

const LOGGED_IN_URL_PATTERNS = [
  /\/moje-aplikacje/i,
  /\/moje-cv/i,
  /\/profil/i,
  /\/aplikacje/i,
] as const;

type PushStep = (
  step: string,
  status: 'pending' | 'ok' | 'failed',
  detail: string
) => void;

export type PracujCredentials = {
  username: string;
  password: string;
};

export type PracujBrowserPreference = 'auto' | 'brave' | 'chrome' | 'chromium';

export const hasPracujText = (value: string): boolean => value.trim().length > 0;

export const hasUsablePracujCredentials = (
  credentials: PracujCredentials | null
): credentials is PracujCredentials =>
  credentials !== null &&
  hasPracujText(credentials.username) &&
  hasPracujText(credentials.password);

export const resolvePracujHeadless = (input: {
  interactiveManualMode: boolean;
  quicklistPreflightMode: boolean;
  configuredHeadless: boolean;
}): boolean => {
  if (input.interactiveManualMode) return false;
  if (input.quicklistPreflightMode) return true;
  return input.configuredHeadless;
};

export const resolvePracujBrowserPreference = (input: {
  interactiveManualMode: boolean;
  configuredBrowser: PracujBrowserPreference;
}): PracujBrowserPreference =>
  input.interactiveManualMode && input.configuredBrowser === 'chromium'
    ? 'auto'
    : input.configuredBrowser;

const readBodyText = async (page: Page): Promise<string> =>
  (await page.locator('body').first().textContent({ timeout: 3000 }).catch(() => null)) ?? '';

const isVisible = async (locator: Locator | null): Promise<boolean> =>
  locator !== null ? locator.isVisible().catch(() => false) : false;

export const acceptPracujCookies = async (page: Page): Promise<void> => {
  const button = await findVisibleLocator(page, COOKIE_ACCEPT_SELECTORS);
  if (button !== null) {
    await button.click({ timeout: 3000 }).catch(() => undefined);
  }
};

export const safePracujGoto = async (
  page: Page,
  url: string,
  timeout = 30_000
): Promise<void> => {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!message.includes('net::ERR_ABORTED')) {
      throw error;
    }
  }
  await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  await acceptPracujCookies(page);
};

export const readPracujAuthState = async (
  page: Page
): Promise<{
  loggedIn: boolean;
  loginFormVisible: boolean;
  currentUrl: string;
}> => {
  const currentUrl = page.url();
  const lowerUrl = currentUrl.toLowerCase();
  const bodyText = await readBodyText(page);
  const emailInput = await findVisibleLocator(page, EMAIL_SELECTORS);
  const passwordInput = await findVisibleLocator(page, PASSWORD_SELECTORS);
  const hasVisibleEmail = await isVisible(emailInput);
  const hasVisiblePassword = await isVisible(passwordInput);
  const loginFormVisible =
    lowerUrl.includes('login.pracuj.pl') && (hasVisibleEmail || hasVisiblePassword);
  const loggedInByText = LOGGED_IN_TEXT_PATTERNS.some((pattern) => pattern.test(bodyText));
  const loggedInByUrl =
    !lowerUrl.includes('login.pracuj.pl') &&
    LOGGED_IN_URL_PATTERNS.some((pattern) => pattern.test(currentUrl));

  return {
    loggedIn: !loginFormVisible && (loggedInByText || loggedInByUrl),
    loginFormVisible,
    currentUrl,
  };
};

const findPracujLoginControls = async (
  page: Page
): Promise<{
  emailInput: Locator | null;
  passwordInput: Locator | null;
  submitButton: Locator | null;
}> => ({
  emailInput: await findVisibleLocator(page, EMAIL_SELECTORS),
  passwordInput: await findVisibleLocator(page, PASSWORD_SELECTORS),
  submitButton: await findVisibleLocator(page, SUBMIT_SELECTORS),
});

export const trySubmitPracujCredentials = async (
  page: Page,
  username: string,
  password: string,
  pushStep: PushStep
): Promise<boolean> => {
  const initialControls = await findPracujLoginControls(page);
  if (initialControls.emailInput === null || initialControls.submitButton === null) {
    pushStep('Credentials autofill', 'pending', 'Pracuj.pl email field was not visible.');
    return false;
  }

  await initialControls.emailInput.fill(username);
  await Promise.allSettled([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15_000 }),
    initialControls.submitButton.click(),
  ]);
  await page.waitForTimeout(1000).catch(() => undefined);
  await acceptPracujCookies(page);

  const nextControls = await findPracujLoginControls(page);
  const passwordInput = nextControls.passwordInput;
  const passwordSubmitButton = nextControls.submitButton ?? initialControls.submitButton;
  if (passwordInput === null) {
    pushStep(
      'Credentials autofill',
      'pending',
      'Email was submitted, but Pracuj.pl did not show a password field.'
    );
    return false;
  }

  await passwordInput.fill(password);
  await Promise.allSettled([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20_000 }),
    passwordSubmitButton.click(),
  ]);
  await page.waitForTimeout(1500).catch(() => undefined);
  await acceptPracujCookies(page);
  return true;
};

export const clickPracujGoogleLogin = async (page: Page): Promise<boolean> => {
  const button = await findVisibleLocator(page, GOOGLE_LOGIN_SELECTORS);
  if (button === null) return false;
  await button.click({ timeout: 5000 }).catch(() => undefined);
  return true;
};

export const triggerPracujOneTimeCode = async (
  page: Page,
  username: string
): Promise<boolean> => {
  const emailInput = await findVisibleLocator(page, EMAIL_SELECTORS);
  const submitButton = await findVisibleLocator(page, SUBMIT_SELECTORS);
  if (emailInput === null || submitButton === null) return false;

  await emailInput.fill(username);
  await Promise.allSettled([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15_000 }),
    submitButton.click(),
  ]);
  await page.waitForTimeout(1000).catch(() => undefined);
  await acceptPracujCookies(page);

  const otpButton = await findVisibleLocator(page, ONE_TIME_CODE_BUTTON_SELECTORS);
  if (otpButton === null) return false;

  await Promise.allSettled([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15_000 }),
    otpButton.click(),
  ]);
  await page.waitForTimeout(1000).catch(() => undefined);
  return true;
};

export const waitForPracujManualLogin = async (
  page: Page,
  timeoutMs: number
): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;

  const poll = async (): Promise<boolean> => {
    if (Date.now() >= deadline) {
      return false;
    }

    await acceptPracujCookies(page);
    const authState = await readPracujAuthState(page);
    if (authState.loggedIn) {
      return true;
    }
    await page.waitForTimeout(1000).catch(() => undefined);
    return poll();
  };

  return poll();
};
