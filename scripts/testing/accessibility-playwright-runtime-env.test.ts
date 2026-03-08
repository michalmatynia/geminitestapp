import { describe, expect, it } from 'vitest';

import {
  buildAccessibilityBrokerLeaseRequest,
  buildAccessibilityPlaywrightRuntimeContext,
  buildAccessibilityPlaywrightRuntimeEnv,
} from './lib/accessibility-playwright-runtime-env.mjs';

describe('buildAccessibilityPlaywrightRuntimeEnv', () => {
  it('disables queue workers by default for accessibility runtimes', () => {
    expect(buildAccessibilityPlaywrightRuntimeEnv({ env: {} })).toEqual({
      DISABLE_QUEUE_WORKERS: 'true',
    });
  });

  it('prefers a dedicated runtime override when provided', () => {
    expect(
      buildAccessibilityPlaywrightRuntimeEnv({
        env: {
          DISABLE_QUEUE_WORKERS: 'true',
          PLAYWRIGHT_RUNTIME_DISABLE_QUEUE_WORKERS: ' FALSE ',
        },
      })
    ).toEqual({
      DISABLE_QUEUE_WORKERS: 'false',
      PLAYWRIGHT_RUNTIME_DISABLE_QUEUE_WORKERS: ' FALSE ',
    });
  });

  it('falls back to the process-wide queue worker setting', () => {
    expect(
      buildAccessibilityPlaywrightRuntimeEnv({
        env: {
          DISABLE_QUEUE_WORKERS: 'false',
          PATH: '/usr/bin',
        },
      })
    ).toEqual({
      DISABLE_QUEUE_WORKERS: 'false',
      PATH: '/usr/bin',
    });
  });

  it('treats blank overrides as unset and keeps the default worker suppression', () => {
    expect(
      buildAccessibilityPlaywrightRuntimeEnv({
        env: {
          DISABLE_QUEUE_WORKERS: '   ',
          PLAYWRIGHT_RUNTIME_DISABLE_QUEUE_WORKERS: '',
        },
      })
    ).toEqual({
      DISABLE_QUEUE_WORKERS: 'true',
      PLAYWRIGHT_RUNTIME_DISABLE_QUEUE_WORKERS: '',
    });
  });
});

describe('buildAccessibilityPlaywrightRuntimeContext', () => {
  it('builds broker runtime defaults from the current process env', () => {
    expect(
      buildAccessibilityPlaywrightRuntimeContext({
        env: {},
        agentId: 'michalmatynia',
      })
    ).toEqual({
      agentId: 'michalmatynia',
      host: '127.0.0.1',
      shouldStopRuntime: true,
      runtimeEnv: {
        DISABLE_QUEUE_WORKERS: 'true',
      },
    });
  });

  it('respects explicit runtime transport settings and keep-alive', () => {
    expect(
      buildAccessibilityPlaywrightRuntimeContext({
        env: {
          HOST: '0.0.0.0',
          PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:4010',
          PLAYWRIGHT_RUNTIME_KEEP_ALIVE: 'true',
          PLAYWRIGHT_RUNTIME_DISABLE_QUEUE_WORKERS: 'false',
        },
        agentId: 'route-crawl-final',
      })
    ).toEqual({
      agentId: 'route-crawl-final',
      host: '0.0.0.0',
      shouldStopRuntime: false,
      runtimeEnv: {
        HOST: '0.0.0.0',
        PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:4010',
        PLAYWRIGHT_RUNTIME_KEEP_ALIVE: 'true',
        PLAYWRIGHT_RUNTIME_DISABLE_QUEUE_WORKERS: 'false',
        DISABLE_QUEUE_WORKERS: 'false',
      },
    });
  });
});

describe('buildAccessibilityBrokerLeaseRequest', () => {
  it('builds the broker lease request from the shared runtime context', () => {
    expect(
      buildAccessibilityBrokerLeaseRequest({
        rootDir: '/repo',
        context: {
          agentId: 'michalmatynia-route-crawl',
          host: '127.0.0.1',
          shouldStopRuntime: true,
          runtimeEnv: {
            DISABLE_QUEUE_WORKERS: 'true',
          },
        },
      })
    ).toEqual({
      rootDir: '/repo',
      appId: 'web',
      mode: 'dev',
      agentId: 'michalmatynia-route-crawl',
      host: '127.0.0.1',
      env: {
        DISABLE_QUEUE_WORKERS: 'true',
      },
    });
  });

  it('respects an explicit app id override', () => {
    expect(
      buildAccessibilityBrokerLeaseRequest({
        rootDir: '/repo',
        appId: 'docs',
        context: {
          agentId: 'docs-a11y',
          host: '0.0.0.0',
          shouldStopRuntime: false,
          runtimeEnv: {
            DISABLE_QUEUE_WORKERS: 'false',
          },
        },
      })
    ).toEqual({
      rootDir: '/repo',
      appId: 'docs',
      mode: 'dev',
      agentId: 'docs-a11y',
      host: '0.0.0.0',
      env: {
        DISABLE_QUEUE_WORKERS: 'false',
      },
    });
  });
});
