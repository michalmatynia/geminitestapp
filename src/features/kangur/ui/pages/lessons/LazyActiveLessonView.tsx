import dynamic from 'next/dynamic';

export const LazyActiveLessonView = dynamic(
  () =>
    import('@/features/kangur/ui/pages/lessons/Lessons.ActiveLesson').then(
      (mod) => mod.ActiveLessonView
    ),
  {
    loading: () => null,
  }
);
