import { useKangurMobileHomeLessonCheckpoints, type KangurMobileHomeLessonCheckpointItem } from '../useKangurMobileHomeLessonCheckpoints';

type HomeHeroLatestLessonCheckpointViewModel = {
  homeHeroRecentCheckpoint: KangurMobileHomeLessonCheckpointItem | null;
  homeHeroRecentCheckpointCount: number;
};

type HomeHeroLatestLessonCheckpointStateProps = {
  children: (viewModel: HomeHeroLatestLessonCheckpointViewModel) => React.ReactNode;
  isEnabled: boolean;
  initialLatestLessonCheckpoint: KangurMobileHomeLessonCheckpointItem | null;
  isLiveProgressReady: boolean;
};

function LiveHomeHeroLatestLessonCheckpointState({
  children,
}: Pick<HomeHeroLatestLessonCheckpointStateProps, 'children'>): React.JSX.Element {
  const latestLessonCheckpoint = useKangurMobileHomeLessonCheckpoints({
    limit: 1,
  });

  return (
    <>
      {children({
        homeHeroRecentCheckpoint: latestLessonCheckpoint.recentCheckpoints[0] ?? null,
        homeHeroRecentCheckpointCount: latestLessonCheckpoint.recentCheckpoints.length,
      })}
    </>
  );
}

export function HomeHeroLatestLessonCheckpointState({
  children,
  isEnabled,
  initialLatestLessonCheckpoint,
  isLiveProgressReady,
}: HomeHeroLatestLessonCheckpointStateProps): React.JSX.Element {
  if (!isEnabled) {
    return (
      <>
        {children({
          homeHeroRecentCheckpoint: null,
          homeHeroRecentCheckpointCount: 0,
        })}
      </>
    );
  }

  if (!isLiveProgressReady) {
    return (
      <>
        {children({
          homeHeroRecentCheckpoint: initialLatestLessonCheckpoint,
          homeHeroRecentCheckpointCount: initialLatestLessonCheckpoint ? 1 : 0,
        })}
      </>
    );
  }

  return <LiveHomeHeroLatestLessonCheckpointState>{children}</LiveHomeHeroLatestLessonCheckpointState>;
}
