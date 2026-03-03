import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { streamAiPathRun } from '../client';

describe('streamAiPathRun', () => {
  const eventSourceClose = vi.fn();
  class MockEventSource {
    close = eventSourceClose;
    constructor(_url: string) {
      eventSourceCtor(_url);
    }
  }
  const eventSourceCtor = vi.fn();

  beforeEach(() => {
    eventSourceCtor.mockClear();
    eventSourceClose.mockClear();
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds run stream URL', () => {
    streamAiPathRun('run_123');

    expect(eventSourceCtor).toHaveBeenCalledWith('/api/ai-paths/runs/run_123/stream');
  });

  it('appends the since cursor when provided', () => {
    streamAiPathRun('run_123', { since: '2026-02-21T19:00:00.000Z' });

    expect(eventSourceCtor).toHaveBeenCalledWith(
      '/api/ai-paths/runs/run_123/stream?since=2026-02-21T19%3A00%3A00.000Z'
    );
  });
});
