'use client';

import type { KangurLaunchableGameRuntimeRendererId } from '@/shared/contracts/kangur-games';
import type {
  LaunchableGameCategoryRendererProps,
  LaunchableGameRendererConfig,
} from './KangurLaunchableGameRuntime.shared';
import {
  createDynamicLaunchableGameComponent,
} from './KangurLaunchableGameRuntime.shared';

const AgenticPromptTrimGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/AgenticPromptTrimGame')
);

const KANGUR_ADULT_LEARNING_LAUNCHABLE_GAME_RENDERERS: Partial<
  Record<KangurLaunchableGameRuntimeRendererId, LaunchableGameRendererConfig>
> = {
  agentic_prompt_trim_game: {
    render: ({ onFinish }) => <AgenticPromptTrimGame onFinish={onFinish} />,
  },
};

const getAdultLearningLaunchableGameRendererConfig = (
  rendererId: KangurLaunchableGameRuntimeRendererId
): LaunchableGameRendererConfig => {
  const config = KANGUR_ADULT_LEARNING_LAUNCHABLE_GAME_RENDERERS[rendererId];

  if (!config) {
    throw new Error(`Missing adult-learning launchable renderer config for "${rendererId}".`);
  }

  return config;
};

export function AdultLearningLaunchableGameRenderer({
  rendererId,
  rendererProps,
}: LaunchableGameCategoryRendererProps): React.JSX.Element {
  return getAdultLearningLaunchableGameRendererConfig(rendererId).render(rendererProps);
}
