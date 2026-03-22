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
import { KangurDialogHeader } from '@/features/kangur/ui/components/KangurDialogHeader';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';

export type KangurAssignmentManagerTimeLimitModalTarget = {
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

export function KangurAssignmentManagerTimeLimitModal({
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
}: KangurAssignmentManagerTimeLimitModalProps): React.JSX.Element {
  const translations = useTranslations('KangurAssignmentManager');
  const isCoarsePointer = useKangurCoarsePointer();
  const actionClassName = isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto';

  return (
    <KangurDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      overlayVariant='standard'
      contentSize='sm'
      contentProps={{
        'data-testid': 'assignment-time-limit-modal',
        onEscapeKeyDown: onClose,
        onInteractOutside: onClose,
        onPointerDownOutside: onClose,
      }}
    >
      <KangurDialogHeader
        title={translations('timeLimitModal.title')}
        description={translations('timeLimitModal.description')}
        closeAriaLabel={translations('timeLimitModal.closeAriaLabel')}
      />

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
            onChange={(event) => onTimeLimitDraftChange(event.target.value)}
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
            onClick={onClose}
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
