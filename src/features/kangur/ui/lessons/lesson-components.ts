export { default as LessonActivityShell } from '@/features/kangur/ui/components/LessonActivityShell';
export { default as LessonHub } from '@/features/kangur/ui/components/LessonHub';
export { default as LessonSlideSection } from '@/features/kangur/ui/components/LessonSlideSection';
export {
  default as KangurUnifiedLesson,
  useKangurUnifiedLessonBack,
} from '@/features/kangur/ui/components/KangurUnifiedLesson';
export type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
export {
  buildLessonHubSectionsWithProgress,
  buildLessonSectionLabels,
  createLessonHubSelectHandler,
  resolveLessonSectionHeader,
} from '@/features/kangur/ui/components/lesson-utils';
