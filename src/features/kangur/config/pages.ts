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

const kangurPageLoaders = {
  Competition: () => import('@/features/kangur/ui/pages/Competition'),
  Game: async () => ({ default: Game }),
  GamesLibrary: () => import('@/features/kangur/ui/pages/GamesLibrary'),
  Duels: () => import('@/features/kangur/ui/pages/Duels'),
  LearnerProfile: () => import('@/features/kangur/ui/pages/LearnerProfile'),
  Lessons: async () => ({ default: Lessons }),
  ParentDashboard: () => import('@/features/kangur/ui/pages/ParentDashboard'),
  SocialUpdates: () => import('@/features/kangur/ui/pages/SocialUpdates'),
  Tests: () => import('@/features/kangur/ui/pages/Tests'),
} satisfies Readonly<Record<string, () => Promise<{ default: ComponentType }>>>;

export const kangurPages: Readonly<Record<string, ComponentType>> = Object.freeze({
  Competition: lazyPage(kangurPageLoaders.Competition),
  Game,
  GamesLibrary: lazyPage(kangurPageLoaders.GamesLibrary),
  Duels: lazyPage(kangurPageLoaders.Duels),
  LearnerProfile: lazyPage(kangurPageLoaders.LearnerProfile),
  Lessons,
  ParentDashboard: lazyPage(kangurPageLoaders.ParentDashboard),
  SocialUpdates: lazyPage(kangurPageLoaders.SocialUpdates),
  Tests: lazyPage(kangurPageLoaders.Tests),
});

export const KANGUR_MAIN_PAGE = 'Game';

export const preloadKangurPage = (pageKey: keyof typeof kangurPageLoaders): void => {
  void kangurPageLoaders[pageKey]();
};
