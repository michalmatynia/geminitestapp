'use client';

import dynamic from 'next/dynamic';

export const LazyLessonsDeferredEnhancements = dynamic(
  () =>
    import('@/features/kangur/ui/pages/lessons/LessonsDeferredEnhancements').then(
      (mod) => mod.LessonsDeferredEnhancements
    ),
  {
    loading: () => null,
  }
);
