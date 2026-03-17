
import Game from '@/features/kangur/ui/pages/Game';
import Competition from '@/features/kangur/ui/pages/Competition';
import Duels from '@/features/kangur/ui/pages/Duels';
import LearnerProfile from '@/features/kangur/ui/pages/LearnerProfile';
import Lessons from '@/features/kangur/ui/pages/Lessons';
import ParentDashboard from '@/features/kangur/ui/pages/ParentDashboard';
import SocialUpdates from '@/features/kangur/ui/pages/SocialUpdates';
import Tests from '@/features/kangur/ui/pages/Tests';

import type { ComponentType } from 'react';

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
