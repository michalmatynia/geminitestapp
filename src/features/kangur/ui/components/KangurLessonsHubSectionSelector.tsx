'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/features/kangur/shared/utils';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { KANGUR_STEP_PILL_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME,
  LESSONS_SELECTOR_NAV_ICON_BUTTON_CLASSNAME,
  LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME,
  LESSONS_SELECTOR_NAV_TOUCH_ICON_BUTTON_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';

type KangurLessonsHubSectionSelectorItem = {
  id: string;
  accessibleLabel: string;
  label: ReactNode;
};

type KangurLessonsHubSectionSelectorProps = {
  items: KangurLessonsHubSectionSelectorItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  ariaLabel?: string;
  className?: string;
};

export function KangurLessonsHubSectionSelector({
  items,
  selectedId,
  onSelect,
  ariaLabel = 'Lesson hub section navigation',
  className,
}: KangurLessonsHubSectionSelectorProps): React.JSX.Element | null {
  const isCoarsePointer = useKangurCoarsePointer();
  const selectedIndex = Math.max(0, items.findIndex((item) => item.id === selectedId));
  const selectedItem = items[selectedIndex] ?? null;
  const previousItem = selectedIndex > 0 ? items[selectedIndex - 1] : null;
  const nextItem = selectedIndex < items.length - 1 ? items[selectedIndex + 1] : null;

  if (!selectedItem) {
    return null;
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME, 'w-full', className)}
      data-testid='kangur-lessons-hub-selector'
    >
      <div
        className={cn(LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME, 'sm:w-full')}
        role='group'
        aria-label={ariaLabel}
      >
        <KangurButton
          aria-label={previousItem?.accessibleLabel}
          className={cn(
            LESSONS_SELECTOR_NAV_ICON_BUTTON_CLASSNAME,
            isCoarsePointer && LESSONS_SELECTOR_NAV_TOUCH_ICON_BUTTON_CLASSNAME
          )}
          data-testid='kangur-lessons-hub-selector-prev'
          disabled={!previousItem}
          onClick={previousItem ? () => onSelect(previousItem.id) : undefined}
          size='sm'
          title={previousItem?.accessibleLabel}
          type='button'
          variant='surface'
        >
          <ChevronLeft className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
          <span className='sr-only'>{previousItem?.accessibleLabel ?? selectedItem.accessibleLabel}</span>
        </KangurButton>

        <div
          className={cn(
            KANGUR_STEP_PILL_CLASSNAME,
            'surface-cta min-w-0 flex-1 px-4 py-3 text-center text-base font-semibold tracking-tight shadow-sm sm:flex-none sm:min-w-[15rem]'
          )}
          data-testid='kangur-lessons-hub-selector-current'
        >
          <span className='block truncate'>{selectedItem.label}</span>
        </div>

        <KangurButton
          aria-label={nextItem?.accessibleLabel}
          className={cn(
            LESSONS_SELECTOR_NAV_ICON_BUTTON_CLASSNAME,
            isCoarsePointer && LESSONS_SELECTOR_NAV_TOUCH_ICON_BUTTON_CLASSNAME
          )}
          data-testid='kangur-lessons-hub-selector-next'
          disabled={!nextItem}
          onClick={nextItem ? () => onSelect(nextItem.id) : undefined}
          size='sm'
          title={nextItem?.accessibleLabel}
          type='button'
          variant='surface'
        >
          <span className='sr-only'>{nextItem?.accessibleLabel ?? selectedItem.accessibleLabel}</span>
          <ChevronRight className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
        </KangurButton>
      </div>
    </nav>
  );
}
