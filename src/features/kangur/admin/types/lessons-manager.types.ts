import { type KangurLesson } from '@/features/kangur/shared/contracts/kangur';

export interface AdminLessonsManagerState {
  contentLocale: string;
  setContentLocale: (locale: string) => void;
  contentLocaleOptions: { value: string; label: string }[];
  contentLocaleLabel: string;
  isPrimaryContentLocale: boolean;
  lessons: KangurLesson[];
  lessonDocuments: Record<string, unknown>; // Refining these types is the next priority
  lessonById: Map<string, KangurLesson>;
  isLoading: boolean;
  isSaving: boolean;
  updateLessons: (lessons: KangurLesson[]) => Promise<void>;
  updateLessonDocuments: (docs: Record<string, unknown>) => Promise<void>;
  updateTemplates: (templates: unknown[]) => Promise<void>;
  lessonsQuery: { isLoading: boolean; error: unknown; refetch: () => Promise<unknown> };
  lessonDocumentsQuery: { isLoading: boolean; error: unknown; refetch: () => Promise<unknown> };
  templatesQuery: { isLoading: boolean; error: unknown; refetch: () => Promise<unknown> };
}

