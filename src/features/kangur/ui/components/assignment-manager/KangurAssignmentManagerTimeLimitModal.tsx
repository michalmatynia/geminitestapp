import type { ChangeEvent } from 'react';

import { useTranslations } from 'next-intl';

import {
  KangurButton,
  KangurCardDescription,
  KangurGlassPanel,
  KangurStatusChip,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KangurDialog } from '@/features/kangur/ui/components/KangurDialog';
import { KangurDialogCloseButton } from '@/features/kangur/ui/components/KangurDialogCloseButton';
import { KangurDialogMeta } from '@/features/kangur/ui/components/KangurDialogMeta';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';

type KangurAssignmentManagerTimeLimitModalTarget = {
  title: string;
  description?: string | null;
};

type KangurAssignmentManagerTimeLimitModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  timeLimitDraft: string;
  onTimeLimitDraftChange: (value: string) => void;
  timeLimitTarget: KangurAssignmentManagerTimeLimitModalTarget | null;
  timeLimitPreview: string | null;
  timeLimitParsedError: string | null;
  isSaveDisabled: boolean;
  saveLabel: string;
  minMinutes: number;
  maxMinutes: number;
};

export function renderKangurAssignmentManagerTimeLimitModal(
  props: KangurAssignmentManagerTimeLimitModalProps
): React.JSX.Element {
  const {
    isOpen,
    onClose,
    onSave,
    timeLimitDraft,
    onTimeLimitDraftChange,
    timeLimitTarget,
    timeLimitPreview,
    timeLimitParsedError,
    isSaveDisabled,
    saveLabel,
    minMinutes,
    maxMinutes,
  } = props;
  const translations = useTranslations('KangurAssignmentManager');
  const isCoarsePointer = useKangurCoarsePointer();
  const actionClassName = isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto';
  const closeModal = (): void => {
    onClose();
  };
  const handleDialogOpenChange = (open: boolean): void => {
    if (!open) {
      closeModal();
    }
  };
  const dialogContentProps = {
    'data-testid': 'assignment-time-limit-modal',
    onEscapeKeyDown: closeModal,
    onInteractOutside: closeModal,
    onPointerDownOutside: closeModal,
  } as const;
  const handleTimeLimitDraftChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onTimeLimitDraftChange(event.target.value);
  };

  return (
    <KangurDialog
      open={isOpen}
      onOpenChange={handleDialogOpenChange}
      overlayVariant='standard'
      contentSize='sm'
      contentProps={dialogContentProps}
    >
      <>
        <KangurDialogMeta
          title={translations('timeLimitModal.title')}
          description={translations('timeLimitModal.description')}
        />
        <KangurDialogCloseButton
          aria-label={translations('timeLimitModal.closeAriaLabel')}
        />
      </>

      <KangurGlassPanel
        className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
        padding='lg'
        surface='mistSoft'
        variant='soft'
      >
        <div>
          <KangurStatusChip accent='indigo' labelStyle='eyebrow'>
            {translations('timeLimitModal.eyebrow')}
          </KangurStatusChip>
          <KangurCardDescription className='mt-2 text-slate-600' relaxed size='sm'>
            {translations('timeLimitModal.description')}
          </KangurCardDescription>
        </div>

        {timeLimitTarget ? (
          <div className='rounded-[18px] border border-slate-200/70 bg-white/80 px-4 py-3'>
            <div className='break-words text-sm font-semibold text-slate-900'>
              {timeLimitTarget.title}
            </div>
            {timeLimitTarget.description ? (
              <div className='mt-1 break-words text-xs text-slate-600'>
                {timeLimitTarget.description}
              </div>
            ) : null}
            {timeLimitPreview ? (
              <div className='mt-2 text-xs text-slate-500'>
                {translations('timeLimitModal.current', { value: timeLimitPreview })}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className='space-y-2'>
          <KangurTextField
            accent='indigo'
            aria-label={translations('timeLimitModal.inputAriaLabel')}
            title={translations('timeLimitModal.inputTitle')}
            inputMode='numeric'
            min={minMinutes}
            max={maxMinutes}
            placeholder={translations('timeLimitModal.placeholder')}
            type='number'
            value={timeLimitDraft}
            onChange={handleTimeLimitDraftChange}
          />
          <div className='text-xs text-slate-500'>
            {translations('timeLimitModal.helper', { minMinutes, maxMinutes })}
          </div>
          {timeLimitParsedError ? (
            <div className='text-xs text-rose-600'>{timeLimitParsedError}</div>
          ) : null}
        </div>

        <div className={`${KANGUR_TIGHT_ROW_CLASSNAME} sm:items-center sm:justify-end`}>
          <KangurButton
            className={actionClassName}
            size='sm'
            type='button'
            variant='ghost'
            onClick={closeModal}
          >
            {translations('actions.cancel')}
          </KangurButton>
          <KangurButton
            className={actionClassName}
            size='sm'
            type='button'
            variant='surface'
            disabled={isSaveDisabled}
            onClick={onSave}
          >
            {saveLabel}
          </KangurButton>
        </div>
      </KangurGlassPanel>
    </KangurDialog>
  );
}
