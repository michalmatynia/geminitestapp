import { type KangurLesson } from '@/features/kangur/shared/contracts/kangur';

export interface AdminLessonsManagerState {
  contentLocale: string;
  setContentLocale: (locale: string) => void;
  contentLocaleOptions: { value: string; label: string }[];
  contentLocaleLabel: string;
  isPrimaryContentLocale: boolean;
  lessons: KangurLesson[];
  lessonDocuments: Record<string, any>; // Refining these types is the next priority
  lessonById: Map<string, KangurLesson>;
  isLoading: boolean;
  isSaving: boolean;
  updateLessons: (lessons: KangurLesson[]) => Promise<void>;
  updateLessonDocuments: (docs: Record<string, any>) => Promise<void>;
  updateTemplates: (templates: any[]) => Promise<void>;
  lessonsQuery: { isLoading: boolean; error: any; refetch: () => Promise<any> };
  lessonDocumentsQuery: { isLoading: boolean; error: any; refetch: () => Promise<any> };
  templatesQuery: { isLoading: boolean; error: any; refetch: () => Promise<any> };
}
