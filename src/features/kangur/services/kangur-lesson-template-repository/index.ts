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
      replaceTemplates: async (templates) => {
        try {
          return await repository.replaceTemplates(templates);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'replaceTemplates',
            provider,
            count: templates.length,
          });
          throw error;
        }
      },
      saveTemplate: async (template) => {
        try {
          await repository.saveTemplate(template);
          return;
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'saveTemplate',
            provider,
            componentId: template.componentId,
          });
          throw error;
        }
      },
      removeTemplate: async (componentId) => {
        try {
          await repository.removeTemplate(componentId);
          return;
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'removeTemplate',
            provider,
            componentId,
          });
          throw error;
        }
      },
    };
  };
