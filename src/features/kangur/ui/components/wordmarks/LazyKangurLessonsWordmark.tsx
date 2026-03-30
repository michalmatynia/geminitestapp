import dynamic from 'next/dynamic';

export const LazyKangurLessonsWordmark = dynamic(
  () =>
    import('@/features/kangur/ui/components/wordmarks/KangurLessonsWordmark').then(
      (mod) => mod.KangurLessonsWordmark
    ),
  {
    loading: () => null,
  }
);
