import { decryptSecret } from '@/features/integrations/server';
import {
  hasPracujText,
  type PracujCredentials,
  type PracujLoginMode,
} from '@/features/integrations/services/pracuj-browser-auth';
import {
  createPlaywrightConnectionTestFailureResponse,
  createPlaywrightConnectionTestSuccessResponse,
  persistPlaywrightConnectionTestSession,
} from '@/features/playwright/server';
import { PracujSequencer } from '@/shared/lib/browser-execution/sequencers/PracujSequencer';
import { StepTracker } from '@/shared/lib/browser-execution/step-tracker';
import { buildResolvedActionSteps } from '@/shared/lib/browser-execution/runtime-action-resolver.server';
import type { BrowserExecutionStep } from '@/shared/lib/browser-execution/step-registry';
import type { TestLogEntry } from '@/shared/contracts/integrations/session-testing';

import { openPracujTestSession, resolvePracujRuntime } from './handler.pracuj-browser-runtime';
import { type ConnectionTestContext } from './types';

type PracujAuthMode = 'auto' | 'manual' | 'manual_session_refresh' | 'quicklist_preflight';

const toTestLogEntry = (step: BrowserExecutionStep): TestLogEntry => ({
  step: step.label,
  status:
    step.status === 'success' || step.status === 'skipped'
      ? 'ok'
      : step.status === 'error'
        ? 'failed'
        : 'pending',
  detail: step.message ?? step.label,
  timestamp: step.completedAt ?? step.startedAt ?? new Date().toISOString(),
});

const resolvePracujLoginMode = (ctx: ConnectionTestContext): PracujLoginMode => {
  const stored = ctx.connection.pracujLoginMode;
  if (stored === 'google' || stored === 'one_time_code') return stored;
  return 'password';
};

const resolveAuthMode = (ctx: ConnectionTestContext): PracujAuthMode => {
  if (ctx.quicklistPreflightMode === true) return 'quicklist_preflight';
  if (ctx.manualSessionRefreshMode === true) return 'manual_session_refresh';
  if (ctx.manualMode === true) return 'manual';
  return 'auto';
};

const resolveInteractiveManualMode = (ctx: ConnectionTestContext): boolean => {
  const loginMode = resolvePracujLoginMode(ctx);
  return (
    ctx.manualMode === true ||
    ctx.manualSessionRefreshMode === true ||
    loginMode === 'google' ||
    loginMode === 'one_time_code'
  );
};

const decryptPracujCredentials = (ctx: ConnectionTestContext): PracujCredentials | null => {
  const username = ctx.connection.username?.trim() ?? '';
  const encryptedPassword =
    typeof ctx.connection.password === 'string' ? ctx.connection.password : '';
  if (!username || !encryptedPassword.trim()) return null;
  try {
    const password = decryptSecret(encryptedPassword);
    if (!hasPracujText(password)) return null;
    return { username, password };
  } catch {
    return null;
  }
};

export const handlePracujBrowserTest = async (ctx: ConnectionTestContext): Promise<Response> => {
  const loginMode = resolvePracujLoginMode(ctx);
  const mode = resolveAuthMode(ctx);
  const interactiveManualMode = resolveInteractiveManualMode(ctx);
  const quicklistPreflightMode = mode === 'quicklist_preflight';
  const credentials = decryptPracujCredentials(ctx);

  const runtime = await resolvePracujRuntime(ctx, interactiveManualMode);
  const session = await openPracujTestSession({
    ctx,
    runtime,
    interactiveManualMode,
    quicklistPreflightMode,
  });

  const steps = await buildResolvedActionSteps('pracuj_auth');
  const tracker = StepTracker.fromSteps(steps);

  const sequencer = new PracujSequencer({
    page: session.page,
    tracker,
    actionKey: 'pracuj_auth',
    emit: () => {},
    helpers: {
      credentials,
      loginMode,
      mode,
      manualLoginTimeoutMs: ctx.manualLoginTimeoutMs,
      authCheckMode: quicklistPreflightMode ? 'require' : 'observe',
    },
  });

  try {
    await sequencer.run();

    const logEntries = tracker.getSteps().map(toTestLogEntry);
    ctx.steps.push(...logEntries);

    if (!quicklistPreflightMode) {
      await persistPlaywrightConnectionTestSession({
        connectionId: ctx.connection.id,
        page: session.page,
        repo: ctx.repo,
        pushStep: ctx.pushStep,
        pendingDetail: 'Saving Pracuj.pl browser session',
        successDetail: 'Pracuj.pl browser session saved',
        failureDetail: 'Failed to save Pracuj.pl browser session',
      });
    }

    const message =
      mode === 'manual_session_refresh'
        ? 'Pracuj.pl session refreshed successfully.'
        : quicklistPreflightMode
          ? 'Pracuj.pl session is active.'
          : 'Pracuj.pl session verified successfully.';

    return createPlaywrightConnectionTestSuccessResponse({
      steps: ctx.steps,
      message,
      sessionReady: true,
    });
  } catch (error) {
    const logEntries = tracker.getSteps().map(toTestLogEntry);
    ctx.steps.push(...logEntries);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return createPlaywrightConnectionTestFailureResponse({
      message: errorMsg,
      steps: ctx.steps,
      status: errorMsg.includes('AUTH_REQUIRED') ? 409 : undefined,
    });
  } finally {
    await session.close().catch(() => undefined);
  }
};
