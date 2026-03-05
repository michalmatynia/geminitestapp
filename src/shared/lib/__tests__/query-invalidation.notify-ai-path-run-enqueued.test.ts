// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { notifyAiPathRunEnqueued } from '@/shared/lib/query-invalidation';

describe('notifyAiPathRunEnqueued', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('dispatches canonical enqueue event and broadcast message when runId is valid', () => {
    const windowListener = vi.fn();
    window.addEventListener('ai-path-run-enqueued', windowListener as EventListener);

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
  });

  it('does not dispatch enqueue event when runId is missing', () => {
    const windowListener = vi.fn();
    window.addEventListener('ai-path-run-enqueued', windowListener as EventListener);

    const broadcastCtor = vi.fn();
    vi.stubGlobal('BroadcastChannel', broadcastCtor);

    notifyAiPathRunEnqueued(undefined, {
      entityId: 'product-1',
      entityType: 'product',
    });

    expect(windowListener).not.toHaveBeenCalled();
    expect(broadcastCtor).not.toHaveBeenCalled();
  });
});
