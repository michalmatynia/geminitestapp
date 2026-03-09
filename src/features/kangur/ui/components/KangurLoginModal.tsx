import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { JSX } from 'react';

import { KangurLoginPage } from '@/features/kangur/ui/KangurLoginPage';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { cn } from '@/shared/utils';

export function KangurLoginModal(): JSX.Element {
  const { authMode, callbackUrl, closeLoginModal, dismissLoginModal, isOpen } =
    useKangurLoginModal();

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeLoginModal();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[2px]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),42rem)]',
            'max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2',
            'outline-none'
          )}
          data-testid='kangur-login-modal'
        >
          <DialogPrimitive.Title className='sr-only'>Logowanie Kangur</DialogPrimitive.Title>
          <DialogPrimitive.Description className='sr-only'>
            Zaloguj rodzica emailem albo ucznia alfanumerycznym nickiem bez opuszczania strony.
          </DialogPrimitive.Description>

          <button
            aria-label='Zamknij logowanie'
            className={cn(
              'absolute right-4 top-4 z-10 rounded-full border border-slate-200/80',
              'bg-white/95 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em]',
              'text-slate-500 shadow-sm transition hover:text-slate-900'
            )}
            data-testid='kangur-login-modal-close'
            onClick={closeLoginModal}
            type='button'
          >
            Zamknij
          </button>

          <KangurLoginPage
            defaultCallbackUrl={callbackUrl}
            onClose={dismissLoginModal}
            parentAuthMode={authMode}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
