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

const LIVE_SCRIPTER_SESSION_IDLE_MS = 5 * 60 * 1000;
const LIVE_SCRIPTER_CONCURRENT_SESSION_CAP = 3;
const LIVE_SCRIPTER_MAX_SELECTOR_DEPTH = 6;
const LIVE_SCRIPTER_MAX_FRAME_DIMENSION = 1600;
const LIVE_SCRIPTER_BRIDGE_KEY = '__geminitestappPlaywrightLiveScripterBridge';
const LIVE_SCRIPTER_STATE_KEY = '__geminitestappPlaywrightLiveScripterState';
const LIVE_SCRIPTER_DEV_FIXTURE_PATH = '/playwright-fixtures/live-scripter-fixture';
const LIVE_SCRIPTER_TITLE_SETTLE_TIMEOUT_MS = 2_000;
const LIVE_SCRIPTER_TITLE_SETTLE_POLL_MS = 100;
const LIVE_SCRIPTER_TITLE_SETTLE_STABLE_MS = 250;
const URL_SCHEME_PATTERN = /^[a-z][a-z\d+\-.]*:/i;

type LiveScripterSocket = WebSocket;

type LiveScripterSession = {
  id: string;
  ownerUserId: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  cdp: CDPSession;
  viewport: LiveScripterViewport;
  personaId: string | null;
  selectorProfile: string | null;
  createdAt: number;
  lastActivityAt: number;
  timeoutId: SafeTimerId | null;
  sockets: Set<LiveScripterSocket>;
  lastFrame: Extract<LiveScripterServerMessage, { type: 'frame' }> | null;
  lastNavigation: Extract<LiveScripterServerMessage, { type: 'navigated' }> | null;
  lastPicked: Extract<LiveScripterServerMessage, { type: 'picked' }> | null;
  lastProbe: Extract<LiveScripterServerMessage, { type: 'probe_result' }> | null;
  disposed: boolean;
  pendingAction: Promise<void>;
};

type LiveScripterProbeCandidate = LiveScripterPickedElement & {
  repeatedSiblingCount: number;
  childLinkCount: number;
  childImageCount: number;
};

type LiveScripterBridge = {
  attachClient: (sessionId: string, socket: LiveScripterSocket) => Promise<boolean>;
};

type LiveScripterState = {
  sessions: Map<string, LiveScripterSession>;
  bridge: LiveScripterBridge;
};

type ScreencastFrameEvent = {
  data: string;
  sessionId: number;
  metadata?: {
    deviceWidth?: number;
    deviceHeight?: number;
  };
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
    throw badRequestError('Live scripter URL is invalid.');
  }

  return `https://${trimmed}`;
};

