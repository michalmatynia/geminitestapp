import type { ComponentType } from 'react';

import Game from '@/features/kangur/ui/pages/Game';
import Lessons from '@/features/kangur/ui/pages/Lessons';
import ParentDashboard from '@/features/kangur/ui/pages/ParentDashboard';

export const kangurPages: Readonly<Record<string, ComponentType>> = Object.freeze({
  Game,
  Lessons,
  ParentDashboard,
});

export const KANGUR_MAIN_PAGE = 'Game';
