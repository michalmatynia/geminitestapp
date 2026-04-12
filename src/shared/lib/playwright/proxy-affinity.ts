import { createHash, randomUUID } from 'crypto';

import type { LaunchOptions } from 'playwright';

import type {
  PlaywrightIdentityProfile,
  PlaywrightProxyProviderPreset,
} from '@/shared/contracts/playwright';

const PLAYWRIGHT_PROXY_SESSION_PLACEHOLDER_PATTERNS = [
  /\{session\}/gi,
  /\{\{session\}\}/gi,
  /\$\{session\}/gi,
  /__session__/gi,
] as const;

export const PLAYWRIGHT_PROXY_SESSION_PLACEHOLDER = '{session}';
const DEFAULT_PROXY_SESSION_MODE = 'sticky' as const;

type ProxyAffinityDescriptor = {
  scopeLabel: string;
  sessionToken: string;
  origin: string | null;
  mode: 'sticky' | 'rotate';
  providerPreset: PlaywrightProxyProviderPreset;
};

export type PlaywrightProxySessionAffinityResult = {
  launchOptions: LaunchOptions;
  applied: boolean;
  descriptor: ProxyAffinityDescriptor | null;
  mutations: Array<{
    field: 'server' | 'username' | 'password';
    source: 'placeholder' | 'provider_preset';
  }>;
  reason:
    | 'disabled'
    | 'no-proxy'
    | 'no-scope'
    | 'no-placeholder'
    | 'applied';
};

const readOptionalTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeUrlOrigin = (value: string | null | undefined): string | null => {
  const normalized = readOptionalTrimmedString(value);
  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.origin : null;
  } catch {
    return null;
  }
};

const replaceProxySessionPlaceholders = (
  value: string | undefined,
  sessionToken: string
): { value: string | undefined; changed: boolean } => {
  if (typeof value !== 'string' || value.length === 0) {
    return { value, changed: false };
  }

  let nextValue = value;
  let changed = false;
  for (const pattern of PLAYWRIGHT_PROXY_SESSION_PLACEHOLDER_PATTERNS) {
    const replaced = nextValue.replace(pattern, sessionToken);
    if (replaced !== nextValue) {
      changed = true;
      nextValue = replaced;
    }
  }

  return {
    value: nextValue,
    changed,
  };
};

const applyProviderPresetToUsername = (input: {
  username: string | undefined;
  sessionToken: string;
  providerPreset: PlaywrightProxyProviderPreset;
}): { value: string | undefined; changed: boolean } => {
  if (typeof input.username !== 'string' || input.username.trim().length === 0) {
    return { value: input.username, changed: false };
  }

  if (input.providerPreset === 'custom') {
    return { value: input.username, changed: false };
  }

  const suffixPattern =
    input.providerPreset === 'oxylabs' ? /-sessid-[A-Za-z0-9]+/i : /-session-[A-Za-z0-9]+/i;
  const suffixValue =
    input.providerPreset === 'oxylabs'
      ? `-sessid-${input.sessionToken}`
      : `-session-${input.sessionToken}`;

  if (suffixPattern.test(input.username)) {
    const replaced = input.username.replace(suffixPattern, suffixValue);
    return { value: replaced, changed: replaced !== input.username };
  }

  return {
    value: `${input.username}${suffixValue}`,
    changed: true,
  };
};

const resolveProxyAffinityDescriptor = (input: {
  mode: 'sticky' | 'rotate';
  providerPreset: PlaywrightProxyProviderPreset;
  identityProfile: PlaywrightIdentityProfile | null | undefined;
  proxyServer: string;
  connectionId?: string | null;
  ownerUserId?: string | null;
  integrationId?: string | null;
  personaId?: string | null;
  startUrl?: string | null;
  runScopeKey?: string | null;
}): ProxyAffinityDescriptor | null => {
  const mode = input.mode === 'rotate' ? 'rotate' : DEFAULT_PROXY_SESSION_MODE;
  const scopeLabel =
    readOptionalTrimmedString(input.connectionId)
      ? `connection:${readOptionalTrimmedString(input.connectionId)}`
      : readOptionalTrimmedString(input.ownerUserId)
        ? `owner:${readOptionalTrimmedString(input.ownerUserId)}`
        : readOptionalTrimmedString(input.integrationId)
          ? `integration:${readOptionalTrimmedString(input.integrationId)}`
          : null;

  if (!scopeLabel) {
    return null;
  }

  const personaId = readOptionalTrimmedString(input.personaId) ?? 'default-persona';
  const origin = normalizeUrlOrigin(input.startUrl);
  const runScopeKey =
    mode === 'rotate'
      ? readOptionalTrimmedString(input.runScopeKey) ?? randomUUID()
      : null;
  const sessionToken = `pw${createHash('sha256')
    .update(
      JSON.stringify({
        scopeLabel,
        mode,
        providerPreset: input.providerPreset,
        identityProfile: input.identityProfile ?? 'default',
        personaId,
        origin,
        proxyServer: input.proxyServer,
        ...(runScopeKey ? { runScopeKey } : {}),
      })
    )
    .digest('hex')
    .slice(0, 20)}`;

  return {
    scopeLabel,
    sessionToken,
    origin,
    mode,
    providerPreset: input.providerPreset,
  };
};