const sanitizeUrl = (value: string): string => {
  const candidate = normalizeLiveScripterUrlCandidate(value);
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw badRequestError('Live scripter URL is invalid.');
  }

  if (parsed.hostname.trim().length === 0) {
    throw badRequestError('Live scripter URL is invalid.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw badRequestError('Live scripter only supports http:// and https:// URLs.');
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
          return 'textbox';
        }
        if (tag === 'textarea') return 'textbox';
        if (tag === 'select') return 'combobox';
        return null;
      };

      const resolveXPath = (element: Element): string => {
        const segments: string[] = [];
        let current: Element | null = element;
        while (current !== null) {
          const tag = current.tagName.toLowerCase();
          const id = clampText(current.getAttribute('id'));
          if (id !== null) {
            return `//*[@id="${id.replace(/"/g, '\\"')}"]`;
          }
          const parentElement: Element | null = current.parentElement;
          if (parentElement === null) {
            segments.unshift(tag);
            break;
          }
          const currentTagName = current.tagName;
          const siblings = Array.from(parentElement.children).filter(
            (child) => child.tagName === currentTagName
          );
          const index = siblings.indexOf(current) + 1;
          segments.unshift(`${tag}[${index}]`);
          current = parentElement;
        }
        return `/${segments.join('/')}`;
      };

      const buildCssPath = (element: Element): string | null => {
        const segments: string[] = [];
        let current: Element | null = element;
        let depth = 0;
        while (current !== null && depth < maxDepth) {
          const id = clampText(current.getAttribute('id'));
          if (id !== null) {
            segments.unshift(`#${CSS.escape(id)}`);
            return segments.join(' > ');
          }

          const segment = buildCssSegment(current);
          segments.unshift(segment);
          const selector = segments.join(' > ');
          try {
            if (document.querySelectorAll(selector).length === 1) {
              return selector;
            }
          } catch {
            // Ignore invalid selector segments and keep walking.
          }
          current = current.parentElement;
          depth += 1;
        }
        return segments.length > 0 ? segments.join(' > ') : null;
      };

      const buildPayload = (element: Element): LiveScripterPickedElement => {
        const rect = element.getBoundingClientRect();
        const testId =
          clampText(element.getAttribute('data-testid')) ??
          clampText(element.getAttribute('data-test-id')) ??
          clampText(element.getAttribute('data-qa'));

        const role = resolveRole(element);
        const textPreview =
          clampText(element.textContent) ??
          clampText(element.getAttribute('aria-label')) ??
          clampText(element.getAttribute('title')) ??
          clampText(element.getAttribute('placeholder'));

        return {
          tag: element.tagName.toLowerCase(),
          id: clampText(element.getAttribute('id')),
          classes: Array.from(element.classList)
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
            .slice(0, 12),
          textPreview,
          role,
          attrs: collectAttrs(element),
          boundingBox: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
          candidates: {
            css: buildCssPath(element),
            xpath: resolveXPath(element),
            role,
            text: textPreview,
            testId,
          },
        } satisfies LiveScripterPickedElement;
      };

      const isInteractiveElement = (
        element: Element,
        payload: LiveScripterPickedElement
      ): boolean => {
        if (
          payload.role === 'button' ||
          payload.role === 'link' ||
          payload.role === 'textbox' ||
          payload.role === 'combobox'
        ) {
          return true;
        }
        const tag = element.tagName.toLowerCase();
        if (tag === 'button' || tag === 'input' || tag === 'textarea' || tag === 'select') {
          return true;
        }
        return tag === 'a' && typeof element.getAttribute('href') === 'string';
      };

      const isGenericWrapper = (
        element: Element,
        payload: LiveScripterPickedElement
      ): boolean => {
        const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
        const area =
          Math.max(0, payload.boundingBox.width) * Math.max(0, payload.boundingBox.height);
        const coversViewport = area / viewportArea >= 0.5;
        if (element.getAttribute('aria-busy') === 'true' && coversViewport) {
          return true;
        }

        if (
          payload.id !== null ||
          payload.role !== null ||
          payload.textPreview !== null ||
          payload.candidates.testId !== null
        ) {
          return false;
        }

        const tag = element.tagName.toLowerCase();
        if (tag !== 'div' && tag !== 'main' && tag !== 'section' && tag !== 'article') {
          return false;
        }
        return coversViewport;
      };

      const elementStack = document
        .elementsFromPoint(nextX, nextY)
        .filter((value): value is Element => value instanceof Element);
      if (elementStack.length === 0) {
        return null;
      }

      let fallback: LiveScripterPickedElement | null = null;
      for (const element of elementStack) {
        const payload = buildPayload(element);
        if (fallback === null) {
          fallback = payload;
        }
        if (isGenericWrapper(element, payload)) {
          continue;
        }
        if (
          isInteractiveElement(element, payload) ||
          payload.candidates.testId !== null ||
          payload.id !== null ||
          payload.textPreview !== null
        ) {
          return payload;
        }
      }

      return fallback;
    },
    { nextX: x, nextY: y, maxDepth: LIVE_SCRIPTER_MAX_SELECTOR_DEPTH }
  );

  if (payload === null) {
    throw notFoundError('No element was found at the requested point.');
  }

  return payload;
};

const buildProbeSuggestionId = (
  candidate: Pick<LiveScripterProbeCandidate, 'tag' | 'id' | 'candidates'>
): string =>
  [
    candidate.tag,
    candidate.id ?? '',
    candidate.candidates.css ?? '',
    candidate.candidates.xpath ?? '',
    candidate.candidates.testId ?? '',
  ]
    .filter(Boolean)
    .join('::');

const normalizeLiveScripterProbeUrl = (value: string): string | null => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
};

