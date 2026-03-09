'use client';

import { useMemo } from 'react';

import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameNavigationWidget(): React.JSX.Element {
  const {
    basePath,
    handleHome,
    logout,
    navigateToLogin,
    playerName,
    screen,
    setPlayerName,
    user,
  } = useKangurGameRuntime();
  const navigation = useMemo(
    () => ({
      basePath,
      canManageLearners: Boolean(user?.canManageLearners),
      contentClassName: 'justify-center',
      currentPage: 'Game' as const,
      guestPlayerName: user ? undefined : playerName,
      homeActive: screen === 'home',
      isAuthenticated: Boolean(user),
      onHomeClick: handleHome,
      onCreateAccount: () => navigateToLogin({ authMode: 'create-account' }),
      onGuestPlayerNameChange: user ? undefined : setPlayerName,
      onLogin: navigateToLogin,
      onLogout: () => logout(false),
    }),
    [
      basePath,
      handleHome,
      logout,
      navigateToLogin,
      playerName,
      screen,
      setPlayerName,
      user,
    ]
  );

  return <KangurTopNavigationController navigation={navigation} />;
}
