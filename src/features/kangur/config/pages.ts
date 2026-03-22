'use client';

import dynamic from 'next/dynamic';

import { createElement, type ComponentType, type ReactElement } from 'react';

import { KangurRouteLoadingFallback } from '@/features/kangur/ui/components/KangurRouteLoadingFallback';

const KangurLazyPageLoadingFallback =
  KangurRouteLoadingFallback as ComponentType<{ includeTopNavigationSkeleton?: boolean }>;

const PageLoadingFallback = (): ReactElement =>
  createElement(KangurLazyPageLoadingFallback, { includeTopNavigationSkeleton: false });

const lazyPage = (loader: () => Promise<{ default: ComponentType }>) =>
  dynamic(loader, { loading: PageLoadingFallback });

export const kangurPages: Readonly<Record<string, ComponentType>> = Object.freeze({
  Competition: lazyPage(() => import('@/features/kangur/ui/pages/Competition')),
  Game: lazyPage(() => import('@/features/kangur/ui/pages/Game')),
  Duels: lazyPage(() => import('@/features/kangur/ui/pages/Duels')),
  LearnerProfile: lazyPage(() => import('@/features/kangur/ui/pages/LearnerProfile')),
  Lessons: lazyPage(() => import('@/features/kangur/ui/pages/Lessons')),
  ParentDashboard: lazyPage(() => import('@/features/kangur/ui/pages/ParentDashboard')),
  SocialUpdates: lazyPage(() => import('@/features/kangur/ui/pages/SocialUpdates')),
  Tests: lazyPage(() => import('@/features/kangur/ui/pages/Tests')),
});

export const KANGUR_MAIN_PAGE = 'Game';
