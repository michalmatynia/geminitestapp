import {
  createContext,
  useContext,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';
import {
  createDefaultKangurProgressState,
  type KangurProgressState,
} from '@kangur/contracts';

import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

const KangurMobileHomeProgressSnapshotContext =
  createContext<KangurProgressState | null>(null);

const subscribeToProvidedHomeProgressSnapshot = (): (() => void) => () => {};

export const KangurMobileHomeProgressSnapshotProvider = ({
  children,
  progress,
}: PropsWithChildren<{
  progress: KangurProgressState;
}>): React.JSX.Element => (
  <KangurMobileHomeProgressSnapshotContext.Provider value={progress}>
    {children}
  </KangurMobileHomeProgressSnapshotContext.Provider>
);

export const useKangurMobileHomeProgressSnapshot = (): KangurProgressState => {
  const providedProgressSnapshot = useContext(KangurMobileHomeProgressSnapshotContext);
  const { progressStore } = useKangurMobileRuntime();

  return useSyncExternalStore(
    providedProgressSnapshot
      ? subscribeToProvidedHomeProgressSnapshot
      : progressStore.subscribeToProgress,
    providedProgressSnapshot ? () => providedProgressSnapshot : progressStore.loadProgress,
    providedProgressSnapshot ? () => providedProgressSnapshot : createDefaultKangurProgressState,
  );
};
