'use client';

import TrainingSetup from '@/features/kangur/ui/components/TrainingSetup';
import {
  getRecommendedTrainingSetup,
  hasMatchingTrainingSelection,
} from '@/features/kangur/ui/services/game-setup-recommendations';
import type { KangurSessionStartOptions, KangurTrainingSelection } from '@/features/kangur/ui/types';

type KangurTrainingSetupPanelProps = {
  onStart: (selection: KangurTrainingSelection, options?: KangurSessionStartOptions) => void;
  suggestedTraining: ReturnType<typeof getRecommendedTrainingSetup>;
};

export function KangurTrainingSetupPanel({
  onStart,
  suggestedTraining,
}: KangurTrainingSetupPanelProps): React.JSX.Element {
  return (
    <TrainingSetup
      onStart={(selection) =>
        onStart(selection, {
          recommendation: hasMatchingTrainingSelection(selection, suggestedTraining.selection)
            ? {
                description: suggestedTraining.description,
                label: suggestedTraining.label,
                source: 'training_setup',
                title: suggestedTraining.title,
              }
            : null,
        })
      }
      suggestedSelection={suggestedTraining.selection}
      suggestionDescription={suggestedTraining.description}
      suggestionLabel={suggestedTraining.label}
      suggestionTitle={suggestedTraining.title}
    />
  );
}
