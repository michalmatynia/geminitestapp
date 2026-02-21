import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runsApi } from '../client';

describe('runsApi.stream', () => {
  const eventSourceCtor = vi.fn((_url: string) => ({ close: vi.fn() }));

  beforeEach(() => {
    eventSourceCtor.mockClear();
    vi.stubGlobal('EventSource', eventSourceCtor as unknown as typeof EventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds run stream URL', () => {
    runsApi.stream('run_123');

    expect(eventSourceCtor).toHaveBeenCalledWith('/api/ai-paths/runs/run_123/stream');
  });

  it('appends the since cursor when provided', () => {
    runsApi.stream('run_123', { since: '2026-02-21T19:00:00.000Z' });

    expect(eventSourceCtor).toHaveBeenCalledWith(
      '/api/ai-paths/runs/run_123/stream?since=2026-02-21T19%3A00%3A00.000Z',
    );
  });
});
