import { promises as fs } from 'fs';
import { createRequire as actualCreateRequire } from 'node:module';
import os from 'os';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSettingValueMock: vi.fn(),
  buildContextRegistryPromptMock: vi.fn(() => 'Context Registry Prompt'),
  evaluateOutboundUrlPolicyMock: vi.fn((url: string) =>
    url.includes('blocked')
      ? { allowed: false, reason: 'policy_violation' }
      : { allowed: true, reason: null }
  ),
  captureExceptionMock: vi.fn(async () => undefined),
  chromiumLaunchMock: vi.fn(),
  firefoxLaunchMock: vi.fn(),
  webkitLaunchMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai/server-settings', () => ({
  getSettingValue: (...args: unknown[]) => mocks.getSettingValueMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/context-registry/system-prompt', () => ({
  buildAiPathsContextRegistrySystemPrompt: (...args: unknown[]) =>
    mocks.buildContextRegistryPromptMock(...args),
}));

vi.mock('@/shared/lib/security/outbound-url-policy', () => ({
  evaluateOutboundUrlPolicy: (...args: unknown[]) => mocks.evaluateOutboundUrlPolicyMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

const RUN_ROOT_DIR = path.join(os.tmpdir(), 'ai-paths-playwright-runs');
const OLD_MTIME = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
type RouteProbe = {
  url: string;
  continueMock: ReturnType<typeof vi.fn>;
  abortMock: ReturnType<typeof vi.fn>;
};

type PlaywrightRuntime = {
  browser: {
    newContext: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
  };
  context: {
    setDefaultTimeout: ReturnType<typeof vi.fn>;
    setDefaultNavigationTimeout: ReturnType<typeof vi.fn>;
    addInitScript: ReturnType<typeof vi.fn>;
    route: ReturnType<typeof vi.fn>;
    storageState: ReturnType<typeof vi.fn>;
    newPage: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    tracing: {
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    };
  };
  page: {
    goto: ReturnType<typeof vi.fn>;
    screenshot: ReturnType<typeof vi.fn>;
    content: ReturnType<typeof vi.fn>;
    url: ReturnType<typeof vi.fn>;
    title: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    isClosed: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    video: ReturnType<typeof vi.fn>;
    keyboard: {
      type: ReturnType<typeof vi.fn>;
      press: ReturnType<typeof vi.fn>;
    };
    mouse: {
      move: ReturnType<typeof vi.fn>;
    };
  };
  routes: RouteProbe[];
  videoSourcePath: string | null;
  emitBrowserEvent: (event: string, ...args: unknown[]) => Promise<void>;
  emitContextEvent: (event: string, ...args: unknown[]) => Promise<void>;
  emitPageEvent: (event: string, ...args: unknown[]) => Promise<void>;
};

const createRouteProbe = (url: string): RouteProbe => ({
  url,
  continueMock: vi.fn(async () => undefined),
  abortMock: vi.fn(async () => undefined),
});

const createPlaywrightRuntime = async (options?: {
  routeUrls?: string[];
  pageUrl?: string;
  pageTitle?: string;
  screenshotBytes?: string;
  html?: string;
  video?: boolean;
}): Promise<PlaywrightRuntime> => {
  const routes = (options?.routeUrls ?? []).map(createRouteProbe);
  const videoSourcePath = options?.video
    ? path.join(os.tmpdir(), `playwright-node-video-${Date.now()}-${Math.random()}.webm`)
    : null;
  let pageClosed = false;
  const browserEventListeners = new Map<string, Array<(...args: unknown[]) => unknown>>();
  const contextEventListeners = new Map<string, Array<(...args: unknown[]) => unknown>>();
  const pageEventListeners = new Map<string, Array<(...args: unknown[]) => unknown>>();
  const registerListener = (
    listeners: Map<string, Array<(...args: unknown[]) => unknown>>,
    event: string,
    handler: (...args: unknown[]) => unknown
  ) => {
    listeners.set(event, [...(listeners.get(event) ?? []), handler]);
  };
  const emitEvent = async (
    listeners: Map<string, Array<(...args: unknown[]) => unknown>>,
    event: string,
    ...args: unknown[]
  ): Promise<void> => {
    for (const handler of listeners.get(event) ?? []) {
      await handler(...args);
    }
  };

  if (videoSourcePath) {
    await fs.writeFile(videoSourcePath, 'video-bytes');
  }

  const page = {
    goto: vi.fn(async () => undefined),
    screenshot: vi.fn(async () => Buffer.from(options?.screenshotBytes ?? 'png-bytes')),
    content: vi.fn(async () => options?.html ?? '<html><body>snapshot</body></html>'),
    url: vi.fn(() => options?.pageUrl ?? 'https://allowed.example.com/final'),
    title: vi.fn(async () => options?.pageTitle ?? 'Final Title'),
    close: vi.fn(async () => {
      pageClosed = true;
      await emitEvent(pageEventListeners, 'close');
    }),
    isClosed: vi.fn(() => pageClosed),
    on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
      registerListener(pageEventListeners, event, handler);
    }),
    keyboard: {
      type: vi.fn(async () => undefined),
      press: vi.fn(async () => undefined),
    },
    mouse: {
      move: vi.fn(async () => undefined),
    },
    video: vi.fn(() =>
      videoSourcePath
        ? {
            path: vi.fn(async () => videoSourcePath),
          }
        : null
    ),
  };

  const context = {
    setDefaultTimeout: vi.fn(),
    setDefaultNavigationTimeout: vi.fn(),
    addInitScript: vi.fn(async () => undefined),
    route: vi.fn(async (_pattern: string, handler: (route: unknown) => Promise<void>) => {
      for (const probe of routes) {
        await handler({
          request: () => ({
            url: () => probe.url,
          }),
          continue: probe.continueMock,
          abort: probe.abortMock,
        });
      }
    }),
    storageState: vi.fn(async () => ({
      cookies: [
        {
          name: 'session',
          value: 'persisted-session',
          domain: 'allowed.example.com',
          path: '/',
        },
      ],
      origins: [],
    })),
    tracing: {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async ({ path: tracePath }: { path: string }) => {
        await fs.writeFile(tracePath, 'trace-bytes');
      }),
    },
    newPage: vi.fn(async () => page),
    close: vi.fn(async () => undefined),
    on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
      registerListener(contextEventListeners, event, handler);
    }),
  };

  const browser = {
    newContext: vi.fn(async () => context),
    close: vi.fn(async () => undefined),
    on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
      registerListener(browserEventListeners, event, handler);
    }),
  };

  return {
    browser,
    context,
    page,
    routes,
    videoSourcePath,
    emitBrowserEvent: (event: string, ...args: unknown[]) =>
      emitEvent(browserEventListeners, event, ...args),
    emitContextEvent: (event: string, ...args: unknown[]) =>
      emitEvent(contextEventListeners, event, ...args),
    emitPageEvent: async (event: string, ...args: unknown[]) => {
      if (event === 'close') {
        pageClosed = true;
      }
      await emitEvent(pageEventListeners, event, ...args);
    },
  };
};

