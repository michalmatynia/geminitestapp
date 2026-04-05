import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurLessonTemplates } from '@/features/kangur/lessons/lesson-template-defaults';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getKangurLessonTemplateRepositoryMock,
  listTemplatesMock,
  replaceTemplatesMock,
  resolveKangurActorMock,
} = vi.hoisted(() => ({
  getKangurLessonTemplateRepositoryMock: vi.fn(),
  listTemplatesMock: vi.fn(),
  replaceTemplatesMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-lesson-template-repository', () => ({
  getKangurLessonTemplateRepository: getKangurLessonTemplateRepositoryMock,
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: resolveKangurActorMock,
}));

import {
  clearKangurLessonTemplatesCache,
  getKangurLessonTemplatesHandler,
  postKangurLessonTemplatesHandler,
} from './handler';

const createRequestContext = (query?: Record<string, unknown>, body?: unknown): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-lesson-templates-1',
    traceId: 'trace-kangur-lesson-templates-1',
    correlationId: 'corr-kangur-lesson-templates-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
    body,
  }) as ApiHandlerContext;

describe('kangur lesson templates handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearKangurLessonTemplatesCache();
    getKangurLessonTemplateRepositoryMock.mockResolvedValue({
      listTemplates: listTemplatesMock,
      replaceTemplates: replaceTemplatesMock,
    });
    resolveKangurActorMock.mockResolvedValue({ role: 'admin' });
  });

  it('reuses cached templates across repeated list requests', async () => {
    const divisionTemplate = createDefaultKangurLessonTemplates().find(
      (template) => template.componentId === 'division'
    );
    expect(divisionTemplate).toBeDefined();
    listTemplatesMock.mockResolvedValue([divisionTemplate!]);

    const first = await getKangurLessonTemplatesHandler(
      new NextRequest('http://localhost/api/kangur/lesson-templates?subject=maths'),
      createRequestContext({ subject: 'maths' })
    );
    const second = await getKangurLessonTemplatesHandler(
      new NextRequest('http://localhost/api/kangur/lesson-templates?subject=maths'),
      createRequestContext({ subject: 'maths' })
    );

    expect(listTemplatesMock).toHaveBeenCalledTimes(1);
    await expect(first.json()).resolves.toEqual([expect.objectContaining({ componentId: 'division' })]);
    await expect(second.json()).resolves.toEqual([expect.objectContaining({ componentId: 'division' })]);
  });

  it('invalidates cached templates after a replace', async () => {
    const cachedTemplate = createDefaultKangurLessonTemplates().find(
      (template) => template.componentId === 'division'
    );
    const replacedTemplate = createDefaultKangurLessonTemplates().find(
      (template) => template.componentId === 'multiplication'
    );
    expect(cachedTemplate).toBeDefined();
    expect(replacedTemplate).toBeDefined();
    listTemplatesMock
      .mockResolvedValueOnce([cachedTemplate!])
      .mockResolvedValueOnce([replacedTemplate!]);
    replaceTemplatesMock.mockResolvedValue([replacedTemplate!]);

    await getKangurLessonTemplatesHandler(
      new NextRequest('http://localhost/api/kangur/lesson-templates?subject=maths'),
      createRequestContext({ subject: 'maths' })
    );

    await postKangurLessonTemplatesHandler(
      new NextRequest('http://localhost/api/kangur/lesson-templates', { method: 'POST' }),
      createRequestContext(undefined, { templates: [replacedTemplate!] })
    );

    const refreshed = await getKangurLessonTemplatesHandler(
      new NextRequest('http://localhost/api/kangur/lesson-templates?subject=maths'),
      createRequestContext({ subject: 'maths' })
    );

    expect(listTemplatesMock).toHaveBeenCalledTimes(2);
    await expect(refreshed.json()).resolves.toEqual([
      expect.objectContaining({ componentId: 'multiplication' }),
    ]);
  });

  it('forwards componentId and ageGroup filters and keeps them in separate cache entries', async () => {
    const divisionTemplate = createDefaultKangurLessonTemplates().find(
      (template) => template.componentId === 'division'
    );
    expect(divisionTemplate).toBeDefined();
    listTemplatesMock.mockResolvedValue([divisionTemplate!]);

    await getKangurLessonTemplatesHandler(
      new NextRequest(
        'http://localhost/api/kangur/lesson-templates?componentId=division&ageGroup=ten_year_old&locale=en'
      ),
      createRequestContext({
        componentId: 'division',
        ageGroup: 'ten_year_old',
        locale: 'en',
      })
    );

    await getKangurLessonTemplatesHandler(
      new NextRequest(
        'http://localhost/api/kangur/lesson-templates?componentId=division&ageGroup=six_year_old&locale=en'
      ),
      createRequestContext({
        componentId: 'division',
        ageGroup: 'six_year_old',
        locale: 'en',
      })
    );

    expect(listTemplatesMock).toHaveBeenNthCalledWith(1, {
      locale: 'en',
      componentId: 'division',
      subject: undefined,
      ageGroup: 'ten_year_old',
    });
    expect(listTemplatesMock).toHaveBeenNthCalledWith(2, {
      locale: 'en',
      componentId: 'division',
      subject: undefined,
      ageGroup: 'six_year_old',
    });
  });
});
