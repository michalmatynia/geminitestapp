'use client';

import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

type AgenticCodingMiniGameProps<TConfig> = {
  accent: KangurAccent;
  config: TConfig;
};

type AgenticCodingMiniGameComponentConfig<TConfig, TModel> = {
  displayName?: string;
  render: (
    props: AgenticCodingMiniGameProps<TConfig>,
    model: TModel
  ) => React.JSX.Element;
  useModel: (config: TConfig) => TModel;
};

export function createAgenticCodingMiniGameComponent<TConfig, TModel>({
  displayName,
  render,
  useModel,
}: AgenticCodingMiniGameComponentConfig<TConfig, TModel>): (
  props: AgenticCodingMiniGameProps<TConfig>
) => React.JSX.Element {
  const CreatedMiniGame = (
    props: AgenticCodingMiniGameProps<TConfig>
  ): React.JSX.Element => {
    const model = useModel(props.config);
    return render(props, model);
  };

  if (displayName) {
    CreatedMiniGame.displayName = displayName;
  }

  return CreatedMiniGame;
}