const writeStaleFixture = async (name: string, content: string): Promise<string> => {
  const fixturePath = path.join(RUN_ROOT_DIR, name);
  await fs.mkdir(path.dirname(fixturePath), { recursive: true });
  await fs.writeFile(fixturePath, content, 'utf8');
  await fs.utimes(fixturePath, OLD_MTIME, OLD_MTIME);
  return fixturePath;
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.getSettingValueMock.mockResolvedValue(null);
  mocks.buildContextRegistryPromptMock.mockReturnValue('Context Registry Prompt');
  mocks.evaluateOutboundUrlPolicyMock.mockImplementation((url: string) =>
    url.includes('blocked')
      ? { allowed: false, reason: 'policy_violation' }
      : { allowed: true, reason: null }
  );
  vi.doMock('module', () => {
    const mockedCreateRequire = (url: string | URL) => {
      const realRequire = actualCreateRequire(url);
      return (specifier: string) => {
        if (specifier === 'playwright') {
          return {
            chromium: { launch: mocks.chromiumLaunchMock },
            firefox: { launch: mocks.firefoxLaunchMock },
            webkit: { launch: mocks.webkitLaunchMock },
            devices: {
              'Desktop Chrome': {
                viewport: {
                  width: 1440,
                  height: 900,
                },
                userAgent: 'Desktop Chrome UA',
              },
            },
          };
        }
        return realRequire(specifier);
      };
    };

    return {
      createRequire: mockedCreateRequire,
      default: {
        createRequire: mockedCreateRequire,
      },
    };
  });
});

afterEach(async () => {
  await fs.rm(RUN_ROOT_DIR, { recursive: true, force: true });
});

const loadRunner = async () =>
  import('@/features/ai/ai-paths/services/playwright-node-runner');

