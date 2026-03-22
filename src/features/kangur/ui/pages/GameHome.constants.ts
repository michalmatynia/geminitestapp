import { cn } from '@/features/kangur/shared/utils';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';

export const GAME_PAGE_STANDARD_CONTAINER_CLASSNAME = cn(
  'flex flex-col items-center',
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