const collectLiveScripterProbeCandidatesOnPage = async (
  page: Page,
  options: {
    scope: LiveScripterProbeScope;
    maxNodes: number;
  }
): Promise<LiveScripterProbeCandidate[]> =>
  page.evaluate(
    ({
      nextScope,
      nextMaxNodes,
      maxDepth,
    }: {
      nextScope: LiveScripterProbeScope;
      nextMaxNodes: number;
      maxDepth: number;
    }): LiveScripterProbeCandidate[] => {
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
        for (const attr of Array.from(element.attributes).slice(0, 16)) {
          if (result[attr.name] !== undefined) continue;
          result[attr.name] = attr.value.slice(0, 280);
        }
        return result;
      };

      const resolveRole = (element: Element): string | null => {
        const explicitRole = clampText(element.getAttribute('role'));
        if (explicitRole !== null) return explicitRole;
        const tag = element.tagName.toLowerCase();
        if (tag === 'a' && element.getAttribute('href')) return 'link';
        if (tag === 'button') return 'button';
        if (tag === 'img') return 'img';
        if (tag === 'input') {
          const type = clampText(element.getAttribute('type')) ?? 'text';
          if (type === 'checkbox') return 'checkbox';
          if (type === 'radio') return 'radio';
          if (type === 'submit' || type === 'button') return 'button';
          return 'textbox';
        }
        if (tag === 'textarea') return 'textbox';
        if (tag === 'select') return 'combobox';
        return null;
      };

      const resolveXPath = (element: Element): string => {
        const segments: string[] = [];
        let current: Element | null = element;
        while (current !== null) {
          const tag = current.tagName.toLowerCase();
          const id = clampText(current.getAttribute('id'));
          if (id !== null) {
            return `//*[@id="${id.replace(/"/g, '\\"')}"]`;
          }
          const parentElement: Element | null = current.parentElement;
          if (parentElement === null) {
            segments.unshift(tag);
            break;
          }
          const currentTagName = current.tagName;
          const siblings = Array.from(parentElement.children).filter(
            (child: Element) => child.tagName === currentTagName
          );
          const index = siblings.indexOf(current) + 1;
          segments.unshift(`${tag}[${index}]`);
          current = parentElement;
        }
        return `/${segments.join('/')}`;
      };

      const buildCssPath = (element: Element): string | null => {
        const segments: string[] = [];
        let current: Element | null = element;
        let depth = 0;
        while (current !== null && depth < maxDepth) {
          const id = clampText(current.getAttribute('id'));
          if (id !== null) {
            segments.unshift(`#${CSS.escape(id)}`);
            return segments.join(' > ');
          }

          const segment = buildCssSegment(current);
          segments.unshift(segment);
          const selector = segments.join(' > ');
          try {
            if (document.querySelectorAll(selector).length === 1) {
              return selector;
            }
          } catch {
            // Ignore invalid selector segments and keep walking.
          }

          current = current.parentElement;
          depth += 1;
        }
        return segments.length > 0 ? segments.join(' > ') : null;
      };

      const isVisible = (element: Element): boolean => {
        const rect = element.getBoundingClientRect();
        if (rect.width < 18 || rect.height < 12) {
          return false;
        }
        const style = window.getComputedStyle(element);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.pointerEvents === 'none'
        ) {
          return false;
        }
        const opacity = Number.parseFloat(style.opacity || '1');
        return Number.isNaN(opacity) || opacity > 0.02;
      };

      const buildPayload = (element: Element): LiveScripterProbeCandidate => {
        const rect = element.getBoundingClientRect();
        const testId =
          clampText(element.getAttribute('data-testid')) ??
          clampText(element.getAttribute('data-test-id')) ??
          clampText(element.getAttribute('data-qa'));
        const role = resolveRole(element);
        const textPreview =
          clampText((element as HTMLElement).innerText) ??
          clampText(element.textContent) ??
          clampText(element.getAttribute('aria-label')) ??
          clampText(element.getAttribute('title')) ??
          clampText(element.getAttribute('placeholder')) ??
          clampText(element.getAttribute('alt'));

        const parent = element.parentElement;
        const repeatedSiblingCount =
          parent === null
            ? 0
            : Array.from(parent.children).filter(
                (child) => child.tagName === element.tagName
              ).length;

        return {
          tag: element.tagName.toLowerCase(),
          id: clampText(element.getAttribute('id')),
          classes: Array.from(element.classList)
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
            .slice(0, 12),
          textPreview,
          role,
          attrs: collectAttrs(element),
          boundingBox: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
          candidates: {
            css: buildCssPath(element),
            xpath: resolveXPath(element),
            role,
            text: textPreview,
            testId,
          },
          repeatedSiblingCount,
          childLinkCount: Math.min(24, element.querySelectorAll('a[href]').length),
          childImageCount: Math.min(24, element.querySelectorAll('img[src]').length),
        } satisfies LiveScripterProbeCandidate;
      };

      const isGenericWrapper = (payload: LiveScripterProbeCandidate): boolean => {
        const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
        const area =
          Math.max(0, payload.boundingBox.width) * Math.max(0, payload.boundingBox.height);
        const coversViewport = area / viewportArea >= 0.65;

        if (
          payload.id !== null ||
          payload.role !== null ||
          payload.textPreview !== null ||
          payload.candidates.testId !== null
        ) {
          return false;
        }

        return coversViewport && payload.childLinkCount === 0 && payload.childImageCount === 0;
      };

      const computeProbeScore = (payload: LiveScripterProbeCandidate): number => {
        let score = 0;
        if (payload.id !== null) score += 18;
        if (payload.candidates.testId !== null) score += 18;
        if (payload.role !== null) score += 12;
        if (payload.textPreview !== null) score += Math.min(20, payload.textPreview.length / 8);
        if (typeof payload.attrs['href'] === 'string') score += 14;
        if (typeof payload.attrs['src'] === 'string') score += 14;
        if (payload.repeatedSiblingCount >= 2) score += 10;
        if (payload.childLinkCount > 0) score += 6;
        if (payload.childImageCount > 0) score += 6;
        if (
          payload.tag === 'h1' ||
          payload.tag === 'h2' ||
          payload.tag === 'h3' ||
          payload.tag === 'a' ||
          payload.tag === 'img' ||
          payload.tag === 'button' ||
          payload.tag === 'input'
        ) {
          score += 16;
        }
        const combined = [
          payload.id ?? '',
          payload.textPreview ?? '',
          ...payload.classes,
          ...Object.keys(payload.attrs),
          ...Object.values(payload.attrs),
        ]
          .join(' ')
          .toLowerCase();
        if (
          combined.includes('title') ||
          combined.includes('price') ||
          combined.includes('image') ||
          combined.includes('description') ||
          combined.includes('gallery') ||
          combined.includes('product')
        ) {
          score += 14;
        }
        return score;
      };

      const root: Node =
        nextScope === 'main_content'
          ? document.querySelector('main, [role="main"], article, #main, #content') ??
            document.body ??
            document.documentElement
          : document.body ?? document.documentElement;

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      const scored: Array<{ score: number; payload: LiveScripterProbeCandidate }> = [];
      let current: Node | null = walker.currentNode;
      while (current !== null) {
        const element = current instanceof Element ? current : null;
        current = walker.nextNode();
        if (element === null) {
          continue;
        }

        const tag = element.tagName.toLowerCase();
        if (
          tag === 'script' ||
          tag === 'style' ||
          tag === 'noscript' ||
          tag === 'template' ||
          tag === 'svg' ||
          tag === 'path'
        ) {
          continue;
        }
        if (!isVisible(element)) {
          continue;
        }

        const payload = buildPayload(element);
        if (isGenericWrapper(payload)) {
          continue;
        }

        const score = computeProbeScore(payload);
        if (score < 16) {
          continue;
        }
        scored.push({ score, payload });
      }

      scored.sort((left, right) => right.score - left.score);
      return scored.slice(0, nextMaxNodes * 3).map((entry) => entry.payload);
    },
    {
      nextScope: options.scope,
      nextMaxNodes: options.maxNodes,
      maxDepth: LIVE_SCRIPTER_MAX_SELECTOR_DEPTH,
    }
  );

