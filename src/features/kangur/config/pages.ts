
import Game from '@/features/kangur/ui/pages/Game';
import Duels from '@/features/kangur/ui/pages/Duels';
import LearnerProfile from '@/features/kangur/ui/pages/LearnerProfile';
import Lessons from '@/features/kangur/ui/pages/Lessons';
import ParentDashboard from '@/features/kangur/ui/pages/ParentDashboard';

import type { ComponentType } from 'react';

export const kangurPages: Readonly<Record<string, ComponentType>> = Object.freeze({
  Game,
  Duels,
  LearnerProfile,
  Lessons,
  ParentDashboard,
});

export const KANGUR_MAIN_PAGE = 'Game';
