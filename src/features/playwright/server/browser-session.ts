import 'server-only';

import type { Browser, BrowserContext, Page } from 'playwright';

import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { PlaywrightRelistBrowserMode } from '@/shared/contracts/integrations/listings';
import {
  launchPlaywrightBrowser,
  type PlaywrightBrowserPreference,
} from '@/shared/lib/playwright/browser-launch';
import {
  buildPlaywrightConnectionContextOptions,
  buildPlaywrightConnectionLaunchOptions,
  resolvePlaywrightConnectionRuntime,
  type ResolvedPlaywrightConnectionRuntime,
} from './connection-runtime';
import type { TraderaPlaywrightRuntimeSettings } from './settings';
import type { PlaywrightEngineRunInstance } from './runtime';

type OpenPlaywrightConnectionPageSessionLaunchSettingsOverrides = Partial<
  Pick<
    TraderaPlaywrightRuntimeSettings,
    'slowMo' | 'proxyEnabled' | 'proxyServer' | 'proxyUsername' | 'proxyPassword'
  >
>;

export type OpenPlaywrightConnectionPageSessionInput = {
  connection: IntegrationConnectionRecord;
  instance?: PlaywrightEngineRunInstance | null;
  runtime?: ResolvedPlaywrightConnectionRuntime;
  browserPreference?: PlaywrightBrowserPreference;
  headless?: boolean;
  launchSettingsOverrides?: OpenPlaywrightConnectionPageSessionLaunchSettingsOverrides;
  viewport?: { width: number; height: number };
};

export type PlaywrightConnectionSessionMetadata = {
  instance: PlaywrightEngineRunInstance | null;
  browserLabel: string;
  fallbackMessages: string[];
  resolvedBrowserPreference: PlaywrightBrowserPreference;
  personaId: string | null;
  deviceProfileName: string | null;
};

export type OpenPlaywrightConnectionPageSessionResult = {
  runtime: ResolvedPlaywrightConnectionRuntime;
  instance: PlaywrightEngineRunInstance | null;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  launchLabel: string;
  fallbackMessages: string[];
  close: () => Promise<void>;
};

export type OpenPlaywrightConnectionNativeTaskSessionInput = Omit<
  OpenPlaywrightConnectionPageSessionInput,
  'browserPreference' | 'headless'
> & {
  requestedBrowserMode?: PlaywrightRelistBrowserMode;
  requestedBrowserPreference?: PlaywrightBrowserPreference;
};

export type OpenPlaywrightConnectionNativeTaskSessionResult =
  OpenPlaywrightConnectionPageSessionResult & {
    sessionMetadata: PlaywrightConnectionSessionMetadata;
    requestedBrowserMode: PlaywrightRelistBrowserMode | null;
    requestedBrowserPreference: PlaywrightBrowserPreference | null;
    effectiveBrowserMode: 'headed' | 'headless';
    effectiveBrowserPreference: PlaywrightBrowserPreference;
  };

const resolveRequestedHeadlessForBrowserMode = (
  requestedBrowserMode: PlaywrightRelistBrowserMode | undefined
): boolean | undefined =>
  requestedBrowserMode === 'headless'
    ? true
    : requestedBrowserMode === 'headed'
      ? false
      : undefined;

export const resolvePlaywrightEffectiveBrowserMode = ({
  requestedBrowserMode,
  connectionHeadless,
}: {
  requestedBrowserMode: PlaywrightRelistBrowserMode | undefined;
  connectionHeadless: boolean;
}): 'headed' | 'headless' =>
  requestedBrowserMode === 'headed'
    ? 'headed'
    : requestedBrowserMode === 'headless'
      ? 'headless'
      : connectionHeadless
        ? 'headless'
        : 'headed';

export const resolvePlaywrightBrowserPreferenceFromLabel = ({
  launchLabel,
  requestedBrowserPreference,
}: {
  launchLabel: string;
  requestedBrowserPreference: PlaywrightBrowserPreference;
}): PlaywrightBrowserPreference => {
  const normalizedLabel = launchLabel.trim().toLowerCase();
  if (normalizedLabel.includes('brave')) return 'brave';
  if (normalizedLabel.includes('chrome')) return 'chrome';
  if (normalizedLabel.includes('chromium')) return 'chromium';
  return requestedBrowserPreference;
};

export const buildPlaywrightNativeTaskMetadata = <
  TAdditional extends Record<string, unknown> = Record<string, unknown>,
