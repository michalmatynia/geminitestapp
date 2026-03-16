'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';

import { KangurLoginPage } from '@/features/kangur/ui/KangurLoginPage';
import { KangurPanelCloseButton } from '@/features/kangur/ui/components/KangurPanelCloseButton';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { cn } from '@/features/kangur/shared/utils';

import { memo, useCallback } from 'react';
import type { JSX } from 'react';

export const KangurLoginModal = memo(function KangurLoginModal(): JSX.Element {
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
            'kangur-max-h-screen-2 -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
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

          <KangurPanelCloseButton
            aria-label='Zamknij logowanie'
            className='absolute right-3 top-3 z-10 sm:right-4 sm:top-4'
            data-testid='kangur-login-modal-close'
            iconClassName='h-4 w-4'
            onClick={closeLoginModal}
            variant='login'
          />

          <KangurLoginPage
            defaultCallbackUrl={callbackUrl}
            onClose={dismissLoginModal}
            parentAuthMode={authMode}
            showParentAuthModeTabs={false}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
});
