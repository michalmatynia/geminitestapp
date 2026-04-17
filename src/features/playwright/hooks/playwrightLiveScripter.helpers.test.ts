// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  LiveScripterConnectionRefs,
  LiveScripterStateSetters,
} from './playwrightLiveScripter.result';
import { startLiveScripterSession } from './playwrightLiveScripter.helpers';

const createRefs = (): LiveScripterConnectionRefs => ({
  sessionIdRef: { current: null },
  socketRef: { current: null },
  socketPathRef: { current: null },
  connectionTokenRef: { current: 0 },
  reconnectAttemptsRef: { current: 0 },
  pendingMessagesRef: { current: [] },
});

const createSetters = (): LiveScripterStateSetters => ({
  setStatus: vi.fn(),
  setFrame: vi.fn(),
  setPickedElement: vi.fn(),
  setCurrentUrl: vi.fn(),
  setCurrentTitle: vi.fn(),
  setErrorMessage: vi.fn(),
});

describe('playwrightLiveScripter.helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('surfaces the structured API error message instead of the raw JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'Live scripter URL is invalid.',
          code: 'BAD_REQUEST',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const refs = createRefs();
    const setters = createSetters();
    const dispose = vi.fn().mockResolvedValue(undefined);
    const clearClientState = vi.fn();
    const closeSocket = vi.fn();

    await startLiveScripterSession({
      url: 'amazon.com',
      refs,
      dispose,
      clearClientState,
      closeSocket,
      setters,
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/playwright/live-scripter/start', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'amazon.com',
        websiteId: null,
        flowId: null,
        personaId: null,
        selectorProfile: null,
      }),
    });
    expect(setters.setStatus).toHaveBeenNthCalledWith(1, 'starting');
    expect(setters.setStatus).toHaveBeenLastCalledWith('error');
    expect(setters.setErrorMessage).toHaveBeenLastCalledWith(
      'Live scripter URL is invalid.'
    );
  });
});
