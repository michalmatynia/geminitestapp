'use client';

import dynamic from 'next/dynamic';

import { createElement, type ComponentType, type ReactElement } from 'react';

import { onBootReady } from '@/features/kangur/ui/boot/boot-ready-signal';
import { KangurRouteLoadingFallback } from '@/features/kangur/ui/components/KangurRouteLoadingFallback';

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

const kangurPageLoaders = {
  Competition: () => import('@/features/kangur/ui/pages/Competition'),
  Game: () => import('@/features/kangur/ui/pages/Game'),
  GamesLibrary: () => import('@/features/kangur/ui/pages/GamesLibrary'),
  Duels: () => import('@/features/kangur/ui/pages/Duels'),
  LearnerProfile: () => import('@/features/kangur/ui/pages/LearnerProfile'),
  Lessons: () => import('@/features/kangur/ui/pages/Lessons'),
  ParentDashboard: () => import('@/features/kangur/ui/pages/ParentDashboard'),
  SocialUpdates: () => import('@/features/kangur/social/pages/SocialUpdates'),
  Tests: () => import('@/features/kangur/ui/pages/Tests'),
} satisfies Readonly<Record<string, () => Promise<{ default: ComponentType }>>>;

export const kangurPages: Readonly<Record<string, ComponentType>> = Object.freeze({
  Competition: lazyPage(kangurPageLoaders.Competition),
  Game: lazyPage(kangurPageLoaders.Game, { includeTopNavigationSkeleton: false }),
  GamesLibrary: lazyPage(kangurPageLoaders.GamesLibrary),
  Duels: lazyPage(kangurPageLoaders.Duels),
  LearnerProfile: lazyPage(kangurPageLoaders.LearnerProfile),
  Lessons: lazyPage(kangurPageLoaders.Lessons),
  ParentDashboard: lazyPage(kangurPageLoaders.ParentDashboard),
  SocialUpdates: lazyPage(kangurPageLoaders.SocialUpdates),
  Tests: lazyPage(kangurPageLoaders.Tests),
});

export const KANGUR_MAIN_PAGE = 'Game';

export const preloadKangurPage = (pageKey: keyof typeof kangurPageLoaders): void => {
  void kangurPageLoaders[pageKey]();
};

// Defer the main page (Game) preload until after boot-critical network
// requests (auth, settings) have completed. The dynamic() loading fallback
// (skeleton) covers the gap while the chunk downloads.
if (typeof window !== 'undefined') {
  onBootReady(() => void kangurPageLoaders[KANGUR_MAIN_PAGE]());
}
