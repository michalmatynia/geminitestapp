import type { BrowserContext, BrowserContextOptions, LaunchOptions } from 'playwright';
import type { PlaywrightIdentityProfile } from '@/shared/contracts/playwright';

export const DEFAULT_CHROMIUM_ANTI_DETECTION_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
export const SEARCH_CHROMIUM_ANTI_DETECTION_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
export const MARKETPLACE_CHROMIUM_ANTI_DETECTION_USER_AGENT =
  DEFAULT_CHROMIUM_ANTI_DETECTION_USER_AGENT;

export const DEFAULT_CHROMIUM_ANTI_DETECTION_ARGS = [
  '--disable-blink-features=AutomationControlled',
] as const;

export const DEFAULT_CHROMIUM_ANTI_DETECTION_IGNORED_DEFAULT_ARGS = [
  '--enable-automation',
] as const;

const CHROMIUM_USER_AGENT_DATA_BRANDS = [
  { brand: 'Chromium', version: '131' },
  { brand: 'Google Chrome', version: '131' },
  { brand: 'Not_A Brand', version: '24' },
] as const;

type ChromiumIdentityPreset = {
  userAgent: string;
  locale?: string;
  timezoneId?: string;
};

export type ChromiumAntiDetectionRuntimeBehavior = {
  prewarmUrl: string | null;
  prewarmWaitMs: number;
  postStartUrlWaitMs: number;
  launchCooldownMs: number;
};

const CHROMIUM_IDENTITY_PRESETS: Record<PlaywrightIdentityProfile, ChromiumIdentityPreset> = {
  default: {
    userAgent: DEFAULT_CHROMIUM_ANTI_DETECTION_USER_AGENT,
  },
  search: {
    userAgent: SEARCH_CHROMIUM_ANTI_DETECTION_USER_AGENT,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },
  marketplace: {
    userAgent: MARKETPLACE_CHROMIUM_ANTI_DETECTION_USER_AGENT,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },
};

const CHROMIUM_RUNTIME_BEHAVIORS: Record<
  PlaywrightIdentityProfile,
  Omit<ChromiumAntiDetectionRuntimeBehavior, 'prewarmUrl'>
> = {
  default: {
    prewarmWaitMs: 0,
    postStartUrlWaitMs: 0,
    launchCooldownMs: 0,
  },
  search: {
    prewarmWaitMs: 120,
    postStartUrlWaitMs: 80,
    launchCooldownMs: 350,
  },
  marketplace: {
    prewarmWaitMs: 90,
    postStartUrlWaitMs: 60,
    launchCooldownMs: 250,
  },
};

const mergeUniqueStringEntries = (
  current: readonly string[],
  additions: readonly string[]
): string[] => {
  const merged = new Set(
    current
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );
  for (const entry of additions) {
    const normalized = entry.trim();
    if (normalized.length > 0) {
      merged.add(normalized);
    }
  }
  return Array.from(merged);
};

const readOptionalTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const resolveNavigatorPlatformFromUserAgent = (userAgent: string): string => {
  const normalized = userAgent.toLowerCase();
  if (normalized.includes('windows')) {
    return 'Win32';
  }
  if (normalized.includes('linux')) {
    return 'Linux x86_64';
  }
  return 'MacIntel';
};

const resolveUserAgentDataPlatform = (navigatorPlatform: string): string => {
  const normalized = navigatorPlatform.toLowerCase();
  if (normalized.startsWith('win')) {
    return 'Windows';
  }
  if (normalized.startsWith('linux')) {
    return 'Linux';
  }
  return 'macOS';
};

const resolveWebGlIdentity = (
  userAgentDataPlatform: string
): { vendor: string; renderer: string } => {
  if (userAgentDataPlatform === 'Windows') {
    return {
      vendor: 'Google Inc. (Intel)',
      renderer: 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
    };
  }
  if (userAgentDataPlatform === 'Linux') {
    return {
      vendor: 'Intel',
      renderer: 'Mesa Intel(R) UHD Graphics 620 (KBL GT2)',
    };
  }
  return {
    vendor: 'Intel Inc.',
    renderer: 'Intel(R) Iris(TM) Plus Graphics OpenGL Engine',
  };
};

const buildAcceptLanguageHeader = (locale: string): string => {
  const normalized = locale.trim();
  if (normalized.length === 0) {
    return 'en-US,en;q=0.9';
  }
  const baseLanguage = normalized.split('-')[0]?.trim();
  if (!baseLanguage || baseLanguage.toLowerCase() === normalized.toLowerCase()) {
    return normalized;
  }
  return `${normalized},${baseLanguage};q=0.9`;
};

const buildNavigatorLanguages = (locale: string | null): string[] | null => {
  if (!locale) {
    return null;
  }
  const normalized = locale.trim();
  if (normalized.length === 0) {
    return null;
  }
  const baseLanguage = normalized.split('-')[0]?.trim();
  if (!baseLanguage || baseLanguage.toLowerCase() === normalized.toLowerCase()) {
    return [normalized];
  }
  return [normalized, baseLanguage];
};