const buildProbeSuggestionsForPage = async (
  page: Page,
  options: {
    scope: LiveScripterProbeScope;
    maxNodes: number;
  }
): Promise<{
  url: string;
  title: string | null;
  suggestions: LiveScripterProbeSuggestion[];
  pageSummary: LiveScripterProbePageSummary;
}> => {
  const title = await readLiveScripterPageTitle(page);
  const url = page.url();
  const rawCandidates = await collectLiveScripterProbeCandidatesOnPage(page, options);
  const seenSuggestionIds = new Set<string>();
  const suggestions: LiveScripterProbeSuggestion[] = [];

  for (const candidate of rawCandidates) {
    const classification = inferSelectorRegistryRoleFromProbe({
      tag: candidate.tag,
      role: candidate.role,
      textPreview: candidate.textPreview,
      attrs: candidate.attrs,
      classes: candidate.classes,
      repeatedSiblingCount: candidate.repeatedSiblingCount,
      childLinkCount: candidate.childLinkCount,
      childImageCount: candidate.childImageCount,
    });
    const suggestionId = buildProbeSuggestionId(candidate);
    if (suggestionId.length === 0 || seenSuggestionIds.has(suggestionId)) {
      continue;
    }
    if (classification.role === 'generic' && classification.confidence < 0.5) {
      continue;
    }
    seenSuggestionIds.add(suggestionId);
    suggestions.push({
      ...candidate,
      suggestionId,
      pageUrl: url,
      pageTitle: title,
      classificationRole: classification.role,
      draftTargetHints: classification.draftTargetHints,
      confidence: classification.confidence,
      evidence: classification.evidence,
    });
  }

  suggestions.sort((left, right) => {
    if (right.confidence !== left.confidence) {
      return right.confidence - left.confidence;
    }
    return (right.textPreview?.length ?? 0) - (left.textPreview?.length ?? 0);
  });

  return {
    url,
    title,
    suggestions,
    pageSummary: {
      url,
      title,
      suggestionCount: suggestions.length,
    },
  };
};

