import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurLessons } from '@/features/kangur/settings';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { getKangurLessonRepositoryMock, listLessonsMock, replaceLessonsMock, resolveKangurActorMock } =
  vi.hoisted(() => ({
    getKangurLessonRepositoryMock: vi.fn(),
    listLessonsMock: vi.fn(),
    replaceLessonsMock: vi.fn(),
    resolveKangurActorMock: vi.fn(),
  }));

vi.mock('@/features/kangur/services/kangur-lesson-repository', () => ({
  getKangurLessonRepository: getKangurLessonRepositoryMock,
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: resolveKangurActorMock,
}));

import {
  clearKangurLessonsCache,
  getKangurLessonsHandler,
  postKangurLessonsHandler,
} from './handler';

const createRequestContext = (query?: Record<string, unknown>, body?: unknown): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-lessons-1',
    traceId: 'trace-kangur-lessons-1',
    correlationId: 'corr-kangur-lessons-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
    body,
  }) as ApiHandlerContext;

describe('kangur lessons handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearKangurLessonsCache();
    getKangurLessonRepositoryMock.mockResolvedValue({
      listLessons: listLessonsMock,
      replaceLessons: replaceLessonsMock,
    });
    resolveKangurActorMock.mockResolvedValue({ role: 'admin' });
  });

  it('reuses cached lessons across repeated list requests', async () => {
    const divisionLesson = createDefaultKangurLessons().find((lesson) => lesson.componentId === 'division');
    expect(divisionLesson).toBeDefined();
    listLessonsMock.mockResolvedValue([divisionLesson!]);

    const first = await getKangurLessonsHandler(
      new NextRequest('http://localhost/api/kangur/lessons?subject=maths&enabledOnly=true'),
      createRequestContext({ subject: 'maths', enabledOnly: true })
    );
    const second = await getKangurLessonsHandler(
      new NextRequest('http://localhost/api/kangur/lessons?subject=maths&enabledOnly=true'),
      createRequestContext({ subject: 'maths', enabledOnly: true })
    );

    expect(listLessonsMock).toHaveBeenCalledTimes(1);
    expect(first.headers.get('cache-control')).toBe('no-store');
    expect(second.headers.get('cache-control')).toBe('no-store');
    await expect(first.json()).resolves.toEqual([expect.objectContaining({ componentId: 'division' })]);
    await expect(second.json()).resolves.toEqual([expect.objectContaining({ componentId: 'division' })]);
  });

  it('invalidates cached lessons after a replace', async () => {
    const cachedLesson = createDefaultKangurLessons().find((lesson) => lesson.componentId === 'division');
    const replacedLesson = createDefaultKangurLessons().find(
      (lesson) => lesson.componentId === 'multiplication'
    );
    expect(cachedLesson).toBeDefined();
    expect(replacedLesson).toBeDefined();
    listLessonsMock
      .mockResolvedValueOnce([cachedLesson!])
      .mockResolvedValueOnce([replacedLesson!]);
    replaceLessonsMock.mockResolvedValue([replacedLesson!]);

    await getKangurLessonsHandler(
      new NextRequest('http://localhost/api/kangur/lessons?subject=maths'),
      createRequestContext({ subject: 'maths' })
    );

    await postKangurLessonsHandler(
      new NextRequest('http://localhost/api/kangur/lessons', { method: 'POST' }),
      createRequestContext(undefined, { lessons: [replacedLesson!] })
    );

    const refreshed = await getKangurLessonsHandler(
      new NextRequest('http://localhost/api/kangur/lessons?subject=maths'),
      createRequestContext({ subject: 'maths' })
    );

    expect(listLessonsMock).toHaveBeenCalledTimes(2);
    expect(refreshed.headers.get('cache-control')).toBe('no-store');
    await expect(refreshed.json()).resolves.toEqual([
      expect.objectContaining({ componentId: 'multiplication' }),
    ]);
  });
});
