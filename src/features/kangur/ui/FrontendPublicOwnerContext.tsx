'use client';

import { createContext, useContext } from 'react';

type FrontendPublicOwnerContextValue = {
  publicOwner: 'cms' | 'kangur';
};

const FrontendPublicOwnerContext = createContext<FrontendPublicOwnerContextValue | null>(null);

export function FrontendPublicOwnerProvider({
  children,
  publicOwner,
}: {
  children: React.ReactNode;
  publicOwner: 'cms' | 'kangur';
}): React.JSX.Element {
  return (
    <FrontendPublicOwnerContext.Provider value={{ publicOwner }}>
      {children}
    </FrontendPublicOwnerContext.Provider>
  );
}

export const useOptionalFrontendPublicOwner = (): FrontendPublicOwnerContextValue | null =>
  useContext(FrontendPublicOwnerContext);
