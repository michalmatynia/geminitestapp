import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurLessons } from '@/features/kangur/settings';
import { createDefaultKangurSections } from '@/features/kangur/lessons/lesson-section-defaults';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  getKangurLessonRepositoryMock,
  listLessonsMock,
  getKangurLessonSectionRepositoryMock,
  listSectionsMock,
} = vi.hoisted(() => ({
  getKangurLessonRepositoryMock: vi.fn(),
  listLessonsMock: vi.fn(),
  getKangurLessonSectionRepositoryMock: vi.fn(),
  listSectionsMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-lesson-repository', () => ({
  getKangurLessonRepository: getKangurLessonRepositoryMock,
}));

vi.mock('@/features/kangur/services/kangur-lesson-section-repository', () => ({
  getKangurLessonSectionRepository: getKangurLessonSectionRepositoryMock,
}));

import {
  clearKangurLessonsCatalogCache,
  getKangurLessonsCatalogHandler,
} from './handler';

const createRequestContext = (query?: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-lessons-catalog-1',
    traceId: 'trace-kangur-lessons-catalog-1',
    correlationId: 'corr-kangur-lessons-catalog-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
  }) as ApiHandlerContext;

describe('kangur lessons catalog handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearKangurLessonsCatalogCache();
    getKangurLessonRepositoryMock.mockResolvedValue({
      listLessons: listLessonsMock,
    });
    getKangurLessonSectionRepositoryMock.mockResolvedValue({
      listSections: listSectionsMock,
    });
  });

  it('reuses cached catalog payload across repeated list requests', async () => {
    const divisionLesson = createDefaultKangurLessons().find((lesson) => lesson.componentId === 'division');
    const mathsSection = createDefaultKangurSections().find((section) => section.id === 'maths_arithmetic');
    expect(divisionLesson).toBeDefined();
    expect(mathsSection).toBeDefined();
    listLessonsMock.mockResolvedValue([divisionLesson!]);
    listSectionsMock.mockResolvedValue([mathsSection!]);

    const first = await getKangurLessonsCatalogHandler(
      new NextRequest('http://localhost/api/kangur/lessons-catalog?subject=maths&enabledOnly=true'),
      createRequestContext({ subject: 'maths', enabledOnly: true })
    );
    const second = await getKangurLessonsCatalogHandler(
      new NextRequest('http://localhost/api/kangur/lessons-catalog?subject=maths&enabledOnly=true'),
      createRequestContext({ subject: 'maths', enabledOnly: true })
    );

    expect(listLessonsMock).toHaveBeenCalledTimes(1);
    expect(listSectionsMock).toHaveBeenCalledTimes(1);
    expect(first.headers.get('cache-control')).toBe('no-store');
    expect(second.headers.get('cache-control')).toBe('no-store');
    await expect(first.json()).resolves.toEqual({
      lessons: [expect.objectContaining({ componentId: 'division' })],
      sections: [expect.objectContaining({ id: 'maths_arithmetic' })],
    });
    await expect(second.json()).resolves.toEqual({
      lessons: [expect.objectContaining({ componentId: 'division' })],
      sections: [expect.objectContaining({ id: 'maths_arithmetic' })],
    });
  });

  it('forwards componentId subsets into the lesson repository filter', async () => {
    const divisionLesson = createDefaultKangurLessons().find((lesson) => lesson.componentId === 'division');
    const mathsSection = createDefaultKangurSections().find((section) => section.id === 'maths_arithmetic');
    expect(divisionLesson).toBeDefined();
    expect(mathsSection).toBeDefined();
    listLessonsMock.mockResolvedValue([divisionLesson!]);
    listSectionsMock.mockResolvedValue([mathsSection!]);

    await getKangurLessonsCatalogHandler(
      new NextRequest(
        'http://localhost/api/kangur/lessons-catalog?subject=maths&componentIds=division&enabledOnly=true'
      ),
      createRequestContext({
        subject: 'maths',
        componentIds: 'division',
        enabledOnly: true,
      })
    );

    expect(listLessonsMock).toHaveBeenCalledWith({
      subject: 'maths',
      ageGroup: undefined,
      componentIds: ['division'],
      enabledOnly: true,
    });
  });
});