const collectLiveScripterTraversalLinks = async (
  page: Page,
  options: {
    scope: LiveScripterProbeScope;
    sameOriginOnly: boolean;
    origin: string;
    maxLinks: number;
  }
): Promise<string[]> =>
  page.evaluate(
    ({
      nextScope,
      nextSameOriginOnly,
      nextOrigin,
      nextMaxLinks,
    }: {
      nextScope: LiveScripterProbeScope;
      nextSameOriginOnly: boolean;
      nextOrigin: string;
      nextMaxLinks: number;
    }): string[] => {
      const root =
        nextScope === 'main_content'
          ? document.querySelector('main, [role="main"], article, #main, #content') ?? document.body
          : document.body;
      const seen = new Set<string>();
      const links: string[] = [];

      for (const anchor of Array.from(root.querySelectorAll('a[href]'))) {
        const href = anchor.getAttribute('href')?.trim() ?? '';
        if (href.length === 0 || href.startsWith('#') || href.startsWith('javascript:')) {
          continue;
        }
        let resolved: URL;
        try {
          resolved = new URL(href, window.location.href);
        } catch {
          continue;
        }
        if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
          continue;
        }
        if (nextSameOriginOnly && resolved.origin !== nextOrigin) {
          continue;
        }
        resolved.hash = '';
        const normalized = resolved.toString();
        if (seen.has(normalized)) {
          continue;
        }
        seen.add(normalized);
        links.push(normalized);
        if (links.length >= nextMaxLinks) {
          break;
        }
      }

      return links;
    },
    {
      nextScope: options.scope,
      nextSameOriginOnly: options.sameOriginOnly,
      nextOrigin: options.origin,
      nextMaxLinks: options.maxLinks,
    }
  );

