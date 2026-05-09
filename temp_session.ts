import 'server-only';

import type { Browser, BrowserContext, CDPSession, Page } from 'playwright';
import type WebSocket from 'ws';

import type {
  LiveScripterClientMessage,
  LiveScripterProbePageSummary,
  LiveScripterPickedElement,
  LiveScripterProbeResult,
  LiveScripterProbeScope,
  LiveScripterProbeSuggestion,
  LiveScripterServerMessage,
  LiveScripterStartRequest,
  LiveScripterViewport,
} from '@/shared/contracts/playwright-live-scripter';
import {
  LIVE_SCRIPTER_FRAME_QUALITY,
  PLAYWRIGHT_LIVE_SCRIPTER_DEFAULT_VIEWPORT,
  liveScripterClientMessageSchema,
} from '@/shared/contracts/playwright-live-scripter';
import { badRequestError, forbiddenError, notFoundError } from '@/shared/errors/app-error';
import { inferSelectorRegistryRoleFromProbe } from '@/shared/lib/browser-execution/selector-registry-roles';
import {
  buildChromiumAntiDetectionContextOptions,
  buildChromiumAntiDetectionLaunchOptions,
  installChromiumAntiDetectionInitScript,
} from '@/shared/lib/playwright/anti-detection';
import { launchPlaywrightBrowser } from '@/shared/lib/playwright/browser-launch';
import { defaultPlaywrightSettings } from '@/shared/lib/playwright/settings';
import { safeClearTimeout, safeSetTimeout, type SafeTimerId } from '@/shared/lib/timers';
import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';

const pickDelayBetween = (min: number, max: number): number => {
  const lo = Math.max(0, Math.trunc(Math.min(min, max)));
  const hi = Math.max(0, Math.trunc(Math.max(min, max)));
  if (lo === hi) return lo;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
};

const sleepMs = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, Math.max(0, Math.trunc(ms))));

const simulateAddressBarTyping = async (url: string): Promise<void> => {
  const perCharDelay = pickDelayBetween(
    defaultPlaywrightSettings.inputDelayMin,
    defaultPlaywrightSettings.inputDelayMax
  );
  const typingDurationMs = url.length * perCharDelay;
  const preEnterReviewMs = pickDelayBetween(
    defaultPlaywrightSettings.actionDelayMin,
    defaultPlaywrightSettings.actionDelayMax
  );
  if (typingDurationMs > 0) await sleepMs(typingDurationMs);
  if (preEnterReviewMs > 0) await sleepMs(preEnterReviewMs);
};

const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `live-scripter-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const clampViewport = (
  viewport: LiveScripterStartRequest['viewport'] | undefined
): LiveScripterViewport => {
  if (viewport === undefined) {
    return { ...PLAYWRIGHT_LIVE_SCRIPTER_DEFAULT_VIEWPORT };
  }

  return {
    width: Math.max(320, Math.min(LIVE_SCRIPTER_MAX_FRAME_DIMENSION, Math.trunc(viewport.width))),
    height: Math.max(240, Math.min(LIVE_SCRIPTER_MAX_FRAME_DIMENSION, Math.trunc(viewport.height))),
  };
};

const readBridgeState = (): LiveScripterState => {
  const globalScope = globalThis as typeof globalThis & {
    [LIVE_SCRIPTER_STATE_KEY]?: LiveScripterState;
  };
  const existing = globalScope[LIVE_SCRIPTER_STATE_KEY];
  if (existing !== undefined) {
    return existing;
  }

  const state: LiveScripterState = {
    sessions: new Map<string, LiveScripterSession>(),
    bridge: {
      attachClient: async (sessionId, socket) => {
        const session = state.sessions.get(sessionId) ?? null;
        if (session === null || session.disposed) {
          return false;
        }
        attachSocketClient(session, socket);
        return true;
      },
    },
  };
  globalScope[LIVE_SCRIPTER_STATE_KEY] = state;
  (globalThis as typeof globalThis & { [LIVE_SCRIPTER_BRIDGE_KEY]?: LiveScripterBridge })[
    LIVE_SCRIPTER_BRIDGE_KEY
  ] = state.bridge;
  return state;
};

const getSessions = (): Map<string, LiveScripterSession> => readBridgeState().sessions;

const readOptionalTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const isSocketOpen = (socket: LiveScripterSocket): boolean => socket.readyState === 1;

const sendSocketMessage = (
  socket: LiveScripterSocket,
  message: LiveScripterServerMessage
): void => {
  if (!isSocketOpen(socket)) {
    return;
  }
  socket.send(JSON.stringify(message));
};

const broadcastToSockets = (session: LiveScripterSession, message: LiveScripterServerMessage): void => {
  for (const socket of session.sockets) {
    sendSocketMessage(socket, message);
  }
};

const refreshIdleTimeout = (session: LiveScripterSession): void => {
  session.lastActivityAt = Date.now();
  safeClearTimeout(session.timeoutId);
  session.timeoutId = safeSetTimeout(() => {
    void disposeLiveScripterSession(session.id);
  }, LIVE_SCRIPTER_SESSION_IDLE_MS);
};

const normalizeLiveScripterUrlCandidate = (value: string): string => {
  const trimmed = value.trim();
  if (URL_SCHEME_PATTERN.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith('/') || trimmed.startsWith('?') || trimmed.startsWith('#')) {
    throw badRequestError(`Live scripter URL is invalid: "${trimmed}" is a relative path. Provide a full URL including the hostname.`);
  }

  return `https://${trimmed}`;
};