const resolveIdentityPreset = (
  identityProfile: PlaywrightIdentityProfile | null | undefined
): ChromiumIdentityPreset => CHROMIUM_IDENTITY_PRESETS[identityProfile ?? 'default'];

const isLocalHostname = (hostname: string): boolean => {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized.endsWith('.localhost')
  );
};

export const resolveChromiumAntiDetectionRuntimeBehavior = ({
  identityProfile,
  startUrl,
}: {
  identityProfile: PlaywrightIdentityProfile | null | undefined;
  startUrl: string | null | undefined;
}): ChromiumAntiDetectionRuntimeBehavior => {
  const profile = identityProfile ?? 'default';
  const baseBehavior = CHROMIUM_RUNTIME_BEHAVIORS[profile];
  const normalizedStartUrl = readOptionalTrimmedString(startUrl);

  if (!normalizedStartUrl || profile === 'default') {
    return {
      prewarmUrl: null,
      ...baseBehavior,
    };
  }

  try {
    const parsed = new URL(normalizedStartUrl);
    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      isLocalHostname(parsed.hostname)
    ) {
      return {
        prewarmUrl: null,
        ...baseBehavior,
      };
    }

    const shouldPrewarm =
      parsed.pathname !== '/' || parsed.search.length > 0 || parsed.hash.length > 0;

    return {
      prewarmUrl: shouldPrewarm ? `${parsed.origin}/` : null,
      ...baseBehavior,
    };
  } catch {
    return {
      prewarmUrl: null,
      ...baseBehavior,
    };
  }
};

export const buildChromiumAntiDetectionLaunchOptions = (
  launchOptions: LaunchOptions
): LaunchOptions => {
  const currentArgs = Array.isArray(launchOptions.args)
    ? launchOptions.args.filter((entry): entry is string => typeof entry === 'string')
    : [];
  const nextIgnoreDefaultArgs =
    launchOptions.ignoreDefaultArgs === true
      ? true
      : mergeUniqueStringEntries(
          Array.isArray(launchOptions.ignoreDefaultArgs)
            ? launchOptions.ignoreDefaultArgs.filter(
                (entry): entry is string => typeof entry === 'string'
              )
            : [],
          DEFAULT_CHROMIUM_ANTI_DETECTION_IGNORED_DEFAULT_ARGS
        );

  return {
    ...launchOptions,
    args: mergeUniqueStringEntries(currentArgs, DEFAULT_CHROMIUM_ANTI_DETECTION_ARGS),
    ignoreDefaultArgs: nextIgnoreDefaultArgs,
  };
};

export const buildChromiumAntiDetectionContextOptions = (
  contextOptions: BrowserContextOptions,
  identityProfile: PlaywrightIdentityProfile | null | undefined = 'default'
): BrowserContextOptions => {
  const preset = resolveIdentityPreset(identityProfile);
  const userAgent = readOptionalTrimmedString(contextOptions.userAgent) ?? preset.userAgent;
  const locale = readOptionalTrimmedString(contextOptions.locale) ?? preset.locale ?? null;
  const timezoneId =
    readOptionalTrimmedString(contextOptions.timezoneId) ?? preset.timezoneId ?? null;
  const extraHeaders = {
    ...(contextOptions.extraHTTPHeaders ?? {}),
  };
  const hasAcceptLanguageHeader = Object.keys(extraHeaders).some(
    (key) => key.trim().toLowerCase() === 'accept-language'
  );

  if (locale && !hasAcceptLanguageHeader) {
    extraHeaders['Accept-Language'] = buildAcceptLanguageHeader(locale);
  }

  return {
    ...contextOptions,
    userAgent,
    ...(locale ? { locale } : {}),
    ...(timezoneId ? { timezoneId } : {}),
    ...(Object.keys(extraHeaders).length > 0 ? { extraHTTPHeaders: extraHeaders } : {}),
  };
};

