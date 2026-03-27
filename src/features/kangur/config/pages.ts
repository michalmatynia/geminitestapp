'use client';

import dynamic from 'next/dynamic';

import { createElement, type ComponentType, type ReactElement } from 'react';

import { KangurRouteLoadingFallback } from '@/features/kangur/ui/components/KangurRouteLoadingFallback';
import Game from '@/features/kangur/ui/pages/Game';
import Lessons from '@/features/kangur/ui/pages/Lessons';

const KangurLazyPageLoadingFallback =
  KangurRouteLoadingFallback as ComponentType<{ includeTopNavigationSkeleton?: boolean }>;

const MainPageLoadingFallback = (): ReactElement =>
  createElement(KangurLazyPageLoadingFallback, { includeTopNavigationSkeleton: false });

const SecondaryPageLoadingFallback = (): ReactElement =>
  createElement(KangurLazyPageLoadingFallback, { includeTopNavigationSkeleton: true });

const lazyPage = (
  loader: () => Promise<{ default: ComponentType }>,
  {
    includeTopNavigationSkeleton = true,
  }: {
    includeTopNavigationSkeleton?: boolean;
  } = {}
) =>
  dynamic(loader, {
    loading: includeTopNavigationSkeleton
      ? SecondaryPageLoadingFallback
      : MainPageLoadingFallback,
  });

export const kangurPages: Readonly<Record<string, ComponentType>> = Object.freeze({
  Competition: lazyPage(() => import('@/features/kangur/ui/pages/Competition')),
  Game,
  GamesLibrary: lazyPage(() => import('@/features/kangur/ui/pages/GamesLibrary')),
  Duels: lazyPage(() => import('@/features/kangur/ui/pages/Duels')),
  LearnerProfile: lazyPage(() => import('@/features/kangur/ui/pages/LearnerProfile')),
  Lessons,
  ParentDashboard: lazyPage(() => import('@/features/kangur/ui/pages/ParentDashboard')),
  SocialUpdates: lazyPage(() => import('@/features/kangur/ui/pages/SocialUpdates')),
  Tests: lazyPage(() => import('@/features/kangur/ui/pages/Tests')),
});

export const KANGUR_MAIN_PAGE = 'Game';
