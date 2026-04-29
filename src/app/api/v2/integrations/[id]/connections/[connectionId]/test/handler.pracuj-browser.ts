import { decryptSecret } from '@/features/integrations/server';
import {
  PRACUJ_ACCOUNT_CHECK_URL,
  PRACUJ_AUTH_ENTRY_URL,
  PRACUJ_AUTH_REQUIRED_DETAIL,
  hasPracujText,
  hasUsablePracujCredentials,
  type PracujCredentials,
  readPracujAuthState,
  safePracujGoto,
  trySubmitPracujCredentials,
  waitForPracujManualLogin,
} from '@/features/integrations/services/pracuj-browser-auth';
import {
  createPlaywrightConnectionTestSuccessResponse,
  persistPlaywrightConnectionTestSession,
} from '@/features/playwright/server';

import { openPracujTestSession, resolvePracujRuntime } from './handler.pracuj-browser-runtime';
import { type ConnectionTestContext } from './types';

type PracujPage = Parameters<typeof readPracujAuthState>[0];

const shouldSkipCredentialDecrypt = (input: {
  username: string;
  encryptedPassword: string;
  quicklistPreflightMode: boolean;
}): boolean =>
  [
    input.username.length === 0,
    input.encryptedPassword.trim().length === 0,
    input.quicklistPreflightMode,
  ].some((result) => result);

const resolveInteractiveManualMode = (ctx: ConnectionTestContext): boolean =>
  ctx.manualMode === true || ctx.manualSessionRefreshMode === true;

const pushManualModeStep = (ctx: ConnectionTestContext, timeoutMs: number): void => {
  if (!resolveInteractiveManualMode(ctx)) return;

  ctx.pushStep(
    'Manual mode',
    'ok',
    `${
      ctx.manualSessionRefreshMode === true ? 'Manual session refresh' : 'Manual login'
    } enabled (timeout ${timeoutMs}ms).`
  );
};

const handleCredentialDecryptFailure = async (
  ctx: ConnectionTestContext,
  interactiveManualMode: boolean
): Promise<null> => {
  const failureStatus = interactiveManualMode ? 'pending' : 'failed';
  ctx.pushStep(
    'Credentials',
    failureStatus,
    'Stored Pracuj.pl password could not be decrypted.'
  );
  if (!interactiveManualMode) {
    await ctx.fail('Credentials', 'Stored Pracuj.pl password could not be decrypted.');
  }
  return null;
};

const resolvePracujCredentials = async (
  ctx: ConnectionTestContext,
  interactiveManualMode: boolean,
  quicklistPreflightMode: boolean
): Promise<PracujCredentials | null> => {
  const username = ctx.connection.username?.trim() ?? '';
  const encryptedPassword =
    typeof ctx.connection.password === 'string' ? ctx.connection.password : '';
  if (shouldSkipCredentialDecrypt({ username, encryptedPassword, quicklistPreflightMode })) {
    return null;
  }

  try {
    const password = decryptSecret(encryptedPassword);
    ctx.pushStep('Credentials', 'ok', 'Stored Pracuj.pl credentials are available for autofill.');
    if (!hasPracujText(password)) return null;
    return { username, password };
  } catch (_error) {
    return handleCredentialDecryptFailure(ctx, interactiveManualMode);
  }
};

const handleStoredSessionPreflight = async (
  ctx: ConnectionTestContext,
  page: PracujPage,
  interactiveManualMode: boolean
): Promise<Response | null> => {
  ctx.pushStep('Session preflight', 'pending', 'Checking stored Pracuj.pl session...');
  await safePracujGoto(page, PRACUJ_ACCOUNT_CHECK_URL);
  const authState = await readPracujAuthState(page);
  if (!authState.loggedIn) {
    ctx.pushStep('Session preflight', 'failed', 'Stored Pracuj.pl session is not active.');
    return null;
  }

  ctx.pushStep('Session preflight', 'ok', 'Stored Pracuj.pl session is active.');
  if (ctx.quicklistPreflightMode === true || !interactiveManualMode) {
    return createPlaywrightConnectionTestSuccessResponse({
      steps: ctx.steps,
      message: 'Pracuj.pl session is active.',
      sessionReady: true,
    });
  }

  return null;
};

const resolveAuthenticationStart = (
  credentials: PracujCredentials | null,
  interactiveManualMode: boolean
): {
  stepName: 'Manual login' | 'Authentication';
  detail: string;
} => {
  if (interactiveManualMode) {
    return {
      stepName: 'Manual login',
      detail: 'Opening Pracuj.pl login window.',
    };
  }

  return {
    stepName: 'Authentication',
    detail: `Attempting Pracuj.pl login as ${credentials?.username ?? 'configured profile'}.`,
  };
};

const maybeAutofillPracujCredentials = async (
  ctx: ConnectionTestContext,
  page: PracujPage,
  credentials: PracujCredentials | null
): Promise<void> => {
  const authStateAfterOpen = await readPracujAuthState(page);
  if (authStateAfterOpen.loggedIn || !hasUsablePracujCredentials(credentials)) return;

  await trySubmitPracujCredentials(
    page,
    credentials.username,
    credentials.password,
    ctx.pushStep
  );
};

