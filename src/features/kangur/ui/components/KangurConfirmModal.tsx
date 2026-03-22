import * as AlertDialog from '@radix-ui/react-alert-dialog';

import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { KANGUR_TIGHT_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { RadixOverlayContentShell } from '@/shared/ui/radix-overlay-content-shell';

import {
  KANGUR_DIALOG_CONTENT_BASE_CLASSNAME,
  KANGUR_DIALOG_OVERLAY_BASE_CLASSNAME,
} from './KangurDialogShell';

type KangurConfirmModalProps = {
  cancelText?: string;
  confirmText?: string;
  isOpen: boolean;
  message: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  showCancel?: boolean;
  title: string;
};

export function KangurConfirmModal({
  cancelText = 'Anuluj',
  confirmText = 'Potwierdź',
  isOpen,
  message,
  onClose,
  onConfirm,
  showCancel = true,
  title,
}: KangurConfirmModalProps): React.JSX.Element {
  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      onClose();
    }
  };
  const handleCancel = (): void => {
    onClose();
  };
  const handleConfirm = (): void => {
    onConfirm();
  };

  return (
    <AlertDialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <RadixOverlayContentShell
        Portal={AlertDialog.Portal}
        Overlay={AlertDialog.Overlay}
        Content={AlertDialog.Content}
        overlayBaseClassName={KANGUR_DIALOG_OVERLAY_BASE_CLASSNAME}
        contentBaseClassName={KANGUR_DIALOG_CONTENT_BASE_CLASSNAME}
        overlayProps={{
          className: 'bg-black/80 !backdrop-blur-0',
        }}
        contentProps={{
          className:
            'grid w-[calc(100%-2rem)] max-w-lg kangur-panel-gap rounded-lg border border-border bg-card p-6 shadow-lg duration-200 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-w-[425px]',
        }}
      >
        <div className='flex flex-col space-y-2 text-center sm:text-left'>
          <AlertDialog.Title className='text-lg font-semibold'>{title}</AlertDialog.Title>
          <AlertDialog.Description className='text-sm text-muted-foreground sr-only'>
            {message}
          </AlertDialog.Description>
        </div>
        <div className='space-y-4 py-4'>
          <div className='whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground'>
            {message}
          </div>
        </div>
        <div className={`w-full ${KANGUR_TIGHT_ROW_CLASSNAME} sm:justify-end`}>
          {showCancel ? (
            <AlertDialog.Cancel asChild>
              <KangurButton
                className='w-full sm:w-auto'
                onClick={handleCancel}
                type='button'
                variant='secondary'
              >
                {cancelText}
              </KangurButton>
            </AlertDialog.Cancel>
          ) : null}
          <AlertDialog.Action asChild>
            <KangurButton
              className='w-full sm:w-auto'
              onClick={handleConfirm}
              type='button'
              variant='primary'
            >
              {confirmText}
            </KangurButton>
          </AlertDialog.Action>
        </div>
      </RadixOverlayContentShell>
    </AlertDialog.Root>
  );
}
