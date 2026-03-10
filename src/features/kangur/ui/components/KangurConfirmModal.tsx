import * as AlertDialog from '@radix-ui/react-alert-dialog';

import { KangurButton } from '@/features/kangur/ui/design/primitives';

type KangurConfirmModalProps = {
  cancelText?: string;
  confirmText?: string;
  isOpen: boolean;
  message: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
};

export function KangurConfirmModal({
  cancelText = 'Anuluj',
  confirmText = 'Potwierdz',
  isOpen,
  message,
  onClose,
  onConfirm,
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
      <AlertDialog.Portal>
        <AlertDialog.Overlay className='fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0' />
        <AlertDialog.Content className='fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-w-[425px]'>
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
          <div className='flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2'>
            <div className='flex w-full gap-2'>
              <div className='flex-1' />
              <AlertDialog.Cancel asChild>
                <KangurButton onClick={handleCancel} type='button' variant='secondary'>
                  {cancelText}
                </KangurButton>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <KangurButton onClick={handleConfirm} type='button' variant='primary'>
                  {confirmText}
                </KangurButton>
              </AlertDialog.Action>
            </div>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
