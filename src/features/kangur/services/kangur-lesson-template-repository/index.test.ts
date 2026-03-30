/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  captureExceptionMock,
  mongoRepositoryMock,
} = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  mongoRepositoryMock: {
    listTemplates: vi.fn(),
    replaceTemplates: vi.fn(),
    saveTemplate: vi.fn(),
    removeTemplate: vi.fn(),
  },
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

vi.mock('./mongo-kangur-lesson-template-repository', () => ({
  mongoKangurLessonTemplateRepository: mongoRepositoryMock,
}));

describe('getKangurLessonTemplateRepository', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('forwards locale arguments to the Mongo template repository', async () => {
    const { getKangurLessonTemplateRepository } = await import('./index');

    const repository = await getKangurLessonTemplateRepository();
    const template = {
      componentId: 'english_comparatives_superlatives',
      subject: 'english',
      ageGroup: 'ten_year_old',
      label: 'Comparatives and superlatives',
      title: 'Comparatives and superlatives',
      description: 'Grammar practice',
      emoji: '📚',
      color: 'sky',
      activeBg: 'bg-sky-500',
      sortOrder: 100,
    } as const;

    mongoRepositoryMock.replaceTemplates.mockResolvedValue([template]);
    mongoRepositoryMock.saveTemplate.mockResolvedValue(undefined);
    mongoRepositoryMock.removeTemplate.mockResolvedValue(undefined);

    await repository.replaceTemplates([template], 'en');
    await repository.saveTemplate(template, 'de');
    await repository.removeTemplate(template.componentId, 'uk');

    expect(mongoRepositoryMock.replaceTemplates).toHaveBeenCalledWith([template], 'en');
    expect(mongoRepositoryMock.saveTemplate).toHaveBeenCalledWith(template, 'de');
    expect(mongoRepositoryMock.removeTemplate).toHaveBeenCalledWith(
      template.componentId,
      'uk'
    );
  });
});
