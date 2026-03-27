'use client';

import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

import { KangurButton } from '@/features/kangur/ui/design/primitives';
import {
  LESSONS_SELECTOR_NAV_ICON_BUTTON_CLASSNAME,
  LESSONS_SELECTOR_NAV_TOUCH_ICON_BUTTON_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';
import { cn } from '@/features/kangur/shared/utils';

type KangurButtonProps = ComponentProps<typeof KangurButton>;

export type KangurLessonNavigationIconButtonProps = Omit<
  KangurButtonProps,
  'children' | 'size' | 'type' | 'variant'
> & {
  [key: `data-${string}`]: string | number | boolean | undefined;
  icon: LucideIcon;
  iconClassName?: string;
  isCoarsePointer?: boolean;
};

const RESPONSIVE_TOUCH_CLASSNAME =
  '[@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:px-5';

export function renderKangurLessonNavigationIconButton({
  className,
  icon: Icon,
  iconClassName,
  isCoarsePointer = false,
  ...props
}: KangurLessonNavigationIconButtonProps): React.JSX.Element {
  return (
    <KangurButton
      {...props}
      className={cn(
        LESSONS_SELECTOR_NAV_ICON_BUTTON_CLASSNAME,
        'disabled:opacity-20',
        isCoarsePointer && LESSONS_SELECTOR_NAV_TOUCH_ICON_BUTTON_CLASSNAME,
        isCoarsePointer && RESPONSIVE_TOUCH_CLASSNAME,
        className
      )}
      size='sm'
      type='button'
      variant='surface'
    >
      <Icon className={cn('h-4 w-4 flex-shrink-0', iconClassName)} aria-hidden='true' />
    </KangurButton>
  );
}
