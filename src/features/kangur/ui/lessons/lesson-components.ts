export { default as LessonActivityShell } from '@/features/kangur/ui/components/lesson-runtime/LessonActivityShell';
export { default as LessonHub } from '@/features/kangur/ui/components/lesson-framework/LessonHub';
export { default as LessonSlideSection } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
export {
  default as KangurUnifiedLesson,
  useKangurUnifiedLessonBack,
} from '@/features/kangur/ui/components/KangurUnifiedLesson';
export type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
export {
  buildLessonHubSectionsWithProgress,
  buildLessonSectionLabels,
  createLessonHubSelectHandler,
  resolveLessonSectionHeader,
} from '@/features/kangur/ui/components/lesson-framework/lesson-utils';
