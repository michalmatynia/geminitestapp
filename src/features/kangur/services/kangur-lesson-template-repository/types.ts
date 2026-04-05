import type { KangurLessonAgeGroup, KangurLessonComponentId, KangurLessonSubject } from '@kangur/contracts/kangur-lesson-constants';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';

export type KangurLessonTemplateListInput = {
  locale?: string;
  componentId?: KangurLessonComponentId;
  subject?: KangurLessonSubject;
  ageGroup?: KangurLessonAgeGroup;
};

export type KangurLessonTemplateRepository = {
  listTemplates: (input?: KangurLessonTemplateListInput) => Promise<KangurLessonTemplate[]>;
  replaceTemplates: (
    templates: KangurLessonTemplate[],
    locale?: string
  ) => Promise<KangurLessonTemplate[]>;
  saveTemplate: (template: KangurLessonTemplate, locale?: string) => Promise<void>;
  removeTemplate: (componentId: string, locale?: string) => Promise<void>;
};
