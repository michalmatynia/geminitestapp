'use client';

import dynamic from 'next/dynamic';

export const LazyKangurLessonsWordmark = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurLessonsWordmark').then(
      (mod) => mod.KangurLessonsWordmark
    ),
  {
    loading: () => null,
  }
);