const sanitizeUrl = (value: string): string => {
  const candidate = normalizeLiveScripterUrlCandidate(value);
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw badRequestError(`Live scripter URL is invalid: "${candidate}" could not be parsed as a URL. Provide a valid absolute URL.`);
  }

  if (parsed.hostname.trim().length === 0) {
    throw badRequestError(`Live scripter URL is invalid: "${candidate}" has no hostname. Provide a full URL including the hostname.`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw badRequestError(`Live scripter only supports http:// and https:// URLs, but received protocol "${parsed.protocol}".`);
  }

  const hostname = parsed.hostname.trim().toLowerCase();
  const isLoopbackHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost');
  const normalizedPathname = stripSiteLocalePrefix(parsed.pathname);
  const isAllowedDevFixtureLoopbackUrl =
    process.env['NODE_ENV'] !== 'production' &&
    normalizedPathname === LIVE_SCRIPTER_DEV_FIXTURE_PATH;

  if (isLoopbackHost && !isAllowedDevFixtureLoopbackUrl) {
    throw forbiddenError('Live scripter does not allow loopback URLs.');
  }

  return parsed.toString();
};

const normalizeLiveScripterPageTitle = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readLiveScripterPageTitle = async (page: Pick<Page, 'title'>): Promise<string | null> =>
  normalizeLiveScripterPageTitle(await page.title().catch(() => null));

export const readSettledLiveScripterPageTitle = async (
  page: Pick<Page, 'title'>
): Promise<string | null> => {
  let currentTitle = await readLiveScripterPageTitle(page);
  let lastTitleChangeAt = Date.now();
  const deadline = Date.now() + LIVE_SCRIPTER_TITLE_SETTLE_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleepMs(LIVE_SCRIPTER_TITLE_SETTLE_POLL_MS);
    const nextTitle = await readLiveScripterPageTitle(page);
    if (nextTitle !== currentTitle) {
      currentTitle = nextTitle;
      lastTitleChangeAt = Date.now();
      continue;
    }
    if (Date.now() - lastTitleChangeAt >= LIVE_SCRIPTER_TITLE_SETTLE_STABLE_MS) {
      break;
    }
  }

  return currentTitle;
};

export const pickElementAt = async (
  page: Page,
  x: number,
  y: number
): Promise<LiveScripterPickedElement> => {
  const payload = await page.evaluate(
    ({
      nextX,
      nextY,
      maxDepth,
    }: {
      nextX: number;
      nextY: number;
      maxDepth: number;
    }) => {
      const clampText = (value: string | null | undefined): string | null => {
        if (typeof value !== 'string') return null;
        const normalized = value.replace(/\s+/g, ' ').trim();
        if (normalized.length === 0) return null;
        return normalized.slice(0, 280);
      };

      const buildCssSegment = (element: Element): string => {
        const tag = element.tagName.toLowerCase();
        const id =
          typeof element.getAttribute('id') === 'string' &&
          element.getAttribute('id')!.trim().length > 0
            ? element.getAttribute('id')!.trim()
            : null;
        if (id !== null) {
          return `#${CSS.escape(id)}`;
        }

        const classNames = Array.from(element.classList)
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
          .slice(0, 2);
        if (classNames.length > 0) {
          return `${tag}${classNames.map((name) => `.${CSS.escape(name)}`).join('')}`;
        }

        const parent = element.parentElement;
        if (parent === null) {
          return tag;
        }

        const sameTagSiblings = Array.from(parent.children).filter(
          (child) => child.tagName.toLowerCase() === tag
        );
        if (sameTagSiblings.length <= 1) {
          return tag;
        }

        const index = sameTagSiblings.indexOf(element) + 1;
        return `${tag}:nth-of-type(${index})`;
      };

      const collectAttrs = (element: Element): Record<string, string> => {
        const result: Record<string, string> = {};
        for (const attr of Array.from(element.attributes)) {
          if (result[attr.name] !== undefined) continue;
          result[attr.name] = attr.value;
        }
        return result;
      };

      const resolveRole = (element: Element): string | null => {
        const explicitRole = clampText(element.getAttribute('role'));
        if (explicitRole !== null) return explicitRole;
        const tag = element.tagName.toLowerCase();
        if (tag === 'a' && element.getAttribute('href')) return 'link';
        if (tag === 'button') return 'button';
        if (tag === 'input') {
          const type = clampText(element.getAttribute('type')) ?? 'text';
          if (type === 'checkbox') return 'checkbox';
          if (type === 'radio') return 'radio';
          if (type === 'submit' || type === 'button') return 'button';
