import type { KangurLessonSection } from '@/shared/contracts/kangur-lesson-sections';
import type { KangurLessonListInput } from '../kangur-lesson-repository/types';

export type KangurLessonSectionListInput = KangurLessonListInput;

export type KangurLessonSectionRepository = {
  listSections: (input?: KangurLessonSectionListInput) => Promise<KangurLessonSection[]>;
  replaceSections: (sections: KangurLessonSection[]) => Promise<KangurLessonSection[]>;
  saveSection: (section: KangurLessonSection) => Promise<void>;
  removeSection: (sectionId: string) => Promise<void>;
};
