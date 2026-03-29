import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurLessons } from '@/features/kangur/settings';
import { createDefaultKangurSections } from '@/features/kangur/lessons/lesson-section-defaults';

const createListQueryV2Mock = vi.hoisted(() => vi.fn());

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: createListQueryV2Mock,
  createSingleQueryV2: vi.fn(),
  createUpdateMutationV2: vi.fn(),
  prefetchQueryV2: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
  },
}));

vi.mock('@/features/kangur/observability/client', () => ({
  isRecoverableKangurClientFetchError: () => false,
  withKangurClientError: async (
    _buildReport: unknown,
    task: () => Promise<unknown>
  ) => await task(),
}));

describe('Kangur Mongo runtime placeholders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createListQueryV2Mock.mockReturnValue({ kind: 'list-query' });
  });

  it('configures lessons without built-in placeholder data', async () => {
    const lessonsPayload = createDefaultKangurLessons().filter(
      (lesson) => lesson.subject === 'english' && lesson.ageGroup === 'ten_year_old'
    );
    apiGetMock.mockResolvedValueOnce(lessonsPayload);

    const { useKangurLessons } = await import('./useKangurLessons');
    const { result } = renderHook(() =>
      useKangurLessons({ subject: 'english', enabledOnly: true })
    );
    const config = createListQueryV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'list-query' });
    expect(config.placeholderData).toBeUndefined();
    await expect(config.queryFn()).resolves.toEqual(lessonsPayload);
  });

  it('configures lesson sections without built-in placeholder data', async () => {
    const sectionsPayload = createDefaultKangurSections().filter(
      (section) => section.subject === 'english' && section.ageGroup === 'ten_year_old'
    );
    apiGetMock.mockResolvedValueOnce(sectionsPayload);

    const { useKangurLessonSections } = await import('./useKangurLessonSections');
    const { result } = renderHook(() =>
      useKangurLessonSections({ subject: 'english', enabledOnly: true })
    );
    const config = createListQueryV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'list-query' });
    expect(config.placeholderData).toBeUndefined();
    await expect(config.queryFn()).resolves.toEqual(sectionsPayload);
  });

  it('configures the combined lessons catalog to retain previous data while refetching', async () => {
    const catalogPayload = {
      lessons: createDefaultKangurLessons().filter(
        (lesson) => lesson.subject === 'english' && lesson.ageGroup === 'ten_year_old'
      ),
      sections: createDefaultKangurSections().filter(
        (section) => section.subject === 'english' && section.ageGroup === 'ten_year_old'
      ),
    };
    apiGetMock.mockResolvedValueOnce(catalogPayload);

    const { useKangurLessonsCatalog } = await import('./useKangurLessonsCatalog');
    const { result } = renderHook(() =>
      useKangurLessonsCatalog({ subject: 'english', enabledOnly: true })
    );
    const config = createListQueryV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'list-query' });
    expect(config.placeholderData(catalogPayload)).toEqual(catalogPayload);
    await expect(config.queryFn()).resolves.toEqual(catalogPayload);
    expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/lessons-catalog', {
      params: {
        subject: 'english',
        ageGroup: undefined,
        componentIds: undefined,
        enabledOnly: true,
      },
      timeout: 30000,
    });
  });

  it('serializes subset componentIds for the lessons catalog request', async () => {
    const catalogPayload = {
      lessons: createDefaultKangurLessons().filter(
        (lesson) =>
          lesson.subject === 'english' &&
          ['english_adjectives', 'english_comparatives_superlatives'].includes(lesson.componentId)
      ),
      sections: createDefaultKangurSections().filter(
        (section) => section.subject === 'english' && section.ageGroup === 'ten_year_old'
      ),
    };
    apiGetMock.mockResolvedValueOnce(catalogPayload);

    const { useKangurLessonsCatalog } = await import('./useKangurLessonsCatalog');
    renderHook(() =>
      useKangurLessonsCatalog({
        subject: 'english',
        enabledOnly: true,
        componentIds: ['english_adjectives', 'english_comparatives_superlatives'],
      })
    );
    const config = createListQueryV2Mock.mock.calls.at(-1)?.[0];

    await expect(config.queryFn()).resolves.toEqual(catalogPayload);
    expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/lessons-catalog', {
      params: {
        subject: 'english',
        ageGroup: undefined,
        componentIds: 'english_adjectives,english_comparatives_superlatives',
        enabledOnly: true,
      },
      timeout: 30000,
    });
  });
});
