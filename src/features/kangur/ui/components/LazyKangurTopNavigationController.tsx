'use client';

import dynamic from 'next/dynamic';

export const LazyKangurTopNavigationController = dynamic(
  () =>
    import('@/features/kangur/ui/components/KangurTopNavigationController').then(
      (mod) => mod.KangurTopNavigationController
    ),
  {
    loading: () => null,
  }
);
