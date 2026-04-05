import { KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS } from '@/features/kangur/games/music-piano-roll-contract';
import { createKangurMusicPianoRollLaunchableOnFinishRendererMap } from '@/features/kangur/ui/components/music/music-piano-roll-launchable-runtime';
import type { KangurLaunchableGameRuntimeRendererId } from '@/shared/contracts/kangur-games';
import type {
  LaunchableGameCategoryRendererProps,
  LaunchableGameRendererConfig,
  LaunchableGameRendererProps,
} from './KangurLaunchableGameRuntime.shared';
import {
  createDynamicLaunchableGameComponent,
} from './KangurLaunchableGameRuntime.shared';

const KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RENDERERS =
  createKangurMusicPianoRollLaunchableOnFinishRendererMap<LaunchableGameRendererProps>();

const AlphabetLiteracyGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/AlphabetLiteracyGame')
);
const ArtShapesRotationGapGame = createDynamicLaunchableGameComponent(
  () =>
    import('@/features/kangur/ui/components/ArtShapesRotationGapGame').then(
      (module) => module.ArtShapesRotationGapGame
    )
);
const ColorHarmonyGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/ColorHarmonyGame')
);
const ShapeRecognitionGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/ShapeRecognitionGame')
);

const KANGUR_EARLY_LEARNING_LAUNCHABLE_GAME_RENDERERS: Partial<
  Record<KangurLaunchableGameRuntimeRendererId, LaunchableGameRendererConfig>
> = {
  alphabet_literacy_game: {
    render: ({ finishLabel, onFinish, rendererProps }) => (
      <AlphabetLiteracyGame
        finishLabel={finishLabel}
        literacyMatchSetId={rendererProps?.literacyMatchSetId}
        onFinish={onFinish}
      />
    ),
  },
  art_shapes_rotation_gap_game: {
    render: ({ onFinish }) => <ArtShapesRotationGapGame onFinish={onFinish} />,
  },
  color_harmony_game: {
    render: ({ finishLabel, onFinish }) => (
      <ColorHarmonyGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  [KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS.freePlay]:
    KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RENDERERS[KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS.freePlay],
  [KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS.repeat]:
    KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RENDERERS[KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS.repeat],
  shape_recognition_game: {
    render: ({ finishLabel, onFinish }) => (
      <ShapeRecognitionGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
};

const getEarlyLearningLaunchableGameRendererConfig = (
  rendererId: KangurLaunchableGameRuntimeRendererId
): LaunchableGameRendererConfig => {
  const config = KANGUR_EARLY_LEARNING_LAUNCHABLE_GAME_RENDERERS[rendererId];

  if (!config) {
    throw new Error(`Missing early-learning launchable renderer config for "${rendererId}".`);
  }

  return config;
};

export function EarlyLearningLaunchableGameRenderer({
  rendererId,
  rendererProps,
}: LaunchableGameCategoryRendererProps): React.JSX.Element {
  return getEarlyLearningLaunchableGameRendererConfig(rendererId).render(rendererProps);
}
