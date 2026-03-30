/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/api-client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      get: apiGetMock,
    },
  };
});

vi.mock('@/features/kangur/observability/client', () => ({
  isRecoverableKangurClientFetchError: () => true,
  withKangurClientError: async (
    _buildReport: unknown,
    task: () => Promise<unknown>,
    options: { fallback: unknown | (() => unknown) }
  ) => {
    try {
      return await task();
    } catch {
      return typeof options.fallback === 'function'
        ? (options.fallback as () => unknown)()
        : options.fallback;
    }
  },
}));

describe('Kangur Mongo runtime fallbacks', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('does not fall back to built-in lessons when the lessons API fails', async () => {
    apiGetMock.mockRejectedValueOnce(new Error('mongo unavailable'));
    const { fetchKangurLessons } = await import('./useKangurLessons');

    const result = await fetchKangurLessons({
      subject: 'english',
      enabledOnly: true,
    });

    expect(result).toEqual([]);
  });

  it('does not fall back to built-in lesson sections when the sections API fails', async () => {
    apiGetMock.mockRejectedValueOnce(new Error('mongo unavailable'));
    const { fetchKangurLessonSections } = await import('./useKangurLessonSections');

    const result = await fetchKangurLessonSections({
      subject: 'english',
      enabledOnly: true,
    });

    expect(result).toEqual([]);
  });

  it('does not fall back to built-in lessons catalog when the catalog API fails', async () => {
    apiGetMock.mockRejectedValueOnce(new Error('mongo unavailable'));
    const { fetchKangurLessonsCatalog } = await import('./useKangurLessonsCatalog');

    const result = await fetchKangurLessonsCatalog({
      subject: 'english',
      enabledOnly: true,
    });

    expect(result).toEqual({
      lessons: [],
      sections: [],
    });
  });
});
