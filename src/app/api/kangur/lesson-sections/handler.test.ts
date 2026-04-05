import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurSections } from '@/features/kangur/lessons/lesson-section-defaults';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getKangurLessonSectionRepositoryMock,
  listSectionsMock,
  replaceSectionsMock,
  resolveKangurActorMock,
} = vi.hoisted(() => ({
  getKangurLessonSectionRepositoryMock: vi.fn(),
  listSectionsMock: vi.fn(),
  replaceSectionsMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-lesson-section-repository', () => ({
  getKangurLessonSectionRepository: getKangurLessonSectionRepositoryMock,
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: resolveKangurActorMock,
}));

import {
  clearKangurLessonSectionsCache,
  getKangurLessonSectionsHandler,
  postKangurLessonSectionsHandler,
} from './handler';

const createRequestContext = (query?: Record<string, unknown>, body?: unknown): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-lesson-sections-1',
    traceId: 'trace-kangur-lesson-sections-1',
    correlationId: 'corr-kangur-lesson-sections-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
    body,
  }) as ApiHandlerContext;

describe('kangur lesson sections handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearKangurLessonSectionsCache();
    getKangurLessonSectionRepositoryMock.mockResolvedValue({
      listSections: listSectionsMock,
      replaceSections: replaceSectionsMock,
    });
    resolveKangurActorMock.mockResolvedValue({ role: 'admin' });
  });

  it('reuses cached sections across repeated list requests', async () => {
    const divisionSection = createDefaultKangurSections().find((section) => section.id === 'maths_arithmetic');
    expect(divisionSection).toBeDefined();
    listSectionsMock.mockResolvedValue([divisionSection!]);

    const first = await getKangurLessonSectionsHandler(
      new NextRequest('http://localhost/api/kangur/lesson-sections?subject=maths&enabledOnly=true'),
      createRequestContext({ subject: 'maths', enabledOnly: true })
    );
    const second = await getKangurLessonSectionsHandler(
      new NextRequest('http://localhost/api/kangur/lesson-sections?subject=maths&enabledOnly=true'),
      createRequestContext({ subject: 'maths', enabledOnly: true })
    );

    expect(listSectionsMock).toHaveBeenCalledTimes(1);
    await expect(first.json()).resolves.toEqual([expect.objectContaining({ id: 'maths_arithmetic' })]);
    await expect(second.json()).resolves.toEqual([expect.objectContaining({ id: 'maths_arithmetic' })]);
  });

  it('invalidates cached sections after a replace', async () => {
    const cachedSection = createDefaultKangurSections().find((section) => section.id === 'maths_arithmetic');
    const replacedSection = createDefaultKangurSections().find((section) => section.id === 'maths_geometry');
    expect(cachedSection).toBeDefined();
    expect(replacedSection).toBeDefined();
    listSectionsMock
      .mockResolvedValueOnce([cachedSection!])
      .mockResolvedValueOnce([replacedSection!]);
    replaceSectionsMock.mockResolvedValue([replacedSection!]);

    await getKangurLessonSectionsHandler(
      new NextRequest('http://localhost/api/kangur/lesson-sections?subject=maths'),
      createRequestContext({ subject: 'maths' })
    );

    await postKangurLessonSectionsHandler(
      new NextRequest('http://localhost/api/kangur/lesson-sections', { method: 'POST' }),
      createRequestContext(undefined, { sections: [replacedSection!] })
    );

    const refreshed = await getKangurLessonSectionsHandler(
      new NextRequest('http://localhost/api/kangur/lesson-sections?subject=maths'),
      createRequestContext({ subject: 'maths' })
    );

    expect(listSectionsMock).toHaveBeenCalledTimes(2);
    await expect(refreshed.json()).resolves.toEqual([
      expect.objectContaining({ id: 'maths_geometry' }),
    ]);
  });
});
