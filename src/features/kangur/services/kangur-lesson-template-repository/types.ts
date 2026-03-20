import type {
  KangurLessonSubject,
} from '@kangur/contracts';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';

export type KangurLessonTemplateListInput = {
  subject?: KangurLessonSubject;
};

export type KangurLessonTemplateRepository = {
  listTemplates: (input?: KangurLessonTemplateListInput) => Promise<KangurLessonTemplate[]>;
  replaceTemplates: (templates: KangurLessonTemplate[]) => Promise<KangurLessonTemplate[]>;
  saveTemplate: (template: KangurLessonTemplate) => Promise<void>;
  removeTemplate: (componentId: string) => Promise<void>;
};
