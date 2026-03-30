import type { JSX } from 'react';

import type { KangurGameRuntimeRendererProps } from '@/shared/contracts/kangur-game-runtime-renderer-props';
import type { KangurLaunchableGameRuntimeRendererId } from '@/shared/contracts/kangur-games';
import type {
  KangurMiniGameFinishActionProps,
  KangurMiniGameFinishProps,
  KangurMiniGameFinishVariantProps,
} from '@/features/kangur/ui/types';

export type LaunchableGameRendererProps = KangurMiniGameFinishActionProps & {
  completionPrimaryActionLabel?: string;
  finishLabel?: KangurMiniGameFinishProps['finishLabel'];
  finishLabelVariant?: KangurMiniGameFinishVariantProps['finishLabelVariant'];
  rendererProps?: KangurGameRuntimeRendererProps;
};

export type LaunchableGameRendererConfig = {
  render: (props: LaunchableGameRendererProps) => JSX.Element;
};

export type LaunchableGameCategoryRendererProps = {
  rendererId: KangurLaunchableGameRuntimeRendererId;
  rendererProps: LaunchableGameRendererProps;
};
