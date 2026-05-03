import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  launchPlaywrightBrowserMock,
  buildChromiumAntiDetectionLaunchOptionsMock,
  buildChromiumAntiDetectionContextOptionsMock,
  installChromiumAntiDetectionInitScriptMock,
  safeSetTimeoutMock,
  safeClearTimeoutMock,
} = vi.hoisted(() => ({
  launchPlaywrightBrowserMock: vi.fn(),
  buildChromiumAntiDetectionLaunchOptionsMock: vi.fn(),
  buildChromiumAntiDetectionContextOptionsMock: vi.fn(),
  installChromiumAntiDetectionInitScriptMock: vi.fn(),
  safeSetTimeoutMock: vi.fn(),
  safeClearTimeoutMock: vi.fn(),
}));

vi.mock('@/shared/lib/playwright/browser-launch', () => ({
  launchPlaywrightBrowser: (...args: unknown[]) => launchPlaywrightBrowserMock(...args),
}));

vi.mock('@/shared/lib/playwright/anti-detection', () => ({
  buildChromiumAntiDetectionLaunchOptions: (...args: unknown[]) =>
    buildChromiumAntiDetectionLaunchOptionsMock(...args),
  buildChromiumAntiDetectionContextOptions: (...args: unknown[]) =>
    buildChromiumAntiDetectionContextOptionsMock(...args),
  installChromiumAntiDetectionInitScript: (...args: unknown[]) =>
    installChromiumAntiDetectionInitScriptMock(...args),
}));

vi.mock('@/shared/lib/timers', () => ({
  safeSetTimeout: (...args: unknown[]) => safeSetTimeoutMock(...args),
  safeClearTimeout: (...args: unknown[]) => safeClearTimeoutMock(...args),
}));

import { forbiddenError, notFoundError } from '@/shared/errors/app-error';

import {
  createLiveScripterSession,
  disposeLiveScripterSession,
  getLiveScripterBridge,
  getLiveScripterSession,
  pickElementAt,
  probeLiveScripterDom,
} from './live-session';

type MockSocket = {
  readyState: number;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  emit: (event: string, ...args: unknown[]) => void;
};

const LIVE_SESSION_STATE_KEY = '__geminitestappPlaywrightLiveScripterState';
const LIVE_SESSION_BRIDGE_KEY = '__geminitestappPlaywrightLiveScripterBridge';

const createMockSocket = (): MockSocket => {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  return {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
    }),
    emit: (event: string, ...args: unknown[]) => {
      handlers.get(event)?.(...args);
    },
  };
};

const readSocketMessages = (socket: MockSocket): unknown[] =>
  socket.send.mock.calls.map(([payload]) => JSON.parse(payload as string));

const createMockSessionRuntime = () => {
  const pageHandlers = new Map<string, (...args: unknown[]) => void>();
  const browserHandlers = new Map<string, (...args: unknown[]) => void>();
  const cdpHandlers = new Map<string, (...args: unknown[]) => void>();
  const pageCloseMock = vi.fn().mockResolvedValue(undefined);
  const contextCloseMock = vi.fn().mockResolvedValue(undefined);
  const browserCloseMock = vi.fn().mockResolvedValue(undefined);

  const page = {
    goto: vi.fn().mockImplementation(async (url: string) => {
      page.url.mockReturnValue(url);
      page.title.mockResolvedValue('Navigated page');
    }),
    title: vi.fn().mockResolvedValue('Example page'),
    url: vi.fn().mockReturnValue('https://example.com/product'),
    evaluate: vi.fn().mockResolvedValue({
      tag: 'button',
      id: 'submit',
      classes: ['btn'],
      textPreview: 'Submit',
      role: 'button',
      attrs: { 'data-testid': 'submit-button' },
      boundingBox: { x: 10, y: 20, width: 120, height: 32 },
      candidates: {
        css: '#submit',
        xpath: '//*[@id="submit"]',
        role: 'button',
        text: 'Submit',
        testId: 'submit-button',
      },
    }),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      pageHandlers.set(event, handler);
    }),
    mainFrame: vi.fn().mockReturnValue({ id: 'main-frame' }),
    close: pageCloseMock,
    mouse: {
      click: vi.fn(),
      wheel: vi.fn(),
    },
    keyboard: {
      type: vi.fn(),
    },
  };

  const cdp = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      cdpHandlers.set(event, handler);
    }),
    send: vi.fn().mockResolvedValue(undefined),
  };

  const context = {
    newPage: vi.fn().mockResolvedValue(page),
    newCDPSession: vi.fn().mockResolvedValue(cdp),
    close: contextCloseMock,
  };

  const browser = {
    newContext: vi.fn().mockResolvedValue(context),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      browserHandlers.set(event, handler);
    }),
    close: browserCloseMock,
  };

  return {
    page,
    context,
    cdp,
    browser,
    pageHandlers,
    browserHandlers,
    cdpHandlers,
    pageCloseMock,
    contextCloseMock,
    browserCloseMock,
  };
};

