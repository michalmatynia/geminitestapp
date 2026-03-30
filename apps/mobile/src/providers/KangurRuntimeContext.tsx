import { createContext, useContext, useState, type PropsWithChildren } from 'react';

import { createKangurMobileRuntime } from './KangurRuntimeContext.runtime';
import type { KangurMobileRuntime } from './KangurRuntimeContext.shared';

const KangurRuntimeContext = createContext<KangurMobileRuntime | null>(null);

export function KangurRuntimeProvider({
  children,
}: PropsWithChildren): React.JSX.Element {
  const [runtime] = useState(createKangurMobileRuntime);

  return (
    <KangurRuntimeContext.Provider value={runtime}>
      {children}
    </KangurRuntimeContext.Provider>
  );
}

export function useKangurMobileRuntime(): KangurMobileRuntime {
  const runtime = useContext(KangurRuntimeContext);

  if (!runtime) {
    throw new Error(
      'useKangurMobileRuntime must be used inside KangurRuntimeProvider.'
    );
  }

  return runtime;
}
