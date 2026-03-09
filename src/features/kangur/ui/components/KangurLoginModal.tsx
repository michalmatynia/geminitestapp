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
          <DialogPrimitive.Title className='sr-only'>Zaloguj się</DialogPrimitive.Title>
          <DialogPrimitive.Description className='sr-only'>
            Zaloguj rodzica emailem albo ucznia nickiem bez opuszczania strony.
          </DialogPrimitive.Description>

          <button
            aria-label='Zamknij logowanie'
            className={cn(
              'absolute right-4 top-4 z-10 cursor-pointer rounded-full border border-amber-200/80',
              'bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,247,237,0.88)_100%)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em]',
              'text-[#9a5418] shadow-[0_16px_34px_-26px_rgba(249,115,22,0.5)] transition hover:text-[#7f4310]'
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
