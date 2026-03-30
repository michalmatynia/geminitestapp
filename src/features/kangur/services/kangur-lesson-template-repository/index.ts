import 'server-only';

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { mongoKangurLessonTemplateRepository } from './mongo-kangur-lesson-template-repository';
import type { KangurLessonTemplateRepository, KangurLessonTemplateListInput } from './types';

export type { KangurLessonTemplateRepository, KangurLessonTemplateListInput } from './types';

const SERVICE = 'kangur.lesson-template-repository';

export const getKangurLessonTemplateRepository =
  async (): Promise<KangurLessonTemplateRepository> => {
    const provider = 'mongodb';
    const repository = mongoKangurLessonTemplateRepository;

    return {
      listTemplates: async (input?: KangurLessonTemplateListInput) => {
        try {
          return await repository.listTemplates(input);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'listTemplates',
            provider,
            subject: input?.subject ?? null,
          });
          throw error;
        }
      },
      replaceTemplates: async (templates, locale) => {
        try {
          return await repository.replaceTemplates(templates, locale);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'replaceTemplates',
            provider,
            count: templates.length,
            locale: locale ?? null,
          });
          throw error;
        }
      },
      saveTemplate: async (template, locale) => {
        try {
          await repository.saveTemplate(template, locale);
          return;
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'saveTemplate',
            provider,
            componentId: template.componentId,
            locale: locale ?? null,
          });
          throw error;
        }
      },
      removeTemplate: async (componentId, locale) => {
        try {
          await repository.removeTemplate(componentId, locale);
          return;
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'removeTemplate',
            provider,
            componentId,
            locale: locale ?? null,
          });
          throw error;
        }
      },
    };
  };
