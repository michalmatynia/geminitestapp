'use client';

import { KangurPrimaryNavigation } from '@/features/kangur/ui/components/KangurPrimaryNavigation';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameNavigationWidget(): React.JSX.Element {
  const { basePath, handleHome, logout, navigateToLogin, screen, user } = useKangurGameRuntime();

  return (
    <KangurPrimaryNavigation
      basePath={basePath}
      canManageLearners={Boolean(user?.canManageLearners)}
      contentClassName='justify-center'
      currentPage='Game'
      homeActive={screen === 'home'}
      isAuthenticated={Boolean(user)}
      onHomeClick={handleHome}
      onLogin={navigateToLogin}
      onLogout={() => logout(false)}
    />
  );
}
