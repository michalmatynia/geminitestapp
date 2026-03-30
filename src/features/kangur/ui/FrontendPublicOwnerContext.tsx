'use client';

import { createContext, useContext } from 'react';

import type { FrontendPublicOwner, FrontendPublicRouteFamily } from '@/shared/lib/frontend-public-route-family';

type FrontendPublicOwnerContextValue = {
  publicOwner: FrontendPublicOwner;
  routeFamily?: FrontendPublicRouteFamily;
};

const FrontendPublicOwnerContext = createContext<FrontendPublicOwnerContextValue | null>(null);

export function FrontendPublicOwnerProvider({
  children,
  publicOwner,
  routeFamily,
}: {
  children: React.ReactNode;
  publicOwner: FrontendPublicOwner;
  routeFamily?: FrontendPublicRouteFamily;
}): React.JSX.Element {
  return (
    <FrontendPublicOwnerContext.Provider value={{ publicOwner, routeFamily }}>
      {children}
    </FrontendPublicOwnerContext.Provider>
  );
}

export const useOptionalFrontendPublicOwner = (): FrontendPublicOwnerContextValue | null =>
  useContext(FrontendPublicOwnerContext);
