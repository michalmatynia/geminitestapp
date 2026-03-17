export { default as LessonActivityStage } from '@/features/kangur/ui/components/LessonActivityStage';
export { default as LessonHub } from '@/features/kangur/ui/components/LessonHub';
export { default as LessonSlideSection } from '@/features/kangur/ui/components/LessonSlideSection';
export { default as KangurUnifiedLesson } from '@/features/kangur/ui/components/KangurUnifiedLesson';
export type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
export {
  buildLessonHubSectionsWithProgress,
  buildLessonSectionLabels,
  createLessonHubSelectHandler,
  resolveLessonSectionHeader,
} from '@/features/kangur/ui/components/lesson-utils';
