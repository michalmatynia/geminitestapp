import * as DialogPrimitive from '@radix-ui/react-dialog';

import { KangurLoginPage } from '@/features/kangur/ui/KangurLoginPage';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { cn } from '@/shared/utils';

import { useCallback } from 'react';
import type { JSX } from 'react';

export function KangurLoginModal(): JSX.Element {
  const { authMode, callbackUrl, closeLoginModal, dismissLoginModal, isOpen, isRouteDriven } =
    useKangurLoginModal();
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && !isRouteDriven) {
        closeLoginModal();
      }
    },
    [closeLoginModal, isRouteDriven]
  );

  return (
    <DialogPrimitive.Root
      open={isOpen}
      modal={!isRouteDriven}
      onOpenChange={handleOpenChange}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 backdrop-blur-[2px]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
          style={{
            background:
              'color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 14%, rgba(2,6,23,0.72))',
          }}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),42rem)]',
            'max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
            'outline-none'
          )}
          data-testid='kangur-login-modal'
          onEscapeKeyDown={(event) => {
            if (!isRouteDriven) {
              return;
            }
            event.preventDefault();
            closeLoginModal();
          }}
          onInteractOutside={(event) => {
            if (isRouteDriven) {
              event.preventDefault();
            }
          }}
        >
          <DialogPrimitive.Title className='sr-only'>Zaloguj się</DialogPrimitive.Title>
          <DialogPrimitive.Description className='sr-only'>
            Zaloguj rodzica emailem albo ucznia nickiem bez opuszczania strony.
          </DialogPrimitive.Description>

          <button
            aria-label='Zamknij logowanie'
            className={cn(
              'absolute right-3 top-3 z-10 cursor-pointer rounded-full border border-amber-200/80 sm:right-4 sm:top-4',
              'px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] sm:px-3 sm:py-1.5 sm:text-xs sm:tracking-[0.18em]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
              'shadow-[0_16px_34px_-26px_rgba(249,115,22,0.5)] transition'
            )}
            data-testid='kangur-login-modal-close'
            onClick={closeLoginModal}
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, rgba(254,243,199,0.95)) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 82%, rgba(255,237,213,0.9)) 100%)',
              color: '#9a5418',
            }}
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
