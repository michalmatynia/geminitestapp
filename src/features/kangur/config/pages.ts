import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';

const Game = dynamic(() => import('@/features/kangur/ui/pages/Game'), {
  ssr: false,
  loading: () => null,
});
const LearnerProfile = dynamic(() => import('@/features/kangur/ui/pages/LearnerProfile'), {
  ssr: false,
  loading: () => null,
});
const Lessons = dynamic(() => import('@/features/kangur/ui/pages/Lessons'), {
  ssr: false,
  loading: () => null,
});
const ParentDashboard = dynamic(() => import('@/features/kangur/ui/pages/ParentDashboard'), {
  ssr: false,
  loading: () => null,
});

export const kangurPages: Readonly<Record<string, ComponentType>> = Object.freeze({
  Game,
  LearnerProfile,
  Lessons,
  ParentDashboard,
});

export const KANGUR_MAIN_PAGE = 'Game';
