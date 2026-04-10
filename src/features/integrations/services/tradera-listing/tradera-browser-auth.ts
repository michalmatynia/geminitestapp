import type { Page } from 'playwright';
import { normalizeTraderaListingFormUrl } from '@/features/integrations/constants/tradera';
import { decryptSecret } from '@/features/integrations/server';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import { internalError } from '@/shared/errors/app-error';
import {
  LOGIN_SUCCESS_SELECTOR,
  LOGIN_FORM_SELECTOR,
  USERNAME_SELECTORS,
  PASSWORD_SELECTORS,
  LOGIN_BUTTON_SELECTORS,
  TRADERA_AUTH_ERROR_SELECTORS,
  TRADERA_CAPTCHA_HINTS,
  TRADERA_COOKIE_ACCEPT_SELECTORS,
  TRADERA_MANUAL_VERIFICATION_TEXT_HINTS,
  TRADERA_MANUAL_VERIFICATION_URL_HINTS,
} from './config';
import {
  findVisibleLocator,
  includesAnyHint,
  isLocatorVisible,
  readVisibleLocatorText,
} from './utils';

export type TraderaAuthState = {
  successVisible: boolean;
  loginFormVisible: boolean;
  currentUrl: string;
  loggedIn: boolean;
  errorText: string;
  captchaDetected: boolean;
  manualVerificationDetected: boolean;
};

const isKnownAuthenticatedTraderaUrl = (normalizedUrl: string): boolean =>
  normalizedUrl.includes('/my/listings') ||
  normalizedUrl.includes('/selling/new') ||
  normalizedUrl.includes('/selling/edit');

export const acceptTraderaCookies = async (page: Page): Promise<void> => {
  for (const selector of TRADERA_COOKIE_ACCEPT_SELECTORS) {
    const locator = page.locator(selector).first();
    const visible = await isLocatorVisible(locator);
    if (!visible) continue;
    await locator.click?.().catch(() => undefined);
    await page.waitForTimeout?.(500);
    return;
  }
};

export const readTraderaAuthState = async (page: Page): Promise<TraderaAuthState> => {
  const successVisible = await isLocatorVisible(page.locator(LOGIN_SUCCESS_SELECTOR).first());
  const loginFormVisible = await isLocatorVisible(page.locator(LOGIN_FORM_SELECTOR).first());
  const currentUrl = page.url().trim();
  const normalizedUrl = currentUrl.toLowerCase();
  const errorText = await readVisibleLocatorText(page, TRADERA_AUTH_ERROR_SELECTORS);
  const normalizedErrorText = errorText.toLowerCase();
  const captchaDetected =
    includesAnyHint(normalizedErrorText, TRADERA_CAPTCHA_HINTS) ||
    includesAnyHint(normalizedUrl, TRADERA_MANUAL_VERIFICATION_URL_HINTS.filter((hint) =>
      hint.includes('captcha')
    ));
  const manualVerificationDetected =
    captchaDetected ||
    includesAnyHint(normalizedErrorText, TRADERA_MANUAL_VERIFICATION_TEXT_HINTS) ||
    includesAnyHint(normalizedUrl, TRADERA_MANUAL_VERIFICATION_URL_HINTS);
  const loggedIn =
    successVisible ||
    (!manualVerificationDetected &&
      !loginFormVisible &&
      isKnownAuthenticatedTraderaUrl(normalizedUrl));

  return {
    successVisible,
    loginFormVisible,
    currentUrl,
    loggedIn,
    errorText,
    captchaDetected,
    manualVerificationDetected,
  };
};

export const buildTraderaAuthRequiredError = ({
  hasStoredSession,
  authState,
}: {
  hasStoredSession: boolean;
  authState: TraderaAuthState;
}): Error => {
  return internalError(
    hasStoredSession
      ? authState.captchaDetected
        ? 'AUTH_REQUIRED: Stored Tradera session expired and Tradera requires manual verification (captcha). Refresh the saved browser session.'
        : authState.manualVerificationDetected
          ? 'AUTH_REQUIRED: Stored Tradera session expired and Tradera requires manual verification. Refresh the saved browser session.'
          : 'AUTH_REQUIRED: Stored Tradera session expired or requires manual verification.'
      : authState.captchaDetected
        ? 'AUTH_REQUIRED: Tradera login requires manual verification (captcha).'
        : authState.manualVerificationDetected
          ? 'AUTH_REQUIRED: Tradera login requires manual verification.'
          : 'AUTH_REQUIRED: Tradera login failed or requires manual verification.',
    {
      currentUrl: authState.currentUrl,
      errorText: authState.errorText || null,
      successVisible: authState.successVisible,
      loginFormVisible: authState.loginFormVisible,
      captchaDetected: authState.captchaDetected,
      manualVerificationDetected: authState.manualVerificationDetected,
      hasStoredSession,
    }
  );
};

export const ensureLoggedIn = async (
  page: Page,
  connection: IntegrationConnectionRecord,
  listingFormUrl: string
): Promise<void> => {
  const normalizedListingFormUrl = normalizeTraderaListingFormUrl(listingFormUrl);
  const hasStoredSession = Boolean(connection.playwrightStorageState?.trim());
  const sessionCheckUrl = 'https://www.tradera.com/en/my/listings?tab=active';

  await page.goto(sessionCheckUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await acceptTraderaCookies(page);
  const initialAuthState = await readTraderaAuthState(page);
  if (initialAuthState.loggedIn) {
    await page.goto(normalizedListingFormUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await acceptTraderaCookies(page);
    return;
  }

  if (hasStoredSession) {
    throw buildTraderaAuthRequiredError({
      hasStoredSession: true,
      authState: initialAuthState,
    });
  }

  await page.goto('https://www.tradera.com/login', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await acceptTraderaCookies(page);
  await page.waitForSelector(LOGIN_FORM_SELECTOR, {
    state: 'attached',
    timeout: 20_000,
  });

  const usernameInput = await findVisibleLocator(page, USERNAME_SELECTORS);
  const passwordInput = await findVisibleLocator(page, PASSWORD_SELECTORS);
  if (!usernameInput || !passwordInput) {
    throw internalError('Unable to locate Tradera login inputs.');
  }

  const decryptedPassword = decryptSecret(connection.password ?? '');
  await usernameInput.fill(connection.username ?? '');
  await passwordInput.fill(decryptedPassword);

  const submitButton = await findVisibleLocator(page, LOGIN_BUTTON_SELECTORS);
  if (!submitButton) {
    throw internalError('Unable to locate Tradera login submit button.');
  }

  await Promise.allSettled([
    page.waitForNavigation({
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    }),
    submitButton.click(),
  ]);
  await page.waitForTimeout(1500).catch(() => undefined);
  await acceptTraderaCookies(page);

  const postLoginAuthState = await readTraderaAuthState(page);
  if (!postLoginAuthState.loggedIn) {
    throw buildTraderaAuthRequiredError({
      hasStoredSession: false,
      authState: postLoginAuthState,
    });
  }

  await page.goto(normalizedListingFormUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await acceptTraderaCookies(page);
  const listingAuthState = await readTraderaAuthState(page);
  if (!listingAuthState.loggedIn && (listingAuthState.loginFormVisible || listingAuthState.manualVerificationDetected)) {
    throw buildTraderaAuthRequiredError({
      hasStoredSession: false,
      authState: listingAuthState,
    });
  }
};
