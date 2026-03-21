'use client';

import { useTranslations } from 'next-intl';

import KangurLoginPage from '@/features/kangur/ui/KangurLoginPage';
import { KangurDialog } from '@/features/kangur/ui/components/KangurDialog';
import { KangurDialogHeader } from '@/features/kangur/ui/components/KangurDialogHeader';
import { KangurPanelCloseButton } from '@/features/kangur/ui/components/KangurPanelCloseButton';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';

import { memo, useCallback } from 'react';
import type { JSX } from 'react';

export const KangurLoginModal = memo(function KangurLoginModal(): JSX.Element {
  const translations = useTranslations('KangurLoginModal');
  const { closeLoginModal, dismissLoginModal, isOpen, isRouteDriven } =
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
    <KangurDialog
      open={isOpen}
      modal={!isRouteDriven}
      onOpenChange={handleOpenChange}
      overlayVariant='soft'
      contentSize='md'
      contentProps={{
        'data-testid': 'kangur-login-modal',
        onEscapeKeyDown: (event) => {
          if (!isRouteDriven) {
            return;
          }
          event.preventDefault();
          closeLoginModal();
        },
        onInteractOutside: (event) => {
          if (isRouteDriven) {
            event.preventDefault();
          }
        },
      }}
    >
      <KangurDialogHeader
        title={translations('title')}
        description={translations('description')}
        closeButton={
          <KangurPanelCloseButton
            aria-label={translations('closeAriaLabel')}
            className='absolute right-3 top-3 z-10 sm:right-4 sm:top-4'
            data-testid='kangur-login-modal-close'
            iconClassName='h-4 w-4'
            onClick={closeLoginModal}
            variant='login'
          />
        }
      />

      <KangurLoginPage onClose={dismissLoginModal} />
    </KangurDialog>
  );
});
