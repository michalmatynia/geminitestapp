import { beforeEach, describe, expect, it, vi } from 'vitest';

import { internalError } from '@/shared/errors/app-error';

const { openPlaywrightConnectionNativeTaskSessionMock, closeMock } = vi.hoisted(() => ({
  openPlaywrightConnectionNativeTaskSessionMock: vi.fn(),
  closeMock: vi.fn(),
}));

vi.mock('./browser-session', async () => {
  const actual =
    await vi.importActual<typeof import('./browser-session')>('./browser-session');
  return {
    ...actual,
    openPlaywrightConnectionNativeTaskSession: (...args: unknown[]) =>
      openPlaywrightConnectionNativeTaskSessionMock(...args),
  };
});

import {
  buildPlaywrightNativeTaskResult,
  buildPlaywrightNativeTaskErrorMeta,
  createPlaywrightNativeTaskInternalError,
  runPlaywrightConnectionNativeTask,
  withPlaywrightNativeTaskErrorMeta,
} from './native-task';

const session = {
  sessionMetadata: {
    instance: {
      kind: 'tradera_standard_listing',
      family: 'listing',
      connectionId: 'connection-1',
      integrationId: 'integration-1',
      listingId: 'listing-1',
    },
    browserLabel: 'Chrome',
    fallbackMessages: ['Brave unavailable'],
    resolvedBrowserPreference: 'auto',
    personaId: 'persona-1',
    deviceProfileName: 'Desktop Chrome',
  },
  effectiveBrowserMode: 'headed' as const,
  effectiveBrowserPreference: 'chrome' as const,
  requestedBrowserMode: 'connection_default' as const,
  requestedBrowserPreference: 'chrome' as const,
  close: closeMock,
  context: {} as never,
  page: {} as never,
};

describe('playwright native task helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    openPlaywrightConnectionNativeTaskSessionMock.mockResolvedValue(session);
  });

  it('builds a browser listing result with centralized native-task metadata', () => {
    expect(
      buildPlaywrightNativeTaskResult({
        session,
        externalListingId: 'external-1',
        listingUrl: 'https://example.com/listing/1',
        completedAt: '2026-04-10T16:00:00.000Z',
        metadata: {
          mode: 'standard',
          publishVerified: true,
        },
      })
    ).toEqual({
      externalListingId: 'external-1',
      listingUrl: 'https://example.com/listing/1',
      completedAt: '2026-04-10T16:00:00.000Z',
      metadata: {
        browserMode: 'headed',
        requestedBrowserMode: 'connection_default',
        browserPreference: 'chrome',
        requestedBrowserPreference: 'chrome',
        browserLabel: 'Chrome',
        fallbackMessages: ['Brave unavailable'],
        playwright: session.sessionMetadata,
        mode: 'standard',
        publishVerified: true,
      },
    });
  });

  it('merges native-task metadata into an existing app error', () => {
    const baseError = internalError('Listing failed', {
      existing: true,
    });

    const enrichedError = withPlaywrightNativeTaskErrorMeta(baseError, {
      session,
      additional: {
        authState: {
          loggedIn: false,
        },
      },
    });

    expect(enrichedError.message).toBe('Listing failed');
    expect(enrichedError.meta).toEqual({
      existing: true,
      browserMode: 'headed',
      requestedBrowserMode: 'connection_default',
      browserPreference: 'chrome',
      requestedBrowserPreference: 'chrome',
      browserLabel: 'Chrome',
      fallbackMessages: ['Brave unavailable'],
      playwright: session.sessionMetadata,
      authState: {
        loggedIn: false,
      },
    });
  });

  it('builds native-task error metadata as a reusable centralized envelope', () => {
    expect(
      buildPlaywrightNativeTaskErrorMeta({
        session,
        additional: {
          publishVerified: false,
        },
      })
    ).toEqual({
      browserMode: 'headed',
      requestedBrowserMode: 'connection_default',
      browserPreference: 'chrome',
      requestedBrowserPreference: 'chrome',
      browserLabel: 'Chrome',
      fallbackMessages: ['Brave unavailable'],
      playwright: session.sessionMetadata,
      publishVerified: false,
    });
  });

  it('creates a centralized internal error with native-task metadata', () => {
    const error = createPlaywrightNativeTaskInternalError('Publish verification failed', {
      session,
      additional: {
        publishVerified: false,
      },
    });

    expect(error.message).toBe('Publish verification failed');
    expect(error.meta).toEqual({
      browserMode: 'headed',
      requestedBrowserMode: 'connection_default',
      browserPreference: 'chrome',
      requestedBrowserPreference: 'chrome',
      browserLabel: 'Chrome',
      fallbackMessages: ['Brave unavailable'],
      playwright: session.sessionMetadata,
      publishVerified: false,
    });
  });

  it('runs native tasks through the shared instance-task contract and closes the session', async () => {
    const result = await runPlaywrightConnectionNativeTask({
      connection: {
        id: 'connection-1',
      } as never,
      execute: async () => ({
        ok: true,
      }),
    });

    expect(result).toEqual({
      ok: true,
    });
    expect(openPlaywrightConnectionNativeTaskSessionMock).toHaveBeenCalledWith({
      connection: {
        id: 'connection-1',
      },
      instance: undefined,
      requestedBrowserMode: undefined,
      requestedBrowserPreference: undefined,
      viewport: undefined,
    });
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('merges native metadata into plain Error failures via the shared adapter', async () => {
    await expect(
      runPlaywrightConnectionNativeTask({
        connection: {
          id: 'connection-1',
        } as never,
        execute: async () => {
          throw new Error('Listing failed');
        },
        buildErrorAdditional: async () => ({
          publishVerified: false,
        }),
      })
    ).rejects.toMatchObject({
      message: 'Listing failed',
      meta: {
        browserMode: 'headed',
        requestedBrowserMode: 'connection_default',
        browserPreference: 'chrome',
        requestedBrowserPreference: 'chrome',
        browserLabel: 'Chrome',
        fallbackMessages: ['Brave unavailable'],
        playwright: session.sessionMetadata,
        publishVerified: false,
      },
    });

    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
