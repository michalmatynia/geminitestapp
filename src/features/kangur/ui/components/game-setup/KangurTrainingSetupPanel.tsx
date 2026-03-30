import {
  getRecommendedTrainingSetup,
  hasMatchingTrainingSelection,
} from '@/features/kangur/ui/services/game-setup-recommendations';
import type { KangurSessionStartOptions, KangurTrainingSelection } from '@/features/kangur/ui/types';

import TrainingSetup from './TrainingSetup';

type KangurTrainingSetupPanelProps = {
  onStart: (selection: KangurTrainingSelection, options?: KangurSessionStartOptions) => void;
  suggestedTraining: ReturnType<typeof getRecommendedTrainingSetup>;
};

export function KangurTrainingSetupPanel({
  onStart,
  suggestedTraining,
}: KangurTrainingSetupPanelProps): React.JSX.Element {
  const trainingSetupProps = {
    onStart: (selection: KangurTrainingSelection): void =>
      onStart(selection, {
        recommendation: hasMatchingTrainingSelection(selection, suggestedTraining.selection)
          ? {
              description: suggestedTraining.description,
              label: suggestedTraining.label,
              source: 'training_setup' as const,
              title: suggestedTraining.title,
            }
          : null,
      }),
    suggestedSelection: suggestedTraining.selection,
    suggestionDescription: suggestedTraining.description,
    suggestionLabel: suggestedTraining.label,
    suggestionTitle: suggestedTraining.title,
  };

  return (
    <TrainingSetup {...trainingSetupProps} />
  );
}
