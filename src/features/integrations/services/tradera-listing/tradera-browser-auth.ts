import type { Page, Locator } from 'playwright';
import { normalizeTraderaListingFormUrl } from '@/features/integrations/constants/tradera';
import { buildResolvedActionSteps } from '@/shared/lib/browser-execution/runtime-action-resolver.server';
import { TraderaSequencer } from '@/shared/lib/browser-execution/sequencers/TraderaSequencer';
import { StepTracker } from '@/shared/lib/browser-execution/step-tracker';
import { decryptSecret } from '@/shared/lib/security/encryption';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import { internalError } from '@/shared/errors/app-error';
import {
  TRADERA_LOGIN_SUCCESS_SELECTORS,
  TRADERA_LOGIN_FORM_SELECTORS,
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

const TRADERA_AUTH_RESOLUTION_TIMEOUT_MS = 15_000;
const TRADERA_AUTH_RESOLUTION_POLL_MS = 500;
const TRADERA_LOGIN_CONTROLS_TIMEOUT_MS = 10_000;

export type TraderaAuthResolution =
  | 'authenticated'
  | 'login_required'
  | 'manual_verification_required'
  | 'unknown';

export type TraderaAuthState = {
  successVisible: boolean;
  loginFormVisible: boolean;
  currentUrl: string;
  loggedIn: boolean;
  errorText: string;
  captchaDetected: boolean;
  manualVerificationDetected: boolean;
  cookieConsentVisible: boolean;
  knownAuthenticatedUrl: boolean;
  resolution: TraderaAuthResolution;
  matchedSignals: string[];
};

export type TraderaEnsureLoggedInStatus =
  | 'opening_session_check'
  | 'waiting_for_session_check'
  | 'stored_session_accepted'
  | 'stored_session_rejected'
  | 'opening_login'
  | 'waiting_for_login_entry'
  | 'waiting_for_login_controls'
  | 'submitting_login'
  | 'waiting_for_post_login'
  | 'opening_listing_form'
  | 'waiting_for_listing_form';

export type TraderaEnsureLoggedInStatusUpdate = {
  status: TraderaEnsureLoggedInStatus;
  message: string;
  authState?: TraderaAuthState | null;
};

type EnsureLoggedInOptions = {
  onStatus?: (update: TraderaEnsureLoggedInStatusUpdate) => void;
};

const isKnownAuthenticatedTraderaUrl = (normalizedUrl: string): boolean =>
  normalizedUrl.includes('/my/listings') ||
  normalizedUrl.includes('/selling/new') ||
  normalizedUrl.includes('/selling/edit');

const waitOnPage = async (page: Page, timeoutMs: number): Promise<void> => {
  if (typeof page.waitForTimeout === 'function') {
    await page.waitForTimeout(timeoutMs).catch(() => undefined);
    return;
  }

  await Promise.resolve();
};

export const acceptTraderaCookies = async (page: Page): Promise<void> => {
  await clickTraderaCookiesIfVisible(page);
};

const clickTraderaCookieLocator = async (locator: Locator): Promise<boolean> => {
  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  try {
    await locator.click({ timeout: 2_000 });
    return true;
  } catch {
    return locator
      .evaluate((element) => {
        if (element instanceof HTMLElement) {
          element.click();
          return true;
        }
        return false;
      })
      .catch(() => false);
  }
};

const clickTraderaCookiesIfVisible = async (page: Page): Promise<boolean> => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    for (const selector of TRADERA_COOKIE_ACCEPT_SELECTORS) {
      const locator = page.locator(selector).first();
      const visible = await isLocatorVisible(locator);
      if (!visible) continue;
      const clicked = await clickTraderaCookieLocator(locator);
      if (!clicked) continue;
      await waitOnPage(page, 500);
      return true;
    }

    if (attempt === 0) {
      await waitOnPage(page, 250);
    }
  }

  return false;
};

