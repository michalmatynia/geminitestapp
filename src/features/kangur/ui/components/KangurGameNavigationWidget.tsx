'use client';

import { useMemo } from 'react';

import { KangurTopNavigationController } from '@/features/kangur/ui/components/primary-navigation/KangurTopNavigationController';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';

export function KangurGameNavigationWidget({
  visible = true,
}: {
  visible?: boolean;
} = {}): React.JSX.Element | null {
  const { pageKey } = useKangurRouting();
  const {
    basePath,
    handleHome,
    logout,
    screen,
    user,
  } = useKangurGameRuntime();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const { openLoginModal } = useKangurLoginModal();
  const navigation = useMemo(
    () => ({
      basePath,
      canManageLearners: Boolean(user?.canManageLearners),
      className: 'pb-0',
      currentPage: 'Game' as const,
      guestPlayerName: user ? undefined : guestPlayerName,
      homeActive: screen === 'home',
      isAuthenticated: Boolean(user),
      onHomeClick: handleHome,
      onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
      onLogin: openLoginModal,
      onLogout: () => logout(false),
    }),
    [
      basePath,
      guestPlayerName,
      handleHome,
      logout,
      openLoginModal,
      screen,
      setGuestPlayerName,
      user,
    ]
  );
  const shouldOwnTopNavigation = visible && pageKey === 'Game';

  return <KangurTopNavigationController navigation={navigation} visible={shouldOwnTopNavigation} />;
}