export const probeLiveScripterDom = async (
  page: Page,
  options?: {
    scope?: LiveScripterProbeScope;
    maxNodes?: number;
    sameOriginOnly?: boolean;
    linkDepth?: number;
    maxPages?: number;
  }
): Promise<LiveScripterProbeResult> => {
  const scope = options?.scope ?? 'main_content';
  const maxNodes = Math.max(12, Math.min(240, Math.trunc(options?.maxNodes ?? 48)));
  const sameOriginOnly = options?.sameOriginOnly ?? true;
  const linkDepth = Math.max(0, Math.min(2, Math.trunc(options?.linkDepth ?? 0)));
  const maxPages = Math.max(1, Math.min(8, Math.trunc(options?.maxPages ?? 1)));

  const initialUrl = normalizeLiveScripterProbeUrl(page.url()) ?? page.url();
  const initialOrigin = (() => {
    try {
      return new URL(initialUrl).origin;
    } catch {
      return '';
    }
  })();

  const pageSummaries: LiveScripterProbePageSummary[] = [];
  const visitedUrls: string[] = [];
  const allSuggestions: LiveScripterProbeSuggestion[] = [];
  const seenVisitUrls = new Set<string>();
  const queuedUrls = new Set<string>([initialUrl]);
  const queue: Array<{ url: string; depth: number }> = [{ url: initialUrl, depth: 0 }];

  while (queue.length > 0 && visitedUrls.length < maxPages) {
    const next = queue.shift()!;
    const normalizedUrl = normalizeLiveScripterProbeUrl(next.url);
    if (normalizedUrl === null || seenVisitUrls.has(normalizedUrl)) {
      continue;
    }

    let targetPage: Page | null = null;
    let shouldClosePage = false;
    if (normalizedUrl === initialUrl) {
      targetPage = page;
    } else {
      const browser = page.context().browser();
      if (browser === null) {
        throw new Error('Live scripter probe could not open a traversal page.');
      }
      targetPage = await browser.newPage({
        viewport: page.viewportSize() ?? undefined,
      });
      shouldClosePage = true;
      await targetPage.goto(normalizedUrl, { waitUntil: 'domcontentloaded' });
    }

    try {
      const result = await buildProbeSuggestionsForPage(targetPage, {
        scope,
        maxNodes,
      });
      const resolvedUrl = normalizeLiveScripterProbeUrl(result.url) ?? normalizedUrl;
      if (sameOriginOnly && initialOrigin.length > 0) {
        try {
          if (new URL(resolvedUrl).origin !== initialOrigin) {
            continue;
          }
        } catch {
          continue;
        }
      }

      seenVisitUrls.add(resolvedUrl);
      visitedUrls.push(resolvedUrl);
      pageSummaries.push({
        ...result.pageSummary,
        url: resolvedUrl,
      });
      allSuggestions.push(
        ...result.suggestions.map((suggestion) => ({
          ...suggestion,
          pageUrl: resolvedUrl,
        }))
      );

      if (next.depth < linkDepth && visitedUrls.length < maxPages) {
        const candidateLinks = await collectLiveScripterTraversalLinks(targetPage, {
          scope,
          sameOriginOnly,
          origin: initialOrigin,
          maxLinks: maxPages * 4,
        });
        for (const candidateLink of candidateLinks) {
          const normalizedCandidateUrl = normalizeLiveScripterProbeUrl(candidateLink);
          if (
            normalizedCandidateUrl === null ||
            seenVisitUrls.has(normalizedCandidateUrl) ||
            queuedUrls.has(normalizedCandidateUrl)
          ) {
            continue;
          }
          queuedUrls.add(normalizedCandidateUrl);
          queue.push({ url: normalizedCandidateUrl, depth: next.depth + 1 });
          if (queue.length + visitedUrls.length >= maxPages * 3) {
            break;
          }
        }
      }
    } finally {
      if (shouldClosePage) {
        await targetPage.close().catch(() => undefined);
      }
    }
  }

  allSuggestions.sort((left, right) => {
    if (right.confidence !== left.confidence) {
      return right.confidence - left.confidence;
    }
    if (left.pageUrl !== right.pageUrl) {
      return left.pageUrl.localeCompare(right.pageUrl);
    }
    return (right.textPreview?.length ?? 0) - (left.textPreview?.length ?? 0);
  });

  return {
    type: 'probe_result',
    url: initialUrl,
    title: pageSummaries[0]?.title ?? (await readLiveScripterPageTitle(page)),
    scope,
    sameOriginOnly,
    linkDepth,
    maxPages,
    scannedPages: pageSummaries.length,
    visitedUrls,
    pages: pageSummaries,
    suggestionCount: Math.min(allSuggestions.length, maxNodes),
    suggestions: allSuggestions.slice(0, maxNodes),
  };
};

const queueSessionAction = (
  session: LiveScripterSession,
  action: () => Promise<void>
): Promise<void> => {
  const next = session.pendingAction.then(action);
  session.pendingAction = next.catch(() => undefined);
  return next;
};

const publishNavigation = async (
  session: LiveScripterSession,
  options?: {
    settleTitle?: boolean;
  }
): Promise<void> => {
  const title =
    options?.settleTitle === true
      ? await readSettledLiveScripterPageTitle(session.page)
      : await readLiveScripterPageTitle(session.page);
  const message: Extract<LiveScripterServerMessage, { type: 'navigated' }> = {
    type: 'navigated',
    url: session.page.url(),
    title,
  };
  if (
    session.lastNavigation?.url === message.url &&
    session.lastNavigation?.title === message.title
  ) {
    return;
  }
  session.lastProbe = null;
  session.lastNavigation = message;
  broadcastToSockets(session, message);
};

