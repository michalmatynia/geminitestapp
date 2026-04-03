// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { AI_PATH_RUN_ENQUEUED_EVENT_NAME } from '@/shared/contracts/ai-paths';
import {
  clearRecentAiPathRunEnqueue,
  getRecentAiPathRunEnqueue,
  notifyAiPathRunEnqueued,
  rememberRecentAiPathRunEnqueue,
} from '@/shared/lib/query-invalidation';

describe('notifyAiPathRunEnqueued', () => {
  afterEach(() => {
    clearRecentAiPathRunEnqueue();
    vi.useRealTimers();
    vi.restoreAllMocks();
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

  it('still dispatches the enqueue event when recent enqueue persistence fails', () => {
    const windowListener = vi.fn();
    window.addEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, windowListener as EventListener);

    const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ): void {
      if (key === 'ai-path-run-recent-enqueue') {
        throw new Error('Quota exceeded');
      }
      originalSetItem(key, value);
    });

    expect(() =>
      notifyAiPathRunEnqueued('run-4', {
        entityId: 'product-4',
        entityType: 'product',
      })
    ).not.toThrow();

    expect(windowListener).toHaveBeenCalledTimes(1);
    expect(getRecentAiPathRunEnqueue()).toMatchObject({
      type: 'run-enqueued',
      runId: 'run-4',
      entityId: 'product-4',
      entityType: 'product',
    });
  });

  it('prefers a newer persisted enqueue record over an older in-memory record', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    rememberRecentAiPathRunEnqueue({
      type: 'run-enqueued',
      runId: 'run-memory',
      entityId: 'product-memory',
      entityType: 'product',
      at: Date.now(),
    });

    window.localStorage.setItem(
      'ai-path-run-recent-enqueue',
      JSON.stringify({
        type: 'run-enqueued',
        runId: 'run-storage',
        entityId: 'product-storage',
        entityType: 'product',
        at: Date.now() + 1_000,
        expiresAt: Date.now() + 30_000,
      })
    );

    expect(getRecentAiPathRunEnqueue()).toEqual({
      type: 'run-enqueued',
      runId: 'run-storage',
      entityId: 'product-storage',
      entityType: 'product',
      at: Date.now() + 1_000,
    });
  });

  it('clears malformed persisted enqueue records', () => {
    window.localStorage.setItem('ai-path-run-recent-enqueue', '{bad json');

    expect(getRecentAiPathRunEnqueue()).toBeNull();
    expect(window.localStorage.getItem('ai-path-run-recent-enqueue')).toBeNull();
  });

  it('normalizes persisted enqueue record fields and clears invalid timestamps', () => {
    window.localStorage.setItem(
      'ai-path-run-recent-enqueue',
      JSON.stringify({
        type: 'run-enqueued',
        runId: ' run-storage ',
        entityId: '   ',
        entityType: ' PRODUCT ',
        at: Date.now(),
        expiresAt: Date.now() + 10_000,
      })
    );

    expect(getRecentAiPathRunEnqueue()).toEqual({
      type: 'run-enqueued',
      runId: 'run-storage',
      entityId: null,
      entityType: 'product',
      at: expect.any(Number),
    });

    clearRecentAiPathRunEnqueue();
    window.localStorage.setItem(
      'ai-path-run-recent-enqueue',
      JSON.stringify({
        type: 'run-enqueued',
        runId: 'run-invalid',
        entityId: 'product-invalid',
        entityType: 'product',
        at: -1,
        expiresAt: Date.now() + 10_000,
      })
    );

    expect(getRecentAiPathRunEnqueue()).toBeNull();
    expect(window.localStorage.getItem('ai-path-run-recent-enqueue')).toBeNull();
  });
});
