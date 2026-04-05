import {
  createContext,
  useContext,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';
import {
  createDefaultKangurProgressState,
  type KangurProgressState,
} from '@kangur/contracts/kangur';

import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

type KangurMobileHomeProgressSnapshotContextValue = {
  progress: KangurProgressState;
  subscribeToProgressStore: boolean;
};

const KangurMobileHomeProgressSnapshotContext =
  createContext<KangurMobileHomeProgressSnapshotContextValue | null>(null);

const subscribeToProvidedHomeProgressSnapshot = (): (() => void) => () => {};

export const KangurMobileHomeProgressSnapshotProvider = ({
  children,
  progress,
  subscribeToProgressStore = false,
}: PropsWithChildren<{
  progress: KangurProgressState;
  subscribeToProgressStore?: boolean;
}>): React.JSX.Element => (
  <KangurMobileHomeProgressSnapshotContext.Provider
    value={{
      progress,
      subscribeToProgressStore,
    }}
  >
    {children}
  </KangurMobileHomeProgressSnapshotContext.Provider>
);

export const useKangurMobileHomeProgressSnapshot = (): KangurProgressState => {
  const providedProgressSnapshot = useContext(KangurMobileHomeProgressSnapshotContext);
  const { progressStore } = useKangurMobileRuntime();
  const shouldSubscribeToProgressStore =
    providedProgressSnapshot?.subscribeToProgressStore ?? true;
  const providedProgress = providedProgressSnapshot?.progress ?? null;

  return useSyncExternalStore(
    shouldSubscribeToProgressStore
      ? progressStore.subscribeToProgress
      : subscribeToProvidedHomeProgressSnapshot,
    shouldSubscribeToProgressStore
      ? progressStore.loadProgress
      : () => providedProgress ?? createDefaultKangurProgressState(),
    shouldSubscribeToProgressStore
      ? providedProgress
        ? () => providedProgress
        : createDefaultKangurProgressState
      : () => providedProgress ?? createDefaultKangurProgressState(),
  );
};
