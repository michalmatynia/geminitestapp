import React from 'react';
import {
  KangurAuthProvider,
  KangurGuestPlayerProvider,
  KangurLoginModalProvider,
  KangurRouteTransitionProvider,
  KangurTopNavigationProvider,
  KangurFocusProvider,
} from '@/features/kangur/ui/context';

interface KangurAppProvidersProps {
  children: React.ReactNode;
}

export function KangurAppProviders({ children }: KangurAppProvidersProps): React.JSX.Element {
  return (
    <KangurAuthProvider>
      <KangurLoginModalProvider>
        <KangurRouteTransitionProvider>
          <KangurTopNavigationProvider>
            <KangurFocusProvider>
              <KangurGuestPlayerProvider>
                {children}
              </KangurGuestPlayerProvider>
            </KangurFocusProvider>
          </KangurTopNavigationProvider>
        </KangurRouteTransitionProvider>
      </KangurLoginModalProvider>
    </KangurAuthProvider>
  );
}
