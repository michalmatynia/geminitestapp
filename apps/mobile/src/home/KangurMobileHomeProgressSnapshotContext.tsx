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

const resolveHomeProgressServerSnapshot = (
  shouldSubscribeToProgressStore: boolean,
  providedProgress: KangurProgressState | null,
): (() => KangurProgressState) => {
  if (shouldSubscribeToProgressStore) {
    return providedProgress !== null
      ? () => providedProgress
      : createDefaultKangurProgressState;
  }

  return () => providedProgress ?? createDefaultKangurProgressState();
};

export const useKangurMobileHomeProgressSnapshot = (): KangurProgressState => {
  const providedProgressSnapshot = useContext(KangurMobileHomeProgressSnapshotContext);
  const { progressStore } = useKangurMobileRuntime();
  const shouldSubscribeToProgressStore =
    providedProgressSnapshot?.subscribeToProgressStore ?? true;
  const providedProgress = providedProgressSnapshot?.progress ?? null;

  const subscribe = shouldSubscribeToProgressStore
    ? progressStore.subscribeToProgress
    : subscribeToProvidedHomeProgressSnapshot;

  const getSnapshot = shouldSubscribeToProgressStore
    ? progressStore.loadProgress
    : () => providedProgress ?? createDefaultKangurProgressState();

  const getServerSnapshot = resolveHomeProgressServerSnapshot(
    shouldSubscribeToProgressStore,
    providedProgress,
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
