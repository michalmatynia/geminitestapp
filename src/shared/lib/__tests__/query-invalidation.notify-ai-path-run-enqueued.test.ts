// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { AI_PATH_RUN_ENQUEUED_EVENT_NAME } from '@/shared/contracts/ai-paths';
import {
  getRecentAiPathRunEnqueue,
  notifyAiPathRunEnqueued,
} from '@/shared/lib/query-invalidation';

describe('notifyAiPathRunEnqueued', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('dispatches canonical enqueue event and broadcast message when runId is valid', () => {
    const windowListener = vi.fn();
    window.addEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, windowListener as EventListener);

    const constructorSpy = vi.fn();
    const postMessage = vi.fn();
    const close = vi.fn();
    class MockBroadcastChannel {
      constructor() {
        constructorSpy();
      }

      postMessage(message: unknown): void {
        postMessage(message);
      }

      close(): void {
        close();
      }
    }
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

    notifyAiPathRunEnqueued(' run-1 ', {
      entityId: ' product-1 ',
      entityType: 'PRODUCT',
    });

    expect(windowListener).toHaveBeenCalledTimes(1);
    const eventArg = windowListener.mock.calls[0]?.[0] as CustomEvent<Record<string, unknown>>;
    expect(eventArg.detail).toMatchObject({
      type: 'run-enqueued',
      runId: 'run-1',
      entityId: 'product-1',
      entityType: 'product',
    });
    expect(typeof eventArg.detail['at']).toBe('number');

    expect(constructorSpy).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ runId: 'run-1' }));
    expect(close).toHaveBeenCalledTimes(1);
    expect(getRecentAiPathRunEnqueue()).toMatchObject({
      type: 'run-enqueued',
      runId: 'run-1',
      entityId: 'product-1',
      entityType: 'product',
    });
  });

  it('does not dispatch enqueue event when runId is missing', () => {
    const windowListener = vi.fn();
    window.addEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, windowListener as EventListener);

    const broadcastCtor = vi.fn();
    vi.stubGlobal('BroadcastChannel', broadcastCtor);

    notifyAiPathRunEnqueued(undefined, {
      entityId: 'product-1',
      entityType: 'product',
    });

    expect(windowListener).not.toHaveBeenCalled();
    expect(broadcastCtor).not.toHaveBeenCalled();
  });

  it('dispatches window event even when BroadcastChannel cannot be created', () => {
    const windowListener = vi.fn();
    window.addEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, windowListener as EventListener);

    class ThrowingBroadcastChannel {
      constructor() {
        throw new Error('channel unavailable');
      }
    }
    vi.stubGlobal('BroadcastChannel', ThrowingBroadcastChannel);

    notifyAiPathRunEnqueued('run-2', {
      entityId: 'product-2',
      entityType: 'product',
    });

    expect(windowListener).toHaveBeenCalledTimes(1);
  });

  it('dispatches window event even when BroadcastChannel.postMessage fails', () => {
    const windowListener = vi.fn();
    window.addEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, windowListener as EventListener);

    const constructorSpy = vi.fn();
    const close = vi.fn();
    class ThrowingPostMessageChannel {
      constructor() {
        constructorSpy();
      }

      postMessage(): void {
        throw new Error('post failed');
      }

      close(): void {
        close();
      }
    }
    vi.stubGlobal('BroadcastChannel', ThrowingPostMessageChannel);

    notifyAiPathRunEnqueued('run-3', {
      entityId: 'product-3',
      entityType: 'product',
    });

    expect(windowListener).toHaveBeenCalledTimes(1);
    expect(constructorSpy).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
  });
});
