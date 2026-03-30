import {
  createContext,
  useContext,
  type PropsWithChildren,
} from 'react';

export type KangurAppBootstrapContextValue = {
  consumeInitialRouteBootstrapBypass: () => boolean;
};

const DEFAULT_KANGUR_APP_BOOTSTRAP_CONTEXT: KangurAppBootstrapContextValue = {
  consumeInitialRouteBootstrapBypass: () => false,
};

const KangurAppBootstrapContext =
  createContext<KangurAppBootstrapContextValue>(
    DEFAULT_KANGUR_APP_BOOTSTRAP_CONTEXT,
  );

export function KangurAppBootstrapProvider({
  children,
  value,
}: PropsWithChildren<{
  value: KangurAppBootstrapContextValue;
}>): React.JSX.Element {
  return (
    <KangurAppBootstrapContext.Provider value={value}>
      {children}
    </KangurAppBootstrapContext.Provider>
  );
}

export const useKangurAppBootstrap = (): KangurAppBootstrapContextValue =>
  useContext(KangurAppBootstrapContext);