const resolveTraderaAuthResolution = ({
  successVisible,
  loginFormVisible,
  manualVerificationDetected,
  cookieConsentVisible,
  knownAuthenticatedUrl,
  currentUrl,
}: {
  successVisible: boolean;
  loginFormVisible: boolean;
  manualVerificationDetected: boolean;
  cookieConsentVisible: boolean;
  knownAuthenticatedUrl: boolean;
  currentUrl: string;
}): TraderaAuthResolution => {
  const normalizedUrl = currentUrl.trim().toLowerCase();

  if (manualVerificationDetected) {
    return 'manual_verification_required';
  }

  if (
    successVisible ||
    (!cookieConsentVisible && !loginFormVisible && knownAuthenticatedUrl)
  ) {
    return 'authenticated';
  }

  if (loginFormVisible || normalizedUrl.includes('/login')) {
    return 'login_required';
  }

  return 'unknown';
};

export const readTraderaAuthState = async (page: Page): Promise<TraderaAuthState> => {
  const currentUrl = page.url().trim();
  const normalizedUrl = currentUrl.toLowerCase();
  const successVisible = Boolean(
    await findVisibleLocator(page, [...TRADERA_LOGIN_SUCCESS_SELECTORS])
  );
  const loginFormVisible = Boolean(
    await findVisibleLocator(page, [...TRADERA_LOGIN_FORM_SELECTORS])
  );
  const cookieConsentVisible = Boolean(
    await findVisibleLocator(page, [...TRADERA_COOKIE_ACCEPT_SELECTORS])
  );
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
  const knownAuthenticatedUrl = isKnownAuthenticatedTraderaUrl(normalizedUrl);
  const matchedSignals: string[] = [];
  if (successVisible) matchedSignals.push('success-selector');
  if (loginFormVisible) matchedSignals.push('login-form');
  if (cookieConsentVisible) matchedSignals.push('cookie-consent');
  if (knownAuthenticatedUrl) matchedSignals.push('authenticated-url');
  if (captchaDetected) matchedSignals.push('captcha');
  if (manualVerificationDetected && !captchaDetected) {
    matchedSignals.push('manual-verification');
  }
  if (errorText) matchedSignals.push('error-text');
  const resolution = resolveTraderaAuthResolution({
    successVisible,
    loginFormVisible,
    manualVerificationDetected,
    cookieConsentVisible,
    knownAuthenticatedUrl,
    currentUrl,
  });
  const loggedIn = resolution === 'authenticated';

  return {
    successVisible,
    loginFormVisible,
    currentUrl,
    loggedIn,
    errorText,
    captchaDetected,
    manualVerificationDetected,
    cookieConsentVisible,
    knownAuthenticatedUrl,
    resolution,
    matchedSignals,
  };
};

const buildTraderaAuthStateTimeoutError = ({
  phase,
  hasStoredSession,
  authState,
}: {
  phase: 'session_check' | 'login' | 'post_login' | 'listing_form';
  hasStoredSession: boolean;
  authState: TraderaAuthState;
}): Error =>
  internalError('AUTH_STATE_TIMEOUT: Tradera session validation did not resolve.', {
    phase,
    hasStoredSession,
    currentUrl: authState.currentUrl,
    errorText: authState.errorText || null,
    successVisible: authState.successVisible,
    loginFormVisible: authState.loginFormVisible,
    cookieConsentVisible: authState.cookieConsentVisible,
    knownAuthenticatedUrl: authState.knownAuthenticatedUrl,
    captchaDetected: authState.captchaDetected,
    manualVerificationDetected: authState.manualVerificationDetected,
    resolution: authState.resolution,
    matchedSignals: authState.matchedSignals,
  });

