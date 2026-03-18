
import dynamic from 'next/dynamic';

import Game from '@/features/kangur/ui/pages/Game';

import type { ComponentType } from 'react';

const Competition = dynamic(() => import('@/features/kangur/ui/pages/Competition'));
const Duels = dynamic(() => import('@/features/kangur/ui/pages/Duels'));
const LearnerProfile = dynamic(() => import('@/features/kangur/ui/pages/LearnerProfile'));
const Lessons = dynamic(() => import('@/features/kangur/ui/pages/Lessons'));
const ParentDashboard = dynamic(() => import('@/features/kangur/ui/pages/ParentDashboard'));
const SocialUpdates = dynamic(() => import('@/features/kangur/ui/pages/SocialUpdates'));
const Tests = dynamic(() => import('@/features/kangur/ui/pages/Tests'));

export const kangurPages: Readonly<Record<string, ComponentType>> = Object.freeze({
  Competition,
  Game,
  Duels,
  LearnerProfile,
  Lessons,
  ParentDashboard,
  SocialUpdates,
  Tests,
});

export const KANGUR_MAIN_PAGE = 'Game';
