import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { contextRegistryResolveRefsMock } = vi.hoisted(() => ({
  contextRegistryResolveRefsMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  contextRegistryEngine: {
    resolveRefs: contextRegistryResolveRefsMock,
  },
}));

vi.mock('server-only', () => ({}));

import {
  __resetContextRegistryBundleCacheForTests,
  resolveKangurAiTutorContextRegistryBundle,
} from './ai-tutor-context-registry-cache';

const makeBundle = (id: string) => ({
  refs: [],
  nodes: [],
  documents: [{ id, collectionId: 'test', documentId: id, title: id }],
  truncated: false,
  engineVersion: 'v1',
});

const makeRef = (id: string) => ({ kind: 'static_node' as const, id });

beforeEach(() => {
  vi.resetAllMocks();
  __resetContextRegistryBundleCacheForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('resolveKangurAiTutorContextRegistryBundle', () => {
  it('calls engine.resolveRefs and returns its result', async () => {
    const bundle = makeBundle('doc-1');
    contextRegistryResolveRefsMock.mockResolvedValue(bundle);

    const result = await resolveKangurAiTutorContextRegistryBundle({
      refs: [makeRef('page:test')],
    });

    expect(result).toBe(bundle);
    expect(contextRegistryResolveRefsMock).toHaveBeenCalledOnce();
  });

  it('returns cached bundle on second call with same refs without calling engine again', async () => {
    const bundle = makeBundle('doc-cached');
    contextRegistryResolveRefsMock.mockResolvedValue(bundle);

    const refs = [makeRef('page:test')];
    await resolveKangurAiTutorContextRegistryBundle({ refs });
    const second = await resolveKangurAiTutorContextRegistryBundle({ refs });

    expect(second).toBe(bundle);
    expect(contextRegistryResolveRefsMock).toHaveBeenCalledOnce();
  });

  it('calls engine again after TTL expires', async () => {
    vi.useFakeTimers();
    const bundle1 = makeBundle('doc-1');
    const bundle2 = makeBundle('doc-2');
    contextRegistryResolveRefsMock.mockResolvedValueOnce(bundle1).mockResolvedValueOnce(bundle2);

    const refs = [makeRef('page:test')];
    const first = await resolveKangurAiTutorContextRegistryBundle({ refs });
    vi.advanceTimersByTime(61_000);
    const second = await resolveKangurAiTutorContextRegistryBundle({ refs });

    expect(first).toBe(bundle1);
    expect(second).toBe(bundle2);
    expect(contextRegistryResolveRefsMock).toHaveBeenCalledTimes(2);
  });

  it('calls engine separately for different ref sets', async () => {
    contextRegistryResolveRefsMock
      .mockResolvedValueOnce(makeBundle('doc-A'))
      .mockResolvedValueOnce(makeBundle('doc-B'));

    await resolveKangurAiTutorContextRegistryBundle({ refs: [makeRef('page:a')] });
    await resolveKangurAiTutorContextRegistryBundle({ refs: [makeRef('page:b')] });

    expect(contextRegistryResolveRefsMock).toHaveBeenCalledTimes(2);
  });

  it('produces the same cache key regardless of ref order', async () => {
    const bundle = makeBundle('doc-order');
    contextRegistryResolveRefsMock.mockResolvedValue(bundle);

    await resolveKangurAiTutorContextRegistryBundle({
      refs: [makeRef('page:z'), makeRef('page:a')],
    });
    await resolveKangurAiTutorContextRegistryBundle({
      refs: [makeRef('page:a'), makeRef('page:z')],
    });

    expect(contextRegistryResolveRefsMock).toHaveBeenCalledOnce();
  });

  it('passes maxNodes and depth to engine', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(makeBundle('doc-x'));

    await resolveKangurAiTutorContextRegistryBundle({
      refs: [makeRef('page:x')],
      maxNodes: 12,
      depth: 2,
    });

    expect(contextRegistryResolveRefsMock).toHaveBeenCalledWith({
      refs: [makeRef('page:x')],
      maxNodes: 12,
      depth: 2,
    });
  });

  it('uses default maxNodes=24 and depth=1 when not specified', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(makeBundle('doc-defaults'));

    await resolveKangurAiTutorContextRegistryBundle({ refs: [makeRef('page:d')] });

    expect(contextRegistryResolveRefsMock).toHaveBeenCalledWith({
      refs: [makeRef('page:d')],
      maxNodes: 24,
      depth: 1,
    });
  });

  it('separates cache entries by maxNodes/depth', async () => {
    contextRegistryResolveRefsMock
      .mockResolvedValueOnce(makeBundle('doc-small'))
      .mockResolvedValueOnce(makeBundle('doc-large'));

    const refs = [makeRef('page:test')];
    await resolveKangurAiTutorContextRegistryBundle({ refs, maxNodes: 8 });
    await resolveKangurAiTutorContextRegistryBundle({ refs, maxNodes: 24 });

    expect(contextRegistryResolveRefsMock).toHaveBeenCalledTimes(2);
  });
});