export const applyPlaywrightProxySessionAffinity = (input: {
  enabled: boolean;
  mode: 'sticky' | 'rotate';
  providerPreset: PlaywrightProxyProviderPreset;
  launchOptions: LaunchOptions;
  identityProfile: PlaywrightIdentityProfile | null | undefined;
  connectionId?: string | null;
  ownerUserId?: string | null;
  integrationId?: string | null;
  personaId?: string | null;
  startUrl?: string | null;
  runScopeKey?: string | null;
}): PlaywrightProxySessionAffinityResult => {
  const mode = input.mode === 'rotate' ? 'rotate' : DEFAULT_PROXY_SESSION_MODE;
  if (!input.enabled) {
    return {
      launchOptions: input.launchOptions,
      applied: false,
      descriptor: null,
      mutations: [],
      reason: 'disabled',
    };
  }

  const proxy = input.launchOptions.proxy;
  if (!proxy?.server) {
    return {
      launchOptions: input.launchOptions,
      applied: false,
      descriptor: null,
      mutations: [],
      reason: 'no-proxy',
    };
  }

  const descriptor = resolveProxyAffinityDescriptor({
    mode,
    providerPreset: input.providerPreset,
    identityProfile: input.identityProfile,
    proxyServer: proxy.server,
    connectionId: input.connectionId,
    ownerUserId: input.ownerUserId,
    integrationId: input.integrationId,
    personaId: input.personaId,
    startUrl: input.startUrl,
    runScopeKey: input.runScopeKey,
  });

  if (!descriptor) {
    return {
      launchOptions: input.launchOptions,
      applied: false,
      descriptor: null,
      mutations: [],
      reason: 'no-scope',
    };
  }

  const serverResult = replaceProxySessionPlaceholders(proxy.server, descriptor.sessionToken);
  const usernameResult = replaceProxySessionPlaceholders(proxy.username, descriptor.sessionToken);
  const passwordResult = replaceProxySessionPlaceholders(proxy.password, descriptor.sessionToken);
  const presetUsernameResult =
    !serverResult.changed && !usernameResult.changed && !passwordResult.changed
      ? applyProviderPresetToUsername({
          username: proxy.username,
          sessionToken: descriptor.sessionToken,
          providerPreset: descriptor.providerPreset,
        })
      : { value: proxy.username, changed: false };

  if (
    !serverResult.changed &&
    !usernameResult.changed &&
    !passwordResult.changed &&
    !presetUsernameResult.changed
  ) {
    return {
      launchOptions: input.launchOptions,
      applied: false,
      descriptor,
      mutations: [],
      reason: 'no-placeholder',
    };
  }

  const mutations: PlaywrightProxySessionAffinityResult['mutations'] = [
    ...(serverResult.changed
      ? [{ field: 'server' as const, source: 'placeholder' as const }]
      : []),
    ...(usernameResult.changed
      ? [{ field: 'username' as const, source: 'placeholder' as const }]
      : []),
    ...(passwordResult.changed
      ? [{ field: 'password' as const, source: 'placeholder' as const }]
      : []),
    ...(presetUsernameResult.changed
      ? [{ field: 'username' as const, source: 'provider_preset' as const }]
      : []),
  ];

  return {
    launchOptions: {
      ...input.launchOptions,
      proxy: {
        ...proxy,
        server: serverResult.value ?? proxy.server,
        ...(typeof (presetUsernameResult.changed ? presetUsernameResult.value : usernameResult.value) === 'string'
          ? {
              username:
                (presetUsernameResult.changed
                  ? presetUsernameResult.value
                  : usernameResult.value) ?? proxy.username,
            }
          : {}),
        ...(typeof passwordResult.value === 'string'
          ? { password: passwordResult.value }
          : {}),
      },
    },
    applied: true,
    descriptor,
    mutations,
    reason: 'applied',
  };
};