const waitForTraderaAuthResolution = async ({
  page,
  phase,
  hasStoredSession,
  timeoutMs = TRADERA_AUTH_RESOLUTION_TIMEOUT_MS,
}: {
  page: Page;
  phase: 'session_check' | 'login' | 'post_login' | 'listing_form';
  hasStoredSession: boolean;
  timeoutMs?: number;
}): Promise<TraderaAuthState> => {
  const maxAttempts = Math.max(1, Math.ceil(timeoutMs / TRADERA_AUTH_RESOLUTION_POLL_MS));
  let lastAuthState = await readTraderaAuthState(page);

  if (lastAuthState.resolution !== 'unknown') {
    return lastAuthState;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const cookiesAccepted = await clickTraderaCookiesIfVisible(page).catch(() => false);
    if (cookiesAccepted) {
      await waitOnPage(page, 250);
    }

    lastAuthState = await readTraderaAuthState(page);
    if (lastAuthState.resolution !== 'unknown') {
      return lastAuthState;
    }

    await waitOnPage(page, TRADERA_AUTH_RESOLUTION_POLL_MS);
  }

  throw buildTraderaAuthStateTimeoutError({
    phase,
    hasStoredSession,
    authState: lastAuthState,
  });
};

const waitForTraderaLoginControls = async (
  page: Page,
  timeoutMs = TRADERA_LOGIN_CONTROLS_TIMEOUT_MS
): Promise<{
  usernameInput: Locator;
  passwordInput: Locator;
  submitButton: Locator;
}> => {
  const maxAttempts = Math.max(1, Math.ceil(timeoutMs / 300));

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const [usernameInput, passwordInput, submitButton] = await Promise.all([
      findVisibleLocator(page, USERNAME_SELECTORS),
      findVisibleLocator(page, PASSWORD_SELECTORS),
      findVisibleLocator(page, LOGIN_BUTTON_SELECTORS),
    ]);

    if (usernameInput && passwordInput && submitButton) {
      return {
        usernameInput,
        passwordInput,
        submitButton,
      };
    }

    await waitOnPage(page, 300);
  }

  throw internalError('Unable to locate Tradera login form controls.', {
    currentUrl: page.url().trim(),
  });
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
  listingFormUrl: string,
  options: EnsureLoggedInOptions = {}
): Promise<void> => {
  const emitStatus = (update: TraderaEnsureLoggedInStatusUpdate): void => {
    options.onStatus?.(update);
  };
  const normalizedListingFormUrl = normalizeTraderaListingFormUrl(listingFormUrl);
  const hasStoredSession = Boolean(connection.playwrightStorageState?.trim());
  const sessionCheckUrl = 'https://www.tradera.com/en/my/listings?tab=active';
  const authFlowState: {
    currentAuthState: TraderaAuthState | null;
    sessionResolved: boolean;
    authSource: 'stored_session' | 'credential_login';
  } = {
    currentAuthState: null,
    sessionResolved: false,
    authSource: hasStoredSession ? 'stored_session' : 'credential_login',
  };

  const tracker = StepTracker.fromSteps(await buildResolvedActionSteps('tradera_auth'));
  const sequencer = new TraderaSequencer({
    page,
    tracker,
    actionKey: 'tradera_auth',
    emit: () => undefined,
    helpers: {
      acceptCookieConsent: async () => {
        await acceptTraderaCookies(page);
      },
      authCheckMode: 'observe',
      browserOpenLabel: 'Opening Tradera session check page.',
      browserOpenUrl: sessionCheckUrl,
      checkAuthStatus: async () => {
        if (authFlowState.sessionResolved) {
          return true;
        }

        emitStatus({
          status: 'waiting_for_session_check',
          message: 'Waiting for Tradera account state.',
        });
        const initialAuthState = await waitForTraderaAuthResolution({
          page,
          phase: 'session_check',
          hasStoredSession,
        });
        authFlowState.currentAuthState = initialAuthState;

        if (initialAuthState.resolution === 'authenticated') {
          emitStatus({
            status: 'stored_session_accepted',
            message: 'Stored Tradera session was accepted.',
            authState: initialAuthState,
          });
          authFlowState.sessionResolved = true;
          return true;
        }

        if (hasStoredSession) {
          emitStatus({
            status: 'stored_session_rejected',
            message: 'Stored Tradera session needs login or manual verification.',
            authState: initialAuthState,
          });
          throw buildTraderaAuthRequiredError({
            hasStoredSession: true,
            authState: initialAuthState,
          });
        }

        return false;
      },
      loginUrl: 'https://www.tradera.com/login',
      mode: 'auto',
      openPage: async (url: string) => {
        if (url === sessionCheckUrl) {
          emitStatus({
            status: 'opening_session_check',
            message: 'Opening Tradera session check page.',
          });
        } else if (url.includes('/login')) {
          emitStatus({
            status: 'opening_login',
            message: 'Opening Tradera login form.',
            authState: authFlowState.currentAuthState,
          });
        }

        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });
      },
      openSellPage: async () => {
        emitStatus({
          status: 'opening_listing_form',
          message: 'Opening Tradera listing form.',
          authState: authFlowState.currentAuthState,
        });
        await page.goto(normalizedListingFormUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });
        await acceptTraderaCookies(page);
        emitStatus({
          status: 'waiting_for_listing_form',
          message: 'Verifying Tradera listing form access.',
        });
        const listingAuthState = await waitForTraderaAuthResolution({
          page,
          phase: 'listing_form',
          hasStoredSession: authFlowState.authSource === 'stored_session',
        });
        authFlowState.currentAuthState = listingAuthState;
        if (
          listingAuthState.resolution !== 'authenticated' &&
          (listingAuthState.loginFormVisible || listingAuthState.manualVerificationDetected)
        ) {
          throw buildTraderaAuthRequiredError({
            hasStoredSession: authFlowState.authSource === 'stored_session',
            authState: listingAuthState,
          });
        }
      },
      performLogin: async () => {
        emitStatus({
          status: 'waiting_for_login_entry',
          message: 'Waiting for Tradera login page.',
        });
        const loginEntryAuthState = await waitForTraderaAuthResolution({
          page,
          phase: 'login',
          hasStoredSession: false,
        });
        authFlowState.currentAuthState = loginEntryAuthState;

        if (loginEntryAuthState.resolution === 'manual_verification_required') {
          throw buildTraderaAuthRequiredError({
            hasStoredSession: false,
            authState: loginEntryAuthState,
          });
        }

        if (loginEntryAuthState.resolution === 'authenticated') {
          emitStatus({
            status: 'stored_session_accepted',
            message: 'Stored Tradera session was accepted.',
            authState: loginEntryAuthState,
          });
          authFlowState.sessionResolved = true;
          authFlowState.authSource = 'credential_login';
          return;
        }

        emitStatus({
          status: 'waiting_for_login_controls',
          message: 'Waiting for Tradera login controls.',
          authState: loginEntryAuthState,
        });
        const { usernameInput, passwordInput, submitButton } =
          await waitForTraderaLoginControls(page);

        const decryptedPassword = decryptSecret(connection.password ?? '');
        await usernameInput.fill(connection.username ?? '');
        await passwordInput.fill(decryptedPassword);

        emitStatus({
          status: 'submitting_login',
          message: 'Submitting Tradera login credentials.',
        });
        await Promise.allSettled([
          page.waitForNavigation({
            waitUntil: 'domcontentloaded',
            timeout: 20_000,
          }),
          submitButton.click(),
        ]);
        await waitOnPage(page, 1500);
        await acceptTraderaCookies(page);

        emitStatus({
          status: 'waiting_for_post_login',
          message: 'Waiting for Tradera post-login verification.',
        });
        const postLoginAuthState = await waitForTraderaAuthResolution({
          page,
          phase: 'post_login',
          hasStoredSession: false,
        });
        authFlowState.currentAuthState = postLoginAuthState;
        if (postLoginAuthState.resolution !== 'authenticated') {
          throw buildTraderaAuthRequiredError({
            hasStoredSession: false,
            authState: postLoginAuthState,
          });
        }

        authFlowState.sessionResolved = true;
        authFlowState.authSource = 'credential_login';
      },
    },
  });

  await sequencer.run();
};
