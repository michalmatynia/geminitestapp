import { cn } from '@/features/kangur/shared/utils';
import {
  KANGUR_LESSON_PANEL_GAP_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

export const LESSONS_CARD_EASE = [0.22, 1, 0.36, 1] as const;
export const LESSONS_CARD_TRANSITION = {
  duration: 0.26,
  ease: LESSONS_CARD_EASE,
} as const;
export const LESSONS_CARD_STAGGER_DELAY = 0.06;
export const ACTIVE_LESSON_HEADER_SCROLL_MAX_FRAMES = 18;
export const LESSON_NAV_ANCHOR_ID = 'kangur-lesson-navigation';

export const LESSONS_LIBRARY_LAYOUT_CLASSNAME = cn(
  'flex w-full max-w-lg flex-col items-center',
  KANGUR_PANEL_GAP_CLASSNAME
);

export const LESSONS_LIBRARY_LIST_CLASSNAME = cn(
  'flex w-full flex-col',
  KANGUR_LESSON_PANEL_GAP_CLASSNAME
);

export const LESSONS_ACTIVE_LAYOUT_CLASSNAME = cn(
  'w-full flex flex-col items-center',
  KANGUR_LESSON_PANEL_GAP_CLASSNAME
);

export const LESSONS_ACTIVE_SECTION_CLASSNAME = 'w-full max-w-5xl';

export const LESSONS_ACTIVE_STACK_GAP_CLASSNAME = KANGUR_LESSON_PANEL_GAP_CLASSNAME;

export const LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME = 'flex w-full flex-col items-center gap-2';

export const LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME =
  'flex w-full flex-wrap items-center justify-center gap-2 sm:w-fit sm:self-center';

export const LESSONS_SELECTOR_NAV_PILLS_ROW_CLASSNAME =
  'flex w-full flex-wrap items-center justify-center gap-2';

export const LESSONS_SELECTOR_NAV_ICON_BUTTON_CLASSNAME =
  'justify-center px-4 shadow-sm [border-color:var(--kangur-soft-card-border)]';