export const installChromiumAntiDetectionInitScript = async (
  context: Pick<BrowserContext, 'addInitScript'>,
  input: Pick<BrowserContextOptions, 'locale' | 'userAgent'>
): Promise<void> => {
  const userAgent =
    readOptionalTrimmedString(input.userAgent) ??
    DEFAULT_CHROMIUM_ANTI_DETECTION_USER_AGENT;
  const locale = readOptionalTrimmedString(input.locale);
  const navigatorPlatform = resolveNavigatorPlatformFromUserAgent(userAgent);
  const userAgentDataPlatform = resolveUserAgentDataPlatform(navigatorPlatform);
  const navigatorLanguages = buildNavigatorLanguages(locale);
  const webGlIdentity = resolveWebGlIdentity(userAgentDataPlatform);

  await context.addInitScript(
    ({
      locale: injectedLocale,
      navigatorLanguages: injectedNavigatorLanguages,
      navigatorPlatform: injectedNavigatorPlatform,
      userAgentDataPlatform: injectedUserAgentDataPlatform,
      webGlIdentity: injectedWebGlIdentity,
      brands,
    }) => {
      const defineGetter = (target: object, key: string, getter: () => unknown): void => {
        try {
          Object.defineProperty(target, key, {
            configurable: true,
            get: getter,
          });
        } catch {
          // Ignore non-configurable properties in older browser builds.
        }
      };

      defineGetter(Navigator.prototype, 'webdriver', () => undefined);
      defineGetter(Navigator.prototype, 'platform', () => injectedNavigatorPlatform);
      defineGetter(Navigator.prototype, 'vendor', () => 'Google Inc.');
      defineGetter(Navigator.prototype, 'hardwareConcurrency', () => 8);
      defineGetter(Navigator.prototype, 'deviceMemory', () => 8);
      defineGetter(Navigator.prototype, 'maxTouchPoints', () => 0);
      defineGetter(Navigator.prototype, 'pdfViewerEnabled', () => true);

      if (Array.isArray(injectedNavigatorLanguages) && injectedNavigatorLanguages.length > 0) {
        defineGetter(Navigator.prototype, 'language', () => injectedLocale);
        defineGetter(Navigator.prototype, 'languages', () => [...injectedNavigatorLanguages]);
      }

      defineGetter(Navigator.prototype, 'plugins', () => ({
        length: 5,
        item: (index: number) => (index >= 0 && index < 5 ? {} : null),
        namedItem: () => null,
        refresh: () => undefined,
      }));
      defineGetter(Navigator.prototype, 'mimeTypes', () => ({
        length: 2,
        item: (index: number) => (index >= 0 && index < 2 ? {} : null),
        namedItem: () => null,
      }));

      const originalPermissionsQuery = window.navigator.permissions?.query?.bind(
        window.navigator.permissions
      );
      if (originalPermissionsQuery) {
        window.navigator.permissions.query = (
          parameters: PermissionDescriptor
        ): Promise<PermissionStatus> => {
          if (parameters?.name === 'notifications') {
            const permissionState =
              typeof Notification !== 'undefined' ? Notification.permission : 'default';
            return Promise.resolve({
              name: parameters.name,
              state: permissionState,
              onchange: null,
              addEventListener: () => undefined,
              removeEventListener: () => undefined,
              dispatchEvent: () => false,
            } as PermissionStatus);
          }
          return originalPermissionsQuery(parameters);
        };
      }

      const chromeRuntime = {
        runtime: {},
        app: {
          isInstalled: false,
        },
        csi: () => ({
          onloadT: Date.now(),
          startE: Date.now(),
          pageT: Math.max(1, Math.trunc(performance.now())),
          tran: 15,
        }),
      };
      defineGetter(window, 'chrome', () => chromeRuntime);
      defineGetter(Navigator.prototype, 'userAgentData', () => ({
        brands: brands.map((entry) => ({ ...entry })),
        mobile: false,
        platform: injectedUserAgentDataPlatform,
        getHighEntropyValues: async (hints: string[]) => {
          const values: Record<string, unknown> = {
            architecture: 'x86',
            bitness: '64',
            mobile: false,
            model: '',
            platform: injectedUserAgentDataPlatform,
            platformVersion: injectedUserAgentDataPlatform === 'Windows' ? '10.0.0' : '13.0.0',
            uaFullVersion: '131.0.0.0',
            fullVersionList: brands.map((entry) => ({ ...entry })),
            wow64: false,
          };
          return (hints ?? []).reduce<Record<string, unknown>>((result, hint) => {
            if (hint in values) {
              result[hint] = values[hint];
            }
            return result;
          }, {});
        },
        toJSON: () => ({
          brands: brands.map((entry) => ({ ...entry })),
          mobile: false,
          platform: injectedUserAgentDataPlatform,
        }),
      }));

      const patchWebGlGetParameter = (prototype: object | undefined): void => {
        if (!prototype || typeof (prototype as { getParameter?: unknown }).getParameter !== 'function') {
          return;
        }
        const originalGetParameter = (
          prototype as { getParameter: (parameter: number) => unknown }
        ).getParameter;
        Object.defineProperty(prototype, 'getParameter', {
          configurable: true,
          value: function patchedGetParameter(parameter: number): unknown {
            if (parameter === 37445) {
              return injectedWebGlIdentity.vendor;
            }
            if (parameter === 37446) {
              return injectedWebGlIdentity.renderer;
            }
            return originalGetParameter.call(this, parameter);
          },
        });
      };

      patchWebGlGetParameter(
        typeof WebGLRenderingContext === 'undefined' ? undefined : WebGLRenderingContext.prototype
      );
      patchWebGlGetParameter(
        typeof WebGL2RenderingContext === 'undefined' ? undefined : WebGL2RenderingContext.prototype
      );
    },
    {
      locale,
      navigatorLanguages,
      navigatorPlatform,
      userAgentDataPlatform,
      webGlIdentity,
      brands: CHROMIUM_USER_AGENT_DATA_BRANDS,
    }
  );
};
