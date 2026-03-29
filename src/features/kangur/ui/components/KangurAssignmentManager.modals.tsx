'use client';

import {
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_STACK_COMPACT_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KangurDialog } from '@/features/kangur/ui/components/KangurDialog';

export function KangurAssignmentManagerTimeLimitModal({
  isOpen,
  onOpenChange,
  title,
  draftValue,
  onDraftChange,
  onSave,
  saveLabel,
  isDisabled,
  error,
  preview,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  draftValue: string;
  onDraftChange: (val: string) => void;
  onSave: () => void;
  saveLabel: string;
  isDisabled: boolean;
  error: string | null;
  preview: string | null;
}): React.JSX.Element {
  return (
    <KangurDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      overlayVariant='dark'
      contentSize='sm'
    >
      <KangurGlassPanel className={KANGUR_STACK_COMPACT_CLASSNAME} padding='lg' surface='playField'>
        <KangurHeadline accent='indigo' as='h2' size='sm'>
          {title}
        </KangurHeadline>
        <KangurTextField
          aria-label='Limit czasu w minutach'
          title='Limit czasu w minutach'
          value={draftValue}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder='Brak limitu'
          autoFocus
        />
        {error ? <p className='text-xs font-semibold text-rose-600'>{error}</p> : null}
        <div className='flex items-center justify-between gap-4'>
          <p className='text-xs text-slate-500'>
            Obecny limit: <span className='font-bold text-slate-700'>{preview ?? 'Brak limitu'}</span>
          </p>
          <div className='flex items-center gap-2'>
            <KangurButton onClick={() => onOpenChange(false)} size='sm' type='button' variant='ghost'>
              Zamknij
            </KangurButton>
            <KangurButton
              onClick={onSave}
              disabled={isDisabled}
              size='sm'
              type='button'
              variant='primary'
            >
              {saveLabel}
            </KangurButton>
          </div>
        </div>
      </KangurGlassPanel>
    </KangurDialog>
  );
}