describe('live-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildChromiumAntiDetectionLaunchOptionsMock.mockReturnValue({ headless: true });
    buildChromiumAntiDetectionContextOptionsMock.mockReturnValue({
      viewport: { width: 1280, height: 800 },
      locale: 'en-US',
      userAgent: 'test-ua',
    });
    installChromiumAntiDetectionInitScriptMock.mockResolvedValue(undefined);
    safeSetTimeoutMock.mockReturnValue({ timer: 'live-session' });
    safeClearTimeoutMock.mockReturnValue(undefined);
    delete (globalThis as Record<string, unknown>)[LIVE_SESSION_STATE_KEY];
    delete (globalThis as Record<string, unknown>)[LIVE_SESSION_BRIDGE_KEY];
  });

  afterEach(async () => {
    const state = (globalThis as Record<string, unknown>)[LIVE_SESSION_STATE_KEY] as
      | { sessions?: Map<string, { id: string }> }
      | undefined;
    const sessionIds = Array.from(state?.sessions?.keys() ?? []);
    await Promise.all(sessionIds.map((sessionId) => disposeLiveScripterSession(sessionId)));
    delete (globalThis as Record<string, unknown>)[LIVE_SESSION_STATE_KEY];
    delete (globalThis as Record<string, unknown>)[LIVE_SESSION_BRIDGE_KEY];
  });

  it('returns the picked element payload from the page evaluation bridge', async () => {
    const payload = {
      tag: 'button',
      id: 'submit',
      classes: ['btn'],
      textPreview: 'Submit',
      role: 'button',
      attrs: { 'data-testid': 'submit-button' },
      boundingBox: { x: 10, y: 20, width: 120, height: 32 },
      candidates: {
        css: '#submit',
        xpath: '//*[@id="submit"]',
        role: 'button',
        text: 'Submit',
        testId: 'submit-button',
      },
    };
    const page = {
      evaluate: vi.fn().mockResolvedValue(payload),
    };

    const result = await pickElementAt(page as never, 10, 20);

    expect(page.evaluate).toHaveBeenCalledWith(expect.any(Function), {
      nextX: 10,
      nextY: 20,
      maxDepth: 6,
    });
    expect(result).toEqual(payload);
  });

  it('throws when no element is available at the requested point', async () => {
    const page = {
      evaluate: vi.fn().mockResolvedValue(null),
    };

    await expect(pickElementAt(page as never, 5, 6)).rejects.toMatchObject(
      notFoundError('No element was found at the requested point.')
    );
  });

  it('classifies probed DOM candidates into selector suggestions', async () => {
    const page = {
      url: vi.fn().mockReturnValue('https://example.com/product'),
      title: vi.fn().mockResolvedValue('Example product'),
      evaluate: vi.fn().mockResolvedValue([
        {
          tag: 'h1',
          id: 'product-title',
          classes: ['product-title'],
          textPreview: 'Vintage Lamp',
          role: null,
          attrs: { id: 'product-title' },
          boundingBox: { x: 10, y: 20, width: 260, height: 40 },
          candidates: {
            css: '#product-title',
            xpath: '//*[@id="product-title"]',
            role: null,
            text: 'Vintage Lamp',
            testId: null,
          },
          repeatedSiblingCount: 1,
          childLinkCount: 0,
          childImageCount: 0,
        },
        {
          tag: 'span',
          id: null,
          classes: ['price'],
          textPreview: '$149.00',
          role: null,
          attrs: { class: 'price' },
          boundingBox: { x: 10, y: 80, width: 120, height: 24 },
          candidates: {
            css: '.price',
            xpath: '/html/body/main/span[1]',
            role: null,
            text: '$149.00',
            testId: null,
          },
          repeatedSiblingCount: 1,
          childLinkCount: 0,
          childImageCount: 0,
        },
      ]),
    };

    const result = await probeLiveScripterDom(page as never, {
      scope: 'main_content',
      maxNodes: 24,
    });

    expect(page.evaluate).toHaveBeenCalledWith(expect.any(Function), {
      nextScope: 'main_content',
      nextMaxNodes: 24,
      maxDepth: 6,
    });
    expect(result).toMatchObject({
      type: 'probe_result',
      url: 'https://example.com/product',
      title: 'Example product',
      scope: 'main_content',
      sameOriginOnly: true,
      linkDepth: 0,
      maxPages: 1,
      scannedPages: 1,
      visitedUrls: ['https://example.com/product'],
      suggestionCount: 2,
    });
    expect(result.suggestions[0]).toMatchObject({
      classificationRole: 'content_price',
      draftTargetHints: ['price'],
    });
    expect(result.suggestions[1]).toMatchObject({
      classificationRole: 'content_title',
      draftTargetHints: ['name_en'],
    });
  });

  it('allows the dedicated loopback fixture route outside production', async () => {
    const runtime = createMockSessionRuntime();
    launchPlaywrightBrowserMock.mockResolvedValue({
      browser: runtime.browser,
      label: 'Chromium (bundled)',
      fallbackMessages: [],
    });

    const { sessionId } = await createLiveScripterSession({
      ownerUserId: 'admin-1',
      url: 'http://127.0.0.1:3000/playwright-fixtures/live-scripter-fixture',
      personaId: null,
      selectorProfile: null,
    });

    expect(sessionId).toEqual(expect.any(String));
    expect(runtime.page.goto).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/playwright-fixtures/live-scripter-fixture',
      expect.any(Object)
    );
  });

  it('allows the localized dedicated loopback fixture route outside production', async () => {
    const runtime = createMockSessionRuntime();
    launchPlaywrightBrowserMock.mockResolvedValue({
      browser: runtime.browser,
      label: 'Chromium (bundled)',
      fallbackMessages: [],
    });

    const { sessionId } = await createLiveScripterSession({
      ownerUserId: 'admin-1',
      url: 'http://127.0.0.1:3000/pl/playwright-fixtures/live-scripter-fixture',
      personaId: null,
      selectorProfile: null,
    });

    expect(sessionId).toEqual(expect.any(String));
    expect(runtime.page.goto).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/pl/playwright-fixtures/live-scripter-fixture',
      expect.any(Object)
    );
  });

  it('normalizes a scheme-less public URL to https before navigation', async () => {
    const runtime = createMockSessionRuntime();
    launchPlaywrightBrowserMock.mockResolvedValue({
      browser: runtime.browser,
      label: 'Chromium (bundled)',
      fallbackMessages: [],
    });

    const { sessionId } = await createLiveScripterSession({
      ownerUserId: 'admin-1',
      url: 'example.com/product?sku=123',
      personaId: null,
      selectorProfile: null,
    });

    expect(sessionId).toEqual(expect.any(String));
    expect(runtime.page.goto).toHaveBeenCalledWith(
      'https://example.com/product?sku=123',
      expect.any(Object)
    );
  });

  it('still rejects general loopback URLs', async () => {
    await expect(
      createLiveScripterSession({
        ownerUserId: 'admin-1',
        url: 'http://127.0.0.1:3000/private-page',
        personaId: null,
        selectorProfile: null,
      })
    ).rejects.toMatchObject(forbiddenError('Live scripter does not allow loopback URLs.'));
  });

  it('creates, exposes, and disposes a live scripter session', async () => {
    const runtime = createMockSessionRuntime();
    launchPlaywrightBrowserMock.mockResolvedValue({
      browser: runtime.browser,
      label: 'Chromium (bundled)',
      fallbackMessages: [],
    });

    const { sessionId } = await createLiveScripterSession({
      ownerUserId: 'admin-1',
      url: 'https://example.com/product',
      personaId: 'persona-1',
      selectorProfile: 'default',
    });

    expect(launchPlaywrightBrowserMock).toHaveBeenCalled();
    expect(buildChromiumAntiDetectionContextOptionsMock).toHaveBeenCalledWith(
      { viewport: { width: 1280, height: 800 } },
      'default'
    );
    expect(installChromiumAntiDetectionInitScriptMock).toHaveBeenCalledWith(runtime.context, {
      locale: 'en-US',
      userAgent: 'test-ua',
    });
    expect(safeSetTimeoutMock).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);

    const session = getLiveScripterSession(sessionId);
    expect(session).not.toBeNull();
    expect(session?.ownerUserId).toBe('admin-1');
    expect(session?.personaId).toBe('persona-1');
    expect(session?.selectorProfile).toBe('default');

    const socket = createMockSocket();
    const attached = await getLiveScripterBridge().attachClient(sessionId, socket as never);
    expect(attached).toBe(true);
    expect(socket.send).toHaveBeenCalledTimes(2);
    expect(JSON.parse(socket.send.mock.calls[0]?.[0] as string)).toMatchObject({
      type: 'ready',
      sessionId,
    });
    expect(JSON.parse(socket.send.mock.calls[1]?.[0] as string)).toMatchObject({
      type: 'navigated',
      url: 'https://example.com/product',
      title: 'Navigated page',
    });

    await disposeLiveScripterSession(sessionId);

    expect(getLiveScripterSession(sessionId)).toBeNull();
    expect(safeClearTimeoutMock).toHaveBeenCalled();
    expect(runtime.cdp.send).toHaveBeenCalledWith('Page.stopScreencast');
    expect(runtime.pageCloseMock).toHaveBeenCalled();
    expect(runtime.contextCloseMock).toHaveBeenCalled();
    expect(runtime.browserCloseMock).toHaveBeenCalled();
    expect(socket.close).toHaveBeenCalled();
    expect(JSON.parse(socket.send.mock.calls[2]?.[0] as string)).toEqual({ type: 'closed' });
  });

  it('publishes an error when a socket client sends invalid JSON', async () => {
    const runtime = createMockSessionRuntime();
    launchPlaywrightBrowserMock.mockResolvedValue({
      browser: runtime.browser,
      label: 'Chromium (bundled)',
      fallbackMessages: [],
    });

    const { sessionId } = await createLiveScripterSession({
      ownerUserId: 'admin-1',
      url: 'https://example.com/product',
    });
    const socket = createMockSocket();

    await getLiveScripterBridge().attachClient(sessionId, socket as never);
    socket.send.mockClear();
    socket.emit('message', 'not-json');

    expect(readSocketMessages(socket)).toContainEqual({
      type: 'error',
      message: 'Live scripter client message was not valid JSON.',
    });
  });

  it('handles pick_at and navigate socket messages through the registered client handler', async () => {
    const runtime = createMockSessionRuntime();
    launchPlaywrightBrowserMock.mockResolvedValue({
      browser: runtime.browser,
      label: 'Chromium (bundled)',
      fallbackMessages: [],
    });

    const { sessionId } = await createLiveScripterSession({
      ownerUserId: 'admin-1',
      url: 'https://example.com/product',
    });
    const socket = createMockSocket();

    await getLiveScripterBridge().attachClient(sessionId, socket as never);
    socket.send.mockClear();

    socket.emit('message', JSON.stringify({ type: 'pick_at', x: 10, y: 20 }));
    await getLiveScripterSession(sessionId)?.pendingAction;

    expect(runtime.page.evaluate).toHaveBeenCalled();
    expect(readSocketMessages(socket)).toContainEqual({
      type: 'picked',
      element: expect.objectContaining({
        tag: 'button',
        candidates: expect.objectContaining({ css: '#submit' }),
      }),
    });

    socket.send.mockClear();
    socket.emit(
      'message',
      JSON.stringify({ type: 'navigate', url: 'https://example.com/next' })
    );
    await getLiveScripterSession(sessionId)?.pendingAction;

    expect(runtime.page.goto).toHaveBeenCalledWith('https://example.com/next', {
      waitUntil: 'domcontentloaded',
    });
    expect(readSocketMessages(socket)).toContainEqual({
      type: 'navigated',
      url: 'https://example.com/next',
      title: 'Navigated page',
    });
  });
});
