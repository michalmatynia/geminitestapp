'use client';

import { KangurDialog } from '@/features/kangur/ui/components/KangurDialog';
import { KangurPanelCloseButton } from '@/features/kangur/ui/components/KangurPanelCloseButton';
import {
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

import type { ReactNode } from 'react';

type KangurChoiceDialogOption = {
  id: string;
  label: ReactNode;
  isActive: boolean;
  onSelect: () => void;
};

type KangurChoiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  header: ReactNode;
  title: string; // Used for the internal heading
  defaultChoiceLabel: string;
  currentChoiceLabel: string;
  closeAriaLabel: string;
  groupAriaLabel: string;
  options: KangurChoiceDialogOption[];
  doneLabel?: string;
};

export function KangurChoiceDialog({
  open,
  onOpenChange,
  header,
  title,
  defaultChoiceLabel,
  currentChoiceLabel,
  closeAriaLabel,
  groupAriaLabel,
  options,
  doneLabel = 'Gotowe',
}: KangurChoiceDialogProps): React.JSX.Element {
  return (
    <KangurDialog
      open={open}
      onOpenChange={onOpenChange}
      overlayVariant='dark'
      contentVariant='choice'
    >
        {header}
        <KangurGlassPanel
          className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
          padding='lg'
          surface='playField'
        >
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <KangurHeadline accent='indigo' as='h2' size='sm'>
                {title}
              </KangurHeadline>
              <p className='mt-1 text-xs [color:var(--kangur-page-muted-text)]'>
                Domyślnie: {defaultChoiceLabel}.
              </p>
            </div>
            <KangurPanelCloseButton
              aria-label={closeAriaLabel}
              onClick={() => onOpenChange(false)}
              variant='chat'
            />
          </div>
          <div
            className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} w-full sm:items-center sm:justify-center`}
            role='group'
            aria-label={groupAriaLabel}
          >
            {options.map((option) => (
              <KangurButton
                key={option.id}
                className='h-10 flex-1 text-xs sm:text-sm touch-manipulation select-none min-h-11 active:scale-[0.98]'
                onClick={option.onSelect}
                size='sm'
                type='button'
                variant={option.isActive ? 'segmentActive' : 'segment'}
                aria-pressed={option.isActive}
              >
                {option.label}
              </KangurButton>
            ))}
          </div>
          <div className='flex w-full flex-col gap-2 text-xs [color:var(--kangur-page-muted-text)]'>
            <span>Aktualny wybór: {currentChoiceLabel}.</span>
            <KangurButton
              className='w-full touch-manipulation select-none min-h-11 active:scale-[0.98]'
              onClick={() => onOpenChange(false)}
              size='sm'
              type='button'
              variant='surface'
            >
              {doneLabel}
            </KangurButton>
          </div>
        </KangurGlassPanel>
    </KangurDialog>
  );
}
