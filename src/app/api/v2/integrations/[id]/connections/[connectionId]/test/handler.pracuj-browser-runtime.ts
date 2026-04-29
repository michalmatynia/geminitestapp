import {
  resolvePracujBrowserPreference,
  resolvePracujHeadless,
} from '@/features/integrations/services/pracuj-browser-auth';
import {
  openPlaywrightConnectionTestSession,
  resolvePlaywrightConnectionTestRuntime,
} from '@/features/playwright/server';

import { type ConnectionTestContext } from './types';

type PracujRuntime = Awaited<ReturnType<typeof resolvePlaywrightConnectionTestRuntime>>;
type PracujTestSession = Awaited<ReturnType<typeof openPlaywrightConnectionTestSession>>;

export const resolvePracujRuntime = (
  ctx: ConnectionTestContext,
  interactiveManualMode: boolean
): Promise<PracujRuntime> =>
  resolvePlaywrightConnectionTestRuntime({
    connection: ctx.connection,
    pushStep: ctx.pushStep,
    fail: ctx.fail,
    settingsStep: {
      pendingDetail: 'Resolving browser runtime settings',
      successDetail: 'Resolved browser runtime settings',
      failureDetail: 'Failed to resolve Playwright settings',
    },
    storedSession: {
      loadedDetail: 'Stored Pracuj.pl session loaded',
      missingDetail: 'No stored Pracuj.pl session found',
      missingStatus: interactiveManualMode ? 'ok' : 'failed',
    },
  });

export const openPracujTestSession = (input: {
  ctx: ConnectionTestContext;
  runtime: PracujRuntime;
  interactiveManualMode: boolean;
  quicklistPreflightMode: boolean;
}): Promise<PracujTestSession> => {
  const settings = input.runtime.settings;
  const headless = resolvePracujHeadless({
    interactiveManualMode: input.interactiveManualMode,
    quicklistPreflightMode: input.quicklistPreflightMode,
    configuredHeadless: settings.headless,
  });

  return openPlaywrightConnectionTestSession({
    connection: input.ctx.connection,
    pushStep: input.ctx.pushStep,
    runtime: input.runtime,
    headless,
    browserPreference: resolvePracujBrowserPreference({
      interactiveManualMode: input.interactiveManualMode,
      configuredBrowser: settings.browser,
    }),
    launchSettingsOverrides: {
      slowMo: input.interactiveManualMode ? Math.max(50, settings.slowMo) : settings.slowMo,
      proxyEnabled: settings.proxyEnabled,
      proxyServer: settings.proxyServer,
      proxyUsername: settings.proxyUsername,
      proxyPassword: settings.proxyPassword,
    },
    viewport: { width: 1366, height: 900 },
    launchStep: {
      stepName: 'Launching Playwright',
      pendingDetail: `Starting browser (headless=${headless ? 'on' : 'off'})`,
    },
  });
};