const publishPickedElement = (session: LiveScripterSession, element: LiveScripterPickedElement): void => {
  const message: Extract<LiveScripterServerMessage, { type: 'picked' }> = {
    type: 'picked',
    element,
  };
  session.lastPicked = message;
  broadcastToSockets(session, message);
};

const publishProbeResult = (
  session: LiveScripterSession,
  result: LiveScripterProbeResult
): void => {
  session.lastProbe = result;
  broadcastToSockets(session, result);
};

const publishError = (session: LiveScripterSession, message: string): void => {
  broadcastToSockets(session, {
    type: 'error',
    message,
  });
};

const removeSocketClient = (session: LiveScripterSession, socket: LiveScripterSocket): void => {
  session.sockets.delete(socket);
};

const handleClientMessage = async (
  session: LiveScripterSession,
  message: LiveScripterClientMessage
): Promise<void> => {
  refreshIdleTimeout(session);
  switch (message.type) {
    case 'drive_click':
      await session.page.mouse.click(message.x, message.y);
      return;
    case 'drive_type':
      await session.page.keyboard.type(message.value);
      return;
    case 'drive_scroll':
      await session.page.mouse.wheel(message.deltaX, message.deltaY);
      return;
    case 'pick_at': {
      const element = await pickElementAt(session.page, message.x, message.y);
      publishPickedElement(session, element);
      return;
    }
    case 'probe_dom': {
      const result = await probeLiveScripterDom(session.page, {
        scope: message.scope,
        maxNodes: message.maxNodes,
        sameOriginOnly: message.sameOriginOnly,
        linkDepth: message.linkDepth,
        maxPages: message.maxPages,
      });
      publishProbeResult(session, result);
      return;
    }
    case 'navigate': {
      const targetUrl = sanitizeUrl(message.url);
      await simulateAddressBarTyping(targetUrl);
      await session.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      await publishNavigation(session, { settleTitle: true });
      return;
    }
    case 'back':
      await session.page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => null);
      await publishNavigation(session, { settleTitle: true });
      return;
    case 'forward':
      await session.page.goForward({ waitUntil: 'domcontentloaded' }).catch(() => null);
      await publishNavigation(session, { settleTitle: true });
      return;
    case 'reload':
      await session.page.reload({ waitUntil: 'domcontentloaded' });
      await publishNavigation(session, { settleTitle: true });
      return;
    case 'dispose':
      await disposeLiveScripterSession(session.id);
      return;
  }
};

