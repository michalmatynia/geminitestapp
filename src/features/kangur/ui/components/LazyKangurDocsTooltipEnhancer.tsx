'use client';

import dynamic from 'next/dynamic';

export const LazyKangurDocsTooltipEnhancer = dynamic(
  () =>
    import('@/features/kangur/docs/tooltips').then(
      (mod) => mod.KangurDocsTooltipEnhancer
    ),
  {
    loading: () => null,
  }
);