describe('enqueuePlaywrightNodeRun', () => {
  it('executes a successful run, captures artifacts, and removes stale run fixtures', async () => {
    const { enqueuePlaywrightNodeRun, readPlaywrightNodeArtifact, readPlaywrightNodeRun } =
      await loadRunner();
    const runtime = await createPlaywrightRuntime({
      routeUrls: [
        '::not-a-url::',
        'ftp://files.example.com/archive',
        'https://allowed.example.com/script.js',
        'https://blocked.example.com/tracker.js',
      ],
      video: true,
    });
    mocks.chromiumLaunchMock.mockResolvedValue(runtime.browser);
    mocks.getSettingValueMock.mockResolvedValue(
      JSON.stringify([
        {
          id: 'persona-1',
          name: 'QA Persona',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
          settings: {
            headless: false,
            slowMo: 0,
            timeout: 8000,
            navigationTimeout: 9000,
            humanizeMouse: false,
            mouseJitter: 0,
            clickDelayMin: 0,
            clickDelayMax: 0,
            inputDelayMin: 0,
            inputDelayMax: 0,
            actionDelayMin: 0,
            actionDelayMax: 0,
            proxyEnabled: true,
            proxyServer: 'http://proxy.local:8080',
            proxyUsername: 'proxy-user',
            proxyPassword: 'proxy-pass',
            emulateDevice: true,
            deviceName: 'Desktop Chrome',
          },
        },
      ])
    );

    const staleFilePath = await writeStaleFixture('stale-run.json', 'stale');

    const run = await enqueuePlaywrightNodeRun({
      waitForResult: true,
      ownerUserId: ' user-1 ',
      request: {
        script: `
          export default async ({ page, input, emit, artifacts, log, helpers, contextRegistryPrompt }) => {
            const circle = {};
            circle.self = circle;
            console.log(circle);
            console.info('info');
            console.warn('warn');
            console.error('error');
            log('user log', input.value);
            emit('result', { ok: true, prompt: contextRegistryPrompt });
            await artifacts.screenshot('custom-shot');
            await artifacts.html('markup');
            await artifacts.file('notes', 'hello world', {
              extension: 'txt',
              mimeType: 'text/plain',
              kind: 'note',
            });
            await artifacts.json('payload', { echoed: input.value });
            artifacts.add('summary', { answer: 42 });
            await helpers.sleep(0);
            return { echoed: input.value, href: page.url() };
          };
        `,
        input: { value: 'abc' },
        startUrl: 'https://allowed.example.com/start',
        timeoutMs: 1500,
        personaId: 'persona-1',
        settingsOverrides: {
          navigationTimeout: 4321,
          timeout: 2345,
          unsupported: 'ignored',
        },
        launchOptions: {
          channel: 'chrome',
        },
        contextOptions: {
          locale: 'en-US',
        },
        contextRegistry: {
          refs: [{ id: 'doc-1' }],
          resolved: {
            documents: [{ id: 'doc-1', title: 'Doc 1' }],
          },
        } as never,
        capture: {
          screenshot: true,
          html: true,
          video: true,
          trace: true,
        },
      },
    });

    expect(run.status).toBe('completed');
    expect(run.ownerUserId).toBe('user-1');
    expect(run.error).toBeNull();
    expect(runtime.page.goto).toHaveBeenCalledWith('https://allowed.example.com/start', {
      timeout: 4321,
      waitUntil: 'load',
    });
    expect(runtime.browser.newContext).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'en-US',
        userAgent: 'Desktop Chrome UA',
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
        },
        recordVideo: expect.objectContaining({
          size: {
            width: 1280,
            height: 720,
          },
        }),
      })
    );
    expect(mocks.chromiumLaunchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: false,
        slowMo: 0,
        channel: 'chrome',
        args: ['--disable-blink-features=AutomationControlled'],
        ignoreDefaultArgs: ['--enable-automation'],
        proxy: {
          server: 'http://proxy.local:8080',
          username: 'proxy-user',
          password: 'proxy-pass',
        },
      })
    );
    expect(runtime.context.setDefaultTimeout).toHaveBeenCalledWith(2345);
    expect(runtime.context.setDefaultNavigationTimeout).toHaveBeenCalledWith(4321);
    expect(runtime.context.addInitScript).toHaveBeenCalledTimes(1);
    expect(runtime.context.tracing.start).toHaveBeenCalledTimes(1);
    expect(runtime.context.tracing.stop).toHaveBeenCalledTimes(1);
    expect(run.artifacts).toHaveLength(9);
    expect(run.logs).toEqual(
      expect.arrayContaining([
        expect.stringContaining('[runtime] Launching chromium browser.'),
        expect.stringContaining(
          '[runtime] Anti-detection posture: browser=Chrome, profile=default'
        ),
        expect.stringContaining('[runtime] Applied Chromium anti-detection defaults'),
        expect.stringContaining('[runtime] Trace capture started.'),
        expect.stringContaining('[policy] Blocked outbound URL: https://blocked.example.com/tracker.js'),
        expect.stringContaining('[context] Loaded Context Registry bundle with 1 refs'),
        '[console.log] [unserializable]',
        '[console.info] info',
        '[console.warn] warn',
        '[console.error] error',
        '[user] user log abc',
        '[runtime] Trace capture saved.',
        '[runtime] Video capture saved.',
      ])
    );
    expect(mocks.buildContextRegistryPromptMock).toHaveBeenCalledWith({
      documents: [{ id: 'doc-1', title: 'Doc 1' }],
    });
    expect(mocks.captureExceptionMock).toHaveBeenCalled();
    expect(runtime.routes[0]?.continueMock).toHaveBeenCalledTimes(1);
    expect(runtime.routes[1]?.continueMock).toHaveBeenCalledTimes(1);
    expect(runtime.routes[2]?.continueMock).toHaveBeenCalledTimes(1);
    expect(runtime.routes[3]?.abortMock).toHaveBeenCalledWith('blockedbyclient');
    expect(run.result).toMatchObject({
      returnValue: {
        echoed: 'abc',
        href: 'https://allowed.example.com/final',
      },
      outputs: {
        result: {
          ok: true,
          prompt: 'Context Registry Prompt',
        },
      },
      inlineArtifacts: [
        {
          name: 'summary',
          value: {
            answer: 42,
          },
        },
      ],
      finalUrl: 'https://allowed.example.com/final',
      title: 'Final Title',
      runtimePosture: {
        browser: {
          engine: 'chromium',
          label: 'Chrome',
          headless: false,
        },
        antiDetection: {
          identityProfile: 'default',
          locale: 'en-US',
          proxy: {
            enabled: true,
            providerPreset: 'custom',
            sessionAffinityEnabled: false,
            reason: 'disabled',
            serverHost: 'proxy.local:8080',
          },
        },
      },
    });

    const notesArtifact = run.artifacts.find((artifact) => artifact.kind === 'note');
    expect(notesArtifact).toBeDefined();
    const runtimePostureArtifact = run.artifacts.find(
      (artifact) => artifact.name === 'runtime-posture'
    );
    expect(runtimePostureArtifact).toBeDefined();

    const artifactResult = await readPlaywrightNodeArtifact({
      runId: run.runId,
      fileName: path.basename(notesArtifact?.path ?? ''),
    });

    expect(artifactResult?.content.toString('utf8')).toBe('hello world');

    const runtimePosture = JSON.parse(
      (
        await readPlaywrightNodeArtifact({
          runId: run.runId,
          fileName: path.basename(runtimePostureArtifact?.path ?? ''),
        })
      )?.content.toString('utf8') ?? '{}'
    );

    expect(runtimePosture).toMatchObject({
      browser: {
        engine: 'chromium',
        label: 'Chrome',
        headless: false,
      },
      antiDetection: {
        identityProfile: 'default',
        locale: 'en-US',
        proxy: {
          enabled: true,
          providerPreset: 'custom',
          sessionAffinityEnabled: false,
          reason: 'disabled',
          serverHost: 'proxy.local:8080',
        },
      },
    });

    const persisted = await readPlaywrightNodeRun(run.runId);
    expect(persisted?.status).toBe('completed');
    expect(await fs.stat(staleFilePath).catch(() => null)).toBeNull();
    expect(runtime.context.close).toHaveBeenCalledTimes(1);
    expect(runtime.browser.close).toHaveBeenCalledTimes(1);
  });

  it('sanitizes invalid prefixed cookies before creating a browser context', async () => {
    const { enqueuePlaywrightNodeRun } = await loadRunner();
    const runtime = await createPlaywrightRuntime();
    mocks.chromiumLaunchMock.mockResolvedValue(runtime.browser);

    await enqueuePlaywrightNodeRun({
      waitForResult: true,
      request: {
        script: 'export default async () => ({ ok: true });',
        startUrl: 'https://kangur.app/login',
        contextOptions: {
          storageState: {
            cookies: [
              {
                name: '__Host-next-auth.csrf-token',
                value: 'csrf123',
                domain: 'kangur.app',
                path: '/login',
              },
              {
                name: 'theme',
                value: 'dark',
                domain: 'kangur.app',
                path: '/',
              },
            ],
            origins: [],
          },
        },
      },
    });

    expect(runtime.browser.newContext).toHaveBeenCalledWith(
      expect.objectContaining({
        storageState: {
          cookies: [
            {
              name: '__Host-next-auth.csrf-token',
              value: 'csrf123',
              domain: 'kangur.app',
              path: '/login',
              secure: true,
            },
            {
              name: 'theme',
              value: 'dark',
              domain: 'kangur.app',
              path: '/',
            },
          ],
          origins: [],
        },
      })
    );
  });

  it('fails when the start URL violates outbound policy', async () => {
    const { enqueuePlaywrightNodeRun, readPlaywrightNodeRun } = await loadRunner();
    const runtime = await createPlaywrightRuntime();
    mocks.webkitLaunchMock.mockResolvedValue(runtime.browser);

    const run = await enqueuePlaywrightNodeRun({
      waitForResult: true,
      request: {
        browserEngine: 'webkit',
        startUrl: 'https://blocked.example.com/start',
        script: 'export default async () => ({ ok: true });',
      },
    });

    expect(run.status).toBe('failed');
    expect(run.error).toContain('Blocked outbound URL');
    expect(runtime.page.goto).not.toHaveBeenCalled();
    expect(runtime.context.close).toHaveBeenCalledTimes(1);
    expect(runtime.browser.close).toHaveBeenCalledTimes(1);

    const persisted = await readPlaywrightNodeRun(run.runId);
    expect(persisted?.status).toBe('failed');
    expect(persisted?.logs).toEqual(
      expect.arrayContaining([expect.stringContaining('[runtime][error] Blocked outbound URL')])
    );
  });

  it('allows only the exact policyAllowedHosts override for startUrl and matching subresources', async () => {
    const { enqueuePlaywrightNodeRun } = await loadRunner();
    const runtime = await createPlaywrightRuntime({
      routeUrls: [
        'http://localhost:3101/static/app.js',
        'http://localhost:3102/static/app.js',
      ],
      pageUrl: 'http://localhost:3101/final',
    });
    mocks.chromiumLaunchMock.mockResolvedValue(runtime.browser);
    mocks.evaluateOutboundUrlPolicyMock.mockImplementation((url: string) =>
      url.includes('localhost')
        ? { allowed: false, reason: 'local_hostname_blocked' }
        : { allowed: true, reason: null }
    );

    const run = await enqueuePlaywrightNodeRun({
      waitForResult: true,
      request: {
        startUrl: 'http://localhost:3101/start',
        policyAllowedHosts: ['localhost:3101'],
        script: 'export default async () => ({ ok: true });',
      },
    });

    expect(run.status).toBe('completed');
    expect(runtime.page.goto).toHaveBeenCalledWith('http://localhost:3101/start', {
      timeout: 30000,
      waitUntil: 'load',
    });
    expect(runtime.routes[0]?.continueMock).toHaveBeenCalledTimes(1);
    expect(runtime.routes[1]?.abortMock).toHaveBeenCalledWith('blockedbyclient');
    expect(run.logs).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          '[policy] Blocked outbound URL: http://localhost:3102/static/app.js'
        ),
      ])
    );
  });

  it('prewarms hostile search profiles on the origin root before the real start url', async () => {
    const { enqueuePlaywrightNodeRun } = await loadRunner();
    const runtime = await createPlaywrightRuntime();
    mocks.chromiumLaunchMock.mockResolvedValue(runtime.browser);

    const run = await enqueuePlaywrightNodeRun({
      waitForResult: true,
      request: {
        startUrl: 'https://allowed.example.com/search?q=lamp',
        script: 'export default async () => ({ ok: true });',
        settingsOverrides: {
          identityProfile: 'search',
        },
      },
    });

    expect(run.status).toBe('completed');
    expect(runtime.page.goto).toHaveBeenNthCalledWith(1, 'https://allowed.example.com/', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });
    expect(runtime.page.goto).toHaveBeenNthCalledWith(
      2,
      'https://allowed.example.com/search?q=lamp',
      {
        timeout: 30000,
        waitUntil: 'load',
      }
    );
    expect(run.logs).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          '[runtime] Applied Chromium anti-detection defaults (profile: search).'
        ),
        expect.stringContaining(
          '[runtime] Prewarming target origin: https://allowed.example.com/'
        ),
        expect.stringContaining('[runtime] Settled prewarm navigation for 120ms.'),
        expect.stringContaining('[runtime] Settled start URL navigation for 80ms.'),
      ])
    );
  });

  it('reuses sticky hostile-profile storage state across runs for the same owner and origin', async () => {
    const { enqueuePlaywrightNodeRun } = await loadRunner();
    const firstRuntime = await createPlaywrightRuntime({
      pageUrl: 'https://allowed.example.com/final',
    });
    const secondRuntime = await createPlaywrightRuntime({
      pageUrl: 'https://allowed.example.com/final-2',
    });
    mocks.chromiumLaunchMock
      .mockResolvedValueOnce(firstRuntime.browser)
      .mockResolvedValueOnce(secondRuntime.browser);

    const firstRun = await enqueuePlaywrightNodeRun({
      waitForResult: true,
      ownerUserId: 'user-sticky',
      request: {
        startUrl: 'https://allowed.example.com/search?q=lamp',
        script: 'export default async () => ({ ok: true });',
        settingsOverrides: {
          identityProfile: 'search',
        },
      },
    });

    expect(firstRun.status).toBe('completed');
    expect(firstRuntime.context.storageState).toHaveBeenCalledTimes(1);

    const secondRun = await enqueuePlaywrightNodeRun({
      waitForResult: true,
      ownerUserId: 'user-sticky',
      request: {
        startUrl: 'https://allowed.example.com/search?q=chair',
        script: 'export default async () => ({ ok: true });',
        settingsOverrides: {
          identityProfile: 'search',
        },
      },
    });

    expect(secondRun.status).toBe('completed');
    expect(secondRuntime.browser.newContext).toHaveBeenCalledWith(
      expect.objectContaining({
        storageState: {
          cookies: [
            expect.objectContaining({
              name: 'session',
              value: 'persisted-session',
              domain: 'allowed.example.com',
            }),
          ],
          origins: [],
        },
      })
    );
    expect(secondRun.logs).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          '[runtime] Applied Chromium anti-detection cooldown (search/allowed.example.com)'
        ),
        expect.stringContaining(
          '[runtime] Loaded sticky storage state (search) for owner:user-sticky at https://allowed.example.com.'
        ),
      ])
    );
  });

  it('applies proxy session affinity when the proxy config opts in with a session placeholder', async () => {
    const { enqueuePlaywrightNodeRun } = await loadRunner();
    const runtime = await createPlaywrightRuntime();
    mocks.chromiumLaunchMock.mockResolvedValue(runtime.browser);

    const run = await enqueuePlaywrightNodeRun({
      waitForResult: true,
      ownerUserId: 'user-proxy',
      request: {
        startUrl: 'https://allowed.example.com/search?q=desk',
        script: 'export default async () => ({ ok: true });',
        settingsOverrides: {
          identityProfile: 'search',
          proxyEnabled: true,
          proxyServer: 'http://proxy.local:8080?session={session}',
          proxyUsername: 'zone-{session}',
          proxyPassword: '__SESSION__',
          proxySessionAffinity: true,
          proxySessionMode: 'sticky',
          proxyProviderPreset: 'custom',
        },
      },
    });

    expect(run.status).toBe('completed');
    expect(mocks.chromiumLaunchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        proxy: {
          server: expect.stringMatching(/^http:\/\/proxy\.local:8080\?session=pw[a-f0-9]{20}$/),
          username: expect.stringMatching(/^zone-pw[a-f0-9]{20}$/),
          password: expect.stringMatching(/^pw[a-f0-9]{20}$/),
        },
      })
    );
    expect(run.logs).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          '[runtime] Applied sticky proxy session (search) for owner:user-proxy at https://allowed.example.com.'
        ),
      ])
    );
  });

  it('rotates proxy session placeholders per run when rotate mode is enabled', async () => {
    const { enqueuePlaywrightNodeRun } = await loadRunner();
    const firstRuntime = await createPlaywrightRuntime();
    const secondRuntime = await createPlaywrightRuntime();
    mocks.chromiumLaunchMock
      .mockResolvedValueOnce(firstRuntime.browser)
      .mockResolvedValueOnce(secondRuntime.browser);

    await enqueuePlaywrightNodeRun({
      waitForResult: true,
      ownerUserId: 'user-rotate',
      request: {
        startUrl: 'https://allowed.example.com/search?q=desk',
        script: 'export default async () => ({ ok: true });',
        settingsOverrides: {
          identityProfile: 'search',
          proxyEnabled: true,
          proxyServer: 'http://proxy.local:8080?session={session}',
          proxySessionAffinity: true,
          proxySessionMode: 'rotate',
          proxyProviderPreset: 'custom',
        },
      },
    });

    await enqueuePlaywrightNodeRun({
      waitForResult: true,
      ownerUserId: 'user-rotate',
      request: {
        startUrl: 'https://allowed.example.com/search?q=desk-2',
        script: 'export default async () => ({ ok: true });',
        settingsOverrides: {
          identityProfile: 'search',
          proxyEnabled: true,
          proxyServer: 'http://proxy.local:8080?session={session}',
          proxySessionAffinity: true,
          proxySessionMode: 'rotate',
          proxyProviderPreset: 'custom',
        },
      },
    });

    const firstProxy =
      mocks.chromiumLaunchMock.mock.calls[0]?.[0]?.proxy?.server;
    const secondProxy =
      mocks.chromiumLaunchMock.mock.calls[1]?.[0]?.proxy?.server;

    expect(firstProxy).not.toEqual(secondProxy);
  });

  it('applies provider presets to proxy usernames when no placeholder is present', async () => {
    const { enqueuePlaywrightNodeRun } = await loadRunner();
    const runtime = await createPlaywrightRuntime();
    mocks.chromiumLaunchMock.mockResolvedValue(runtime.browser);

    const run = await enqueuePlaywrightNodeRun({
      waitForResult: true,
      ownerUserId: 'user-provider',
      request: {
        startUrl: 'https://allowed.example.com/search?q=desk',
        script: 'export default async () => ({ ok: true });',
        settingsOverrides: {
          identityProfile: 'search',
          proxyEnabled: true,
          proxyServer: 'http://brd.superproxy.io:33335',
          proxyUsername: 'brd-customer-123-zone-retail',
          proxySessionAffinity: true,
          proxySessionMode: 'sticky',
          proxyProviderPreset: 'brightdata',
        },
      },
    });

    expect(run.status).toBe('completed');
    expect(mocks.chromiumLaunchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        proxy: {
          server: 'http://brd.superproxy.io:33335',
          username: expect.stringMatching(
            /^brd-customer-123-zone-retail-session-pw[a-f0-9]{20}$/
          ),
        },
      })
    );
  });

  it('returns queued state immediately for background runs and persists later failures', async () => {
    const { enqueuePlaywrightNodeRun, readPlaywrightNodeRun } = await loadRunner();
    const runtime = await createPlaywrightRuntime();
    mocks.firefoxLaunchMock.mockResolvedValue(runtime.browser);

    const queued = await enqueuePlaywrightNodeRun({
      waitForResult: false,
      ownerUserId: 'owner-2',
      request: {
        browserEngine: 'firefox',
        script: 'export default 123;',
      },
    });

    expect(queued.status).toBe('queued');
    expect(queued.ownerUserId).toBe('owner-2');

    await expect
      .poll(async () => {
        const current = await readPlaywrightNodeRun(queued.runId);
        return current?.status ?? null;
      })
      .toBe('failed');

    const persisted = await readPlaywrightNodeRun(queued.runId);
    expect(persisted?.error).toContain('Playwright script must export a default async function');
    expect(runtime.context.close).toHaveBeenCalledTimes(1);
    expect(runtime.browser.close).toHaveBeenCalledTimes(1);
  });

  it('captures failure screenshot, html, and state artifacts when a run throws after page creation', async () => {
    const { enqueuePlaywrightNodeRun, readPlaywrightNodeArtifact } = await loadRunner();
    const runtime = await createPlaywrightRuntime({
      pageUrl: 'https://www.tradera.com/en/login',
      pageTitle: 'Tradera Login',
      html: '<html><body>login form</body></html>',
      screenshotBytes: 'failure-png',
    });
    mocks.chromiumLaunchMock.mockResolvedValue(runtime.browser);

    const run = await enqueuePlaywrightNodeRun({
      waitForResult: true,
      request: {
        script: `
          export default async function run() {
            throw new Error('AUTH_REQUIRED: Tradera login requires manual verification.');
          };
        `,
        failureHoldOpenMs: 5,
        settingsOverrides: {
          headless: false,
        },
      },
    });

    expect(run.status).toBe('failed');
    expect(run.error).toContain('AUTH_REQUIRED: Tradera login requires manual verification.');
    expect(run.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'failure', kind: 'screenshot', mimeType: 'image/png' }),
        expect.objectContaining({ name: 'failure', kind: 'html', mimeType: 'text/html' }),
        expect.objectContaining({
          name: 'failure-state',
          kind: 'json',
          mimeType: 'application/json',
        }),
      ])
    );

    const failureStateArtifact = run.artifacts.find((artifact) => artifact.name === 'failure-state');
    expect(failureStateArtifact).toBeDefined();
    const failureState = JSON.parse(
      (
        await readPlaywrightNodeArtifact({
          runId: run.runId,
          fileName: path.basename(failureStateArtifact?.path ?? ''),
        })
      )?.content.toString('utf8') ?? '{}'
    );
    expect(failureState).toMatchObject({
      finalUrl: 'https://www.tradera.com/en/login',
      title: 'Tradera Login',
      browserDisconnected: false,
      contextClosed: false,
      pageClosed: false,
      pageCrashed: false,
    });
  });

  it('records lifecycle close diagnostics in logs and failure-state artifacts', async () => {
    const { enqueuePlaywrightNodeRun, readPlaywrightNodeArtifact } = await loadRunner();
    const runtime = await createPlaywrightRuntime({
      pageUrl: 'https://www.tradera.com/en/selling/new',
      pageTitle: 'Create listing',
    });
    mocks.chromiumLaunchMock.mockResolvedValue(runtime.browser);

    const run = await enqueuePlaywrightNodeRun({
      waitForResult: true,
      request: {
        script: `
          export default async function run({ input }) {
            await input.emitPageClose();
            await input.emitContextClose();
            await input.emitBrowserDisconnect();
            throw new Error('page.goto: Target page, context or browser has been closed');
          };
        `,
        input: {
          emitPageClose: () => runtime.emitPageEvent('close'),
          emitContextClose: () => runtime.emitContextEvent('close'),
          emitBrowserDisconnect: () => runtime.emitBrowserEvent('disconnected'),
        },
      },
    });

    expect(run.status).toBe('failed');
    expect(run.logs).toEqual(
      expect.arrayContaining([
        '[runtime] Runner page closed.',
        '[runtime] Browser context closed.',
        '[runtime] Browser disconnected.',
        expect.stringContaining('page.goto: Target page, context or browser has been closed'),
      ])
    );

    const failureStateArtifact = run.artifacts.find((artifact) => artifact.name === 'failure-state');
    expect(failureStateArtifact).toBeDefined();
    const failureState = JSON.parse(
      (
        await readPlaywrightNodeArtifact({
          runId: run.runId,
          fileName: path.basename(failureStateArtifact?.path ?? ''),
        })
      )?.content.toString('utf8') ?? '{}'
    );
    expect(failureState).toMatchObject({
      browserDisconnected: true,
      contextClosed: true,
      pageClosed: true,
      pageCrashed: false,
    });
  });

  it('persists emitted outputs while a background run is still running', async () => {
    const { enqueuePlaywrightNodeRun, readPlaywrightNodeRun } = await loadRunner();
    const runtime = await createPlaywrightRuntime();
    mocks.chromiumLaunchMock.mockResolvedValue(runtime.browser);

    const queued = await enqueuePlaywrightNodeRun({
      waitForResult: false,
      request: {
        script: `
          export default async ({ emit, helpers }) => {
            emit('capture_progress', {
              processedCount: 1,
              completedCount: 1,
              failureCount: 0,
              remainingCount: 1,
              totalCount: 2,
            });
            await helpers.sleep(150);
            emit('capture_progress', {
              processedCount: 2,
              completedCount: 2,
              failureCount: 0,
              remainingCount: 0,
              totalCount: 2,
            });
            return { ok: true };
          };
        `,
      },
    });

    await expect
      .poll(async () => {
        const current = await readPlaywrightNodeRun(queued.runId);
        return (current?.result as { outputs?: { capture_progress?: unknown } } | undefined)
          ?.outputs?.capture_progress;
      })
      .toEqual(
        expect.objectContaining({
          processedCount: 1,
          completedCount: 1,
          remainingCount: 1,
          totalCount: 2,
        })
      );

    await expect
      .poll(async () => {
        const current = await readPlaywrightNodeRun(queued.runId);
        return current?.status ?? null;
      })
      .toBe('completed');
  });

  it('exposes persona-aware interaction helpers for clicks and typing', async () => {
    const { enqueuePlaywrightNodeRun } = await loadRunner();
    const runtime = await createPlaywrightRuntime();
    mocks.chromiumLaunchMock.mockResolvedValue(runtime.browser);

    const target = {
      scrollIntoViewIfNeeded: vi.fn(async () => undefined),
      boundingBox: vi.fn(async () => ({
        x: 10,
        y: 20,
        width: 120,
        height: 40,
      })),
      click: vi.fn(async () => undefined),
    };

    const run = await enqueuePlaywrightNodeRun({
      waitForResult: true,
      request: {
        script: `
          export default async ({ helpers, input }) => {
            await helpers.click(input.target, { pauseBefore: false, pauseAfter: false });
            await helpers.fill(input.target, 'hello world', { pauseBefore: false, pauseAfter: false });
            await helpers.press('Escape', { pauseBefore: false, pauseAfter: false });
            await helpers.type('typed text', { pauseBefore: false, pauseAfter: false });
            return { ok: true };
          };
        `,
        input: { target },
        settingsOverrides: {
          humanizeMouse: true,
          mouseJitter: 8,
          clickDelayMin: 11,
          clickDelayMax: 11,
          inputDelayMin: 7,
          inputDelayMax: 7,
          actionDelayMin: 0,
          actionDelayMax: 0,
        },
      },
    });

    expect(run.status).toBe('completed');
    expect(target.scrollIntoViewIfNeeded).toHaveBeenCalled();
    expect(target.boundingBox).toHaveBeenCalled();
    expect(runtime.page.mouse.move).toHaveBeenCalled();
    expect(target.click).toHaveBeenCalledWith(expect.objectContaining({ delay: 11 }));
    expect(runtime.page.keyboard.press).toHaveBeenCalledWith('ControlOrMeta+A', {});
    expect(runtime.page.keyboard.type).toHaveBeenCalledWith(
      'hello world',
      expect.objectContaining({ delay: 7 })
    );
    expect(runtime.page.keyboard.press).toHaveBeenCalledWith(
      'Escape',
      expect.objectContaining({ delay: 7 })
    );
    expect(runtime.page.keyboard.type).toHaveBeenCalledWith(
      'typed text',
      expect.objectContaining({ delay: 7 })
    );
  });

  it('registers a page listener that closes new pages when preventNewPages is true', async () => {
    const { enqueuePlaywrightNodeRun } = await loadRunner();
    const runtime = await createPlaywrightRuntime();

    let capturedPageListener: ((newPage: unknown) => Promise<void>) | null = null;
    const onMock = vi.fn((event: string, handler: (newPage: unknown) => Promise<void>) => {
      if (event === 'page') capturedPageListener = handler;
    });
    runtime.context.on = onMock;

    mocks.chromiumLaunchMock.mockResolvedValue(runtime.browser);

    const run = await enqueuePlaywrightNodeRun({
      waitForResult: true,
      request: {
        script: 'export default async () => ({ ok: true });',
        preventNewPages: true,
      },
    });

    expect(run.status).toBe('completed');
    expect(onMock).toHaveBeenCalledWith('page', expect.any(Function));
    expect(capturedPageListener).not.toBeNull();

    const closeMock = vi.fn(async () => undefined);
    await capturedPageListener!({ close: closeMock });
    expect(closeMock).toHaveBeenCalled();
  });

  it('does not close the runner page when preventNewPages is true', async () => {
    const { enqueuePlaywrightNodeRun } = await loadRunner();
    const runtime = await createPlaywrightRuntime();

    let capturedPageListener: ((newPage: unknown) => Promise<void>) | null = null;
    const onMock = vi.fn((event: string, handler: (newPage: unknown) => Promise<void>) => {
      if (event === 'page') capturedPageListener = handler;
    });
    runtime.context.on = onMock;

    mocks.chromiumLaunchMock.mockResolvedValue(runtime.browser);

    const run = await enqueuePlaywrightNodeRun({
      waitForResult: true,
      request: {
        script: 'export default async () => ({ ok: true });',
        preventNewPages: true,
      },
    });

    expect(run.status).toBe('completed');
    expect(capturedPageListener).not.toBeNull();

    const closeMock = runtime.page.close;
    await capturedPageListener!(runtime.page);
    expect(closeMock).not.toHaveBeenCalled();
  });

  it('does not register a page listener when preventNewPages is not set', async () => {
    const { enqueuePlaywrightNodeRun } = await loadRunner();
    const runtime = await createPlaywrightRuntime();

    const onMock = vi.fn();
    runtime.context.on = onMock;

    mocks.chromiumLaunchMock.mockResolvedValue(runtime.browser);

    const run = await enqueuePlaywrightNodeRun({
      waitForResult: true,
      request: {
        script: 'export default async () => ({ ok: true });',
      },
    });

    expect(run.status).toBe('completed');
    expect(onMock).not.toHaveBeenCalledWith('page', expect.any(Function));
  });
});