const attachSocketClient = (session: LiveScripterSession, socket: LiveScripterSocket): void => {
  refreshIdleTimeout(session);
  session.sockets.add(socket);
  sendSocketMessage(socket, { type: 'ready', sessionId: session.id });
  if (session.lastNavigation !== null) {
    sendSocketMessage(socket, session.lastNavigation);
  }
  if (session.lastFrame !== null) {
    sendSocketMessage(socket, session.lastFrame);
  }
  if (session.lastPicked !== null) {
    sendSocketMessage(socket, session.lastPicked);
  }
  if (session.lastProbe !== null) {
    sendSocketMessage(socket, session.lastProbe);
  }

  socket.on('message', (raw) => {
    let parsed: unknown;
    try {
      const text =
        typeof raw === 'string'
          ? raw
          : Buffer.isBuffer(raw)
            ? raw.toString('utf8')
            : Array.isArray(raw)
              ? Buffer.concat(raw).toString('utf8')
              : Buffer.from(raw).toString('utf8');
      parsed = JSON.parse(text);
    } catch {
      publishError(session, 'Live scripter client message was not valid JSON.');
      return;
    }

    const validation = liveScripterClientMessageSchema.safeParse(parsed);
    if (!validation.success) {
      publishError(session, 'Live scripter client message did not match the expected shape.');
      return;
    }

    void queueSessionAction(session, async () => {
      try {
        await handleClientMessage(session, validation.data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Live scripter input could not be applied.';
        publishError(session, message);
      }
    });
  });

  socket.on('close', () => {
    removeSocketClient(session, socket);
  });
  socket.on('error', () => {
    removeSocketClient(session, socket);
  });
};

export const getLiveScripterSession = (sessionId: string): LiveScripterSession | null =>
  getSessions().get(sessionId) ?? null;

const countOwnerSessions = (ownerUserId: string): number =>
  Array.from(getSessions().values()).filter(
    (session) => session.ownerUserId === ownerUserId && session.disposed === false
  ).length;

export const createLiveScripterSession = async (input: {
  ownerUserId: string;
  url: string;
  viewport?: LiveScripterStartRequest['viewport'];
  personaId?: string | null;
  selectorProfile?: string | null;
}): Promise<{ sessionId: string }> => {
  if (countOwnerSessions(input.ownerUserId) >= LIVE_SCRIPTER_CONCURRENT_SESSION_CAP) {
    throw forbiddenError('Live scripter allows up to 3 concurrent sessions per admin.');
  }

  const sanitizedUrl = sanitizeUrl(input.url);
  const viewport = clampViewport(input.viewport);
  const launchResult = await launchPlaywrightBrowser(
    'chromium',
    buildChromiumAntiDetectionLaunchOptions({ headless: true })
  );
  const contextOptions = buildChromiumAntiDetectionContextOptions(
    {
      viewport,
    },
    'default'
  );
  const context = await launchResult.browser.newContext(contextOptions);
  await installChromiumAntiDetectionInitScript(context, {
    locale: contextOptions.locale,
    userAgent: contextOptions.userAgent,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const sessionId = createId();
  const session: LiveScripterSession = {
    id: sessionId,
    ownerUserId: input.ownerUserId,
    browser: launchResult.browser,
    context,
    page,
    cdp,
    viewport,
    personaId: readOptionalTrimmedString(input.personaId),
    selectorProfile: readOptionalTrimmedString(input.selectorProfile),
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    timeoutId: null,
    sockets: new Set<LiveScripterSocket>(),
    lastFrame: null,
    lastNavigation: null,
    lastPicked: null,
    lastProbe: null,
    disposed: false,
    pendingAction: Promise.resolve(),
  };
  getSessions().set(sessionId, session);
  refreshIdleTimeout(session);

  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) {
      return;
    }
    void publishNavigation(session, { settleTitle: true });
  });
  page.on('close', () => {
    void disposeLiveScripterSession(session.id);
  });
  launchResult.browser.on('disconnected', () => {
    void disposeLiveScripterSession(session.id);
  });

  cdp.on('Page.screencastFrame', async (event: ScreencastFrameEvent) => {
    const width = Math.trunc(event.metadata?.deviceWidth ?? session.viewport.width);
    const height = Math.trunc(event.metadata?.deviceHeight ?? session.viewport.height);
    const message: Extract<LiveScripterServerMessage, { type: 'frame' }> = {
      type: 'frame',
      dataUrl: `data:image/jpeg;base64,${event.data}`,
      width,
      height,
    };
    session.lastFrame = message;
    broadcastToSockets(session, message);
    refreshIdleTimeout(session);
    await cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => undefined);
  });

  await cdp.send('Page.enable');
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: LIVE_SCRIPTER_FRAME_QUALITY,
    maxWidth: viewport.width,
    maxHeight: viewport.height,
    everyNthFrame: 2,
  });

  try {
    await simulateAddressBarTyping(sanitizedUrl);
    await page.goto(sanitizedUrl, { waitUntil: 'domcontentloaded' });
  } catch (error) {
    await disposeLiveScripterSession(session.id);
    throw error;
  }

  await publishNavigation(session, { settleTitle: true });

  return { sessionId };
};

export const disposeLiveScripterSession = async (sessionId: string): Promise<void> => {
  const session = getSessions().get(sessionId) ?? null;
  if (session === null || session.disposed) {
    return;
  }

  session.disposed = true;
  safeClearTimeout(session.timeoutId);
  getSessions().delete(sessionId);

  for (const socket of session.sockets) {
    sendSocketMessage(socket, { type: 'closed' });
    try {
      socket.close();
    } catch {
      // Best-effort close.
    }
  }
  session.sockets.clear();

  await session.cdp.send('Page.stopScreencast').catch(() => undefined);
  await session.page.close().catch(() => undefined);
  await session.context.close().catch(() => undefined);
  await session.browser.close().catch(() => undefined);
};

export const getLiveScripterBridge = (): LiveScripterBridge => readBridgeState().bridge;
