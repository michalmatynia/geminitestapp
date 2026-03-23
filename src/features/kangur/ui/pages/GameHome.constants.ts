import { cn } from '@/features/kangur/shared/utils';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';

export const GAME_PAGE_STANDARD_CONTAINER_CLASSNAME = cn(
  'flex w-full min-w-0 max-w-full flex-col items-center overflow-x-clip',
  KANGUR_PANEL_GAP_CLASSNAME,
  'pb-[calc(var(--kangur-mobile-bottom-clearance,env(safe-area-inset-bottom))+32px)]',
  'pt-8 sm:pt-10'
);

export const GAME_HOME_LAYOUT_CLASSNAME = cn(
  'flex w-full flex-col items-center',
  KANGUR_PANEL_GAP_CLASSNAME
);

export const GAME_HOME_ACTIONS_COLUMN_CLASSNAME = 'w-full max-w-[560px] space-y-8 sm:space-y-10';

export const GAME_HOME_SECTION_CLASSNAME = 'w-full max-w-[900px]';

export const GAME_HOME_CENTERED_SECTION_CLASSNAME = 'mx-auto w-full max-w-[900px]';

export const GAME_HOME_PROGRESS_GRID_CLASSNAME = cn(
  'mx-auto grid w-full max-w-[900px] items-start',
  KANGUR_PANEL_GAP_CLASSNAME,
  'xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]'
);

export const GAME_HOME_ASSIGNMENT_SPOTLIGHT_SHELL_CLASSNAME = 'mx-auto w-full max-w-3xl';

export const GAME_HOME_ASSIGNMENT_SPOTLIGHT_INNER_SHELL_CLASSNAME = 'relative mt-4';

export const GAME_HOME_ACTIONS_SHELL_CLASSNAME =
  'w-full shadow-[0_18px_40px_-28px_rgba(168,175,216,0.18)]';

export const GAME_HOME_ACTIONS_LIST_CLASSNAME = cn('grid grid-cols-1', KANGUR_PANEL_GAP_CLASSNAME);

export const GAME_HOME_DUELS_SHELL_CLASSNAME = KANGUR_PANEL_GAP_CLASSNAME;

export const GAME_HOME_QUEST_SHELL_CLASSNAME = 'w-full';

export const GAME_HOME_HERO_SHELL_CLASSNAME = 'w-full space-y-4';

export const GAME_HOME_LEADERBOARD_COLUMN_CLASSNAME = 'order-2 flex w-full justify-center xl:order-1';

export const GAME_HOME_LEADERBOARD_SHELL_CLASSNAME =
  'w-full max-w-lg shadow-[0_18px_40px_-30px_rgba(168,175,216,0.2)]';

export const GAME_HOME_PLAYER_PROGRESS_COLUMN_CLASSNAME =
  'order-1 flex w-full justify-center xl:order-2';

export const GAME_HOME_PLAYER_PROGRESS_SHELL_CLASSNAME = cn(
  'flex w-full max-w-sm flex-col',
  KANGUR_PANEL_GAP_CLASSNAME,
  'shadow-[0_18px_40px_-30px_rgba(168,175,216,0.2)]'
);
