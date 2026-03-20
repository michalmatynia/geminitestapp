import type {
  KangurLessonAgeGroup,
  KangurLessonSubject,
} from '@kangur/contracts';
import type { KangurLessonSection } from '@/shared/contracts/kangur-lesson-sections';

export type KangurLessonSectionListInput = {
  subject?: KangurLessonSubject;
  ageGroup?: KangurLessonAgeGroup;
  enabledOnly?: boolean;
};

export type KangurLessonSectionRepository = {
  listSections: (input?: KangurLessonSectionListInput) => Promise<KangurLessonSection[]>;
  replaceSections: (sections: KangurLessonSection[]) => Promise<KangurLessonSection[]>;
  saveSection: (section: KangurLessonSection) => Promise<void>;
  removeSection: (sectionId: string) => Promise<void>;
};
