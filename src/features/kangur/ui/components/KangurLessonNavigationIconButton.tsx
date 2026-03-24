'use client';

import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  LESSONS_SELECTOR_NAV_ICON_BUTTON_CLASSNAME,
  LESSONS_SELECTOR_NAV_TOUCH_ICON_BUTTON_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';
import { cn } from '@/features/kangur/shared/utils';

type KangurButtonProps = ComponentProps<typeof KangurButton>;

type KangurLessonNavigationIconButtonProps = Omit<
  KangurButtonProps,
  'children' | 'size' | 'type' | 'variant'
> & {
  icon: LucideIcon;
  iconClassName?: string;
};

export function KangurLessonNavigationIconButton({
  className,
  icon: Icon,
  iconClassName,
  ...props
}: KangurLessonNavigationIconButtonProps): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();

  return (
    <KangurButton
      {...props}
      className={cn(
        LESSONS_SELECTOR_NAV_ICON_BUTTON_CLASSNAME,
        'disabled:opacity-20',
        isCoarsePointer && LESSONS_SELECTOR_NAV_TOUCH_ICON_BUTTON_CLASSNAME,
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