const ensurePracujAuthentication = async (
  ctx: ConnectionTestContext,
  page: PracujPage,
  credentials: PracujCredentials | null,
  interactiveManualMode: boolean
): Promise<void> => {
  const start = resolveAuthenticationStart(credentials, interactiveManualMode);
  ctx.pushStep(start.stepName, 'pending', start.detail);
  await safePracujGoto(page, PRACUJ_AUTH_ENTRY_URL, 45_000);
  await maybeAutofillPracujCredentials(ctx, page, credentials);
};

const waitForInteractivePracujLogin = async (
  ctx: ConnectionTestContext,
  page: PracujPage
): Promise<void> => {
  ctx.pushStep(
    'Manual login',
    'pending',
    `Complete Pracuj.pl login in the opened browser window. Waiting up to ${Math.round(
      ctx.manualLoginTimeoutMs / 1000
    )}s.`
  );
  const success = await waitForPracujManualLogin(page, ctx.manualLoginTimeoutMs);
  if (!success) {
    await ctx.fail(
      'Manual login',
      `Manual Pracuj.pl login timed out after ${Math.round(
        ctx.manualLoginTimeoutMs / 1000
      )}s.`,
      409
    );
  }
  ctx.pushStep('Manual login', 'ok', 'Pracuj.pl logged-in state detected.');
};

const verifyAndPersistPracujSession = async (
  ctx: ConnectionTestContext,
  page: PracujPage
): Promise<Response> => {
  ctx.pushStep('Verifying session', 'pending', 'Checking Pracuj.pl account access...');
  await safePracujGoto(page, PRACUJ_ACCOUNT_CHECK_URL);
  const finalAuthState = await readPracujAuthState(page);
  if (!finalAuthState.loggedIn) {
    return await ctx.fail('Verifying session', PRACUJ_AUTH_REQUIRED_DETAIL, 409);
  }
  ctx.pushStep('Verifying session', 'ok', 'Pracuj.pl account access verified.');

  await persistPlaywrightConnectionTestSession({
    connectionId: ctx.connection.id,
    page,
    repo: ctx.repo,
    pushStep: ctx.pushStep,
    pendingDetail: 'Saving Pracuj.pl browser session',
    successDetail: 'Pracuj.pl browser session saved',
    failureDetail: 'Failed to save Pracuj.pl browser session',
  });

  return createPlaywrightConnectionTestSuccessResponse({
    steps: ctx.steps,
    message: 'Pracuj.pl session refreshed successfully.',
    sessionReady: true,
  });
};

const runPracujAuthFlow = async (input: {
  ctx: ConnectionTestContext;
  page: PracujPage;
  credentials: PracujCredentials | null;
  interactiveManualMode: boolean;
  quicklistPreflightMode: boolean;
  hasStoredSession: boolean;
}): Promise<Response> => {
  if (input.hasStoredSession) {
    const storedSessionResponse = await handleStoredSessionPreflight(
      input.ctx,
      input.page,
      input.interactiveManualMode
    );
    if (storedSessionResponse !== null) return storedSessionResponse;
  }

  if (input.quicklistPreflightMode) {
    return await input.ctx.fail('Session preflight', PRACUJ_AUTH_REQUIRED_DETAIL, 409);
  }
  if (!input.interactiveManualMode && input.credentials === null) {
    return await input.ctx.fail(
      'Authentication',
      'AUTH_REQUIRED: Pracuj.pl credentials are missing and no reusable browser session is active.',
      409
    );
  }

  await ensurePracujAuthentication(
    input.ctx,
    input.page,
    input.credentials,
    input.interactiveManualMode
  );
  if (input.interactiveManualMode) {
    await waitForInteractivePracujLogin(input.ctx, input.page);
  }
  return await verifyAndPersistPracujSession(input.ctx, input.page);
};

export const handlePracujBrowserTest = async (
  ctx: ConnectionTestContext
): Promise<Response> => {
  const interactiveManualMode = resolveInteractiveManualMode(ctx);
  const quicklistPreflightMode = ctx.quicklistPreflightMode === true;
  pushManualModeStep(ctx, ctx.manualLoginTimeoutMs);
  const runtime = await resolvePracujRuntime(ctx, interactiveManualMode);
  const credentials = await resolvePracujCredentials(
    ctx,
    interactiveManualMode,
    quicklistPreflightMode
  );
  const session = await openPracujTestSession({
    ctx,
    runtime,
    interactiveManualMode,
    quicklistPreflightMode,
  });

  try {
    return await runPracujAuthFlow({
      ctx,
      page: session.page,
      credentials,
      interactiveManualMode,
      quicklistPreflightMode,
      hasStoredSession: runtime.storageState !== null,
    });
  } finally {
    await session.close().catch(() => undefined);
  }
};