>(
  input: {
    session: Pick<
      OpenPlaywrightConnectionNativeTaskSessionResult,
      | 'sessionMetadata'
      | 'effectiveBrowserMode'
      | 'effectiveBrowserPreference'
      | 'requestedBrowserMode'
      | 'requestedBrowserPreference'
    >;
    additional?: TAdditional;
  }
): {
  browserMode: 'headed' | 'headless';
  browserPreference: PlaywrightBrowserPreference;
  browserLabel: string;
  fallbackMessages: string[];
  playwright: PlaywrightConnectionSessionMetadata;
} & Partial<{
  requestedBrowserMode: PlaywrightRelistBrowserMode;
  requestedBrowserPreference: PlaywrightBrowserPreference;
}> &
  TAdditional => ({
  browserMode: input.session.effectiveBrowserMode,
  ...(input.session.requestedBrowserMode
    ? { requestedBrowserMode: input.session.requestedBrowserMode }
    : {}),
  browserPreference: input.session.effectiveBrowserPreference,
  ...(input.session.requestedBrowserPreference
    ? { requestedBrowserPreference: input.session.requestedBrowserPreference }
    : {}),
  browserLabel: input.session.sessionMetadata.browserLabel,
  fallbackMessages: input.session.sessionMetadata.fallbackMessages,
  playwright: input.session.sessionMetadata,
  ...(input.additional ?? ({} as TAdditional)),
});

export const openPlaywrightConnectionPageSession = async (
  input: OpenPlaywrightConnectionPageSessionInput
): Promise<OpenPlaywrightConnectionPageSessionResult> => {
  const runtime =
    input.runtime ?? (await resolvePlaywrightConnectionRuntime(input.connection));
  const browserPreference = input.browserPreference ?? runtime.browserPreference;
  const headless =
    typeof input.headless === 'boolean' ? input.headless : runtime.settings.headless;
  const launchSettings = {
    ...runtime.settings,
    ...(input.launchSettingsOverrides ?? {}),
  };

  const launchResult = await launchPlaywrightBrowser(
    browserPreference,
    buildPlaywrightConnectionLaunchOptions({
      settings: launchSettings,
      headless,
    })
  );

  const context = await launchResult.browser.newContext(
    buildPlaywrightConnectionContextOptions({
      runtime,
      viewport: input.viewport,
    })
  );
  context.setDefaultTimeout(runtime.settings.timeout);
  context.setDefaultNavigationTimeout(runtime.settings.navigationTimeout);

  const page = await context.newPage();

  return {
    runtime,
    instance: input.instance ?? null,
    browser: launchResult.browser,
    context,
    page,
    launchLabel: launchResult.label,
    fallbackMessages: launchResult.fallbackMessages,
    close: async () => {
      await context.close().catch(() => undefined);
      await launchResult.browser.close();
    },
  };
};

export const buildPlaywrightConnectionSessionMetadata = (
  session: Pick<
    OpenPlaywrightConnectionPageSessionResult,
    'instance' | 'runtime' | 'launchLabel' | 'fallbackMessages'
  >
): PlaywrightConnectionSessionMetadata => ({
  instance: session.instance ?? null,
  browserLabel: session.launchLabel,
  fallbackMessages: [...session.fallbackMessages],
  resolvedBrowserPreference: session.runtime.browserPreference,
  personaId: session.runtime.personaId ?? null,
  deviceProfileName: session.runtime.deviceProfileName ?? null,
});

export const openPlaywrightConnectionNativeTaskSession = async (
  input: OpenPlaywrightConnectionNativeTaskSessionInput
): Promise<OpenPlaywrightConnectionNativeTaskSessionResult> => {
  const session = await openPlaywrightConnectionPageSession({
    connection: input.connection,
    instance: input.instance,
    browserPreference: input.requestedBrowserPreference,
    headless: resolveRequestedHeadlessForBrowserMode(input.requestedBrowserMode),
    viewport: input.viewport,
  });
  const sessionMetadata = buildPlaywrightConnectionSessionMetadata(session);
  const requestedBrowserPreference =
    input.requestedBrowserPreference ?? sessionMetadata.resolvedBrowserPreference;

  return {
    ...session,
    sessionMetadata,
    requestedBrowserMode: input.requestedBrowserMode ?? null,
    requestedBrowserPreference: input.requestedBrowserPreference ?? null,
    effectiveBrowserMode: resolvePlaywrightEffectiveBrowserMode({
      requestedBrowserMode: input.requestedBrowserMode,
      connectionHeadless: session.runtime.settings.headless,
    }),
    effectiveBrowserPreference: resolvePlaywrightBrowserPreferenceFromLabel({
      launchLabel: session.launchLabel,
      requestedBrowserPreference,
    }),
  };
};
