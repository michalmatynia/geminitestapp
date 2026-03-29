import { useEffect, useMemo, useState } from 'react';

import { createDefaultKangurProgressState } from '@kangur/contracts';
import { HomeLoadingShell } from './HomeLoadingShell';
import {
  KangurMobileHomeProgressSnapshotProvider,
} from './KangurMobileHomeProgressSnapshotContext';
import {
  buildPersistedKangurMobileHomeLessonCheckpointSnapshot,
  persistKangurMobileHomeLessonCheckpoints,
  resolveKangurMobileHomeLessonCheckpointIdentity,
  resolvePersistedKangurMobileHomeLessonCheckpoints,
} from './persistedKangurMobileHomeLessonCheckpoints';
import { useHomeScreenBootState } from './useHomeScreenBootState';
import { useHomeScreenDeferredPanels } from './useHomeScreenDeferredPanels';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { HomeScreenContent } from './home-screen-content';

function HomeScreenReady(): React.JSX.Element {
  const { locale } = useKangurMobileI18n();
  const { progressStore, storage } = useKangurMobileRuntime();
  const [initialProgress] = useState(createDefaultKangurProgressState);
  const areDeferredHomeProgressReady = useHomeScreenDeferredPanels(
    'home:progress',
    false,
  );
  const homeLessonCheckpointIdentity = useMemo(
    () => resolveKangurMobileHomeLessonCheckpointIdentity(storage),
    [storage],
  );
  const initialRecentLessonCheckpoints = useMemo(
    () =>
      resolvePersistedKangurMobileHomeLessonCheckpoints({
        learnerIdentity: homeLessonCheckpointIdentity,
        limit: 2,
        locale,
        storage,
      }) ?? [],
    [homeLessonCheckpointIdentity, locale, storage],
  );
  const initialLatestLessonCheckpoint = initialRecentLessonCheckpoints[0] ?? null;

  useEffect(() => {
    if (!areDeferredHomeProgressReady) {
      return;
    }

    persistKangurMobileHomeLessonCheckpoints({
      learnerIdentity: homeLessonCheckpointIdentity,
      snapshot: buildPersistedKangurMobileHomeLessonCheckpointSnapshot({
        progress: progressStore.loadProgress(),
      }),
      storage,
    });
  }, [
    areDeferredHomeProgressReady,
    homeLessonCheckpointIdentity,
    progressStore,
    storage,
  ]);

  return (
    <KangurMobileHomeProgressSnapshotProvider
      progress={initialProgress}
      subscribeToProgressStore={areDeferredHomeProgressReady}
    >
      <HomeScreenContent
        initialLatestLessonCheckpoint={initialLatestLessonCheckpoint}
        initialRecentLessonCheckpoints={initialRecentLessonCheckpoints}
        isLiveHomeProgressReady={areDeferredHomeProgressReady}
      />
    </KangurMobileHomeProgressSnapshotProvider>
  );
}

export default function HomeScreen(): React.JSX.Element {
  const isPreparingHomeView = useHomeScreenBootState('home');

  if (isPreparingHomeView) {
    return <HomeLoadingShell />;
  }

  return <HomeScreenReady />;
}
