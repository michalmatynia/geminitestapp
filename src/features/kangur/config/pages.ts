import type { ComponentType } from 'react';

import Game from '@/features/kangur/ui/pages/Game';
import LearnerProfile from '@/features/kangur/ui/pages/LearnerProfile';
import Lessons from '@/features/kangur/ui/pages/Lessons';
import ParentDashboard from '@/features/kangur/ui/pages/ParentDashboard';
import Tests from '@/features/kangur/ui/pages/Tests';

export const kangurPages: Readonly<Record<string, ComponentType>> = Object.freeze({
  Game,
  LearnerProfile,
  Lessons,
  Tests,
  ParentDashboard,
});

export const KANGUR_MAIN_PAGE = 'Game';
