'use client';

import { useMemo } from 'react';

import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';

export function KangurGameNavigationWidget(): React.JSX.Element {
  const {
    basePath,
    handleHome,
    logout,
    navigateToLogin,
    screen,
    user,
  } = useKangurGameRuntime();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const navigation = useMemo(
    () => ({
      basePath,
      canManageLearners: Boolean(user?.canManageLearners),
      currentPage: 'Game' as const,
      guestPlayerName: user ? undefined : guestPlayerName,
      homeActive: screen === 'home',
      isAuthenticated: Boolean(user),
      onHomeClick: handleHome,
      onCreateAccount: () => navigateToLogin({ authMode: 'create-account' }),
      onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
      onLogin: navigateToLogin,
      onLogout: () => logout(false),
    }),
    [
      basePath,
      guestPlayerName,
      handleHome,
      logout,
      navigateToLogin,
      screen,
      setGuestPlayerName,
      user,
    ]
  );

  return <KangurTopNavigationController navigation={navigation} />;
}
