import 'server-only';

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { mongoKangurLessonSectionRepository } from './mongo-kangur-lesson-section-repository';
import type { KangurLessonSectionRepository, KangurLessonSectionListInput } from './types';

export type { KangurLessonSectionRepository, KangurLessonSectionListInput } from './types';

const SERVICE = 'kangur.lesson-section-repository';

export const getKangurLessonSectionRepository =
  async (): Promise<KangurLessonSectionRepository> => {
    const provider = 'mongodb';
    const repository = mongoKangurLessonSectionRepository;

    return {
      listSections: async (input?: KangurLessonSectionListInput) => {
        try {
          return await repository.listSections(input);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'listSections',
            provider,
            subject: input?.subject ?? null,
            ageGroup: input?.ageGroup ?? null,
            enabledOnly: input?.enabledOnly ?? null,
          });
          throw error;
        }
      },
      replaceSections: async (sections) => {
        try {
          return await repository.replaceSections(sections);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'replaceSections',
            provider,
            count: sections.length,
          });
          throw error;
        }
      },
      saveSection: async (section) => {
        try {
          await repository.saveSection(section); return;
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'saveSection',
            provider,
            sectionId: section.id,
          });
          throw error;
        }
      },
      removeSection: async (sectionId) => {
        try {
          await repository.removeSection(sectionId); return;
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'removeSection',
            provider,
            sectionId,
          });
          throw error;
        }
      },
    };
  };
