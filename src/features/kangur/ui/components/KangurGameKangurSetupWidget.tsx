'use client';

import { useMemo } from 'react';

import { KangurKangurWordmark } from '@/features/kangur/ui/components/KangurKangurWordmark';
import { KangurGameSetupStage } from '@/features/kangur/ui/components/KangurGameSetupStage';
import KangurSetup from '@/features/kangur/ui/components/KangurSetup';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { getRecommendedKangurMode } from '@/features/kangur/ui/services/game-setup-recommendations';

type KangurGameKangurSetupWidgetProps = {
  onBack?: () => void;
};

export function KangurGameKangurSetupWidget({
  onBack,
}: KangurGameKangurSetupWidgetProps = {}): React.JSX.Element | null {
  const { handleHome, handleStartKangur, progress, screen } = useKangurGameRuntime();
  const recommendedMode = useMemo(() => getRecommendedKangurMode(progress), [progress]);
  const resolvedOnBack = onBack ?? handleHome;

  if (screen !== 'kangur_setup') {
    return null;
  }

  return (
    <KangurGameSetupStage
      description='Wybierz edycję konkursu i zestaw zadań do rozwiązania.'
      momentumMode='kangur'
      onBack={resolvedOnBack}
      progress={progress}
      testId='kangur-game-kangur-setup-top-section'
      title='Kangur'
      visualTitle={
        <KangurKangurWordmark
          className='mx-auto'
          data-testid='kangur-kangur-heading-art'
          idPrefix='kangur-game-kangur-heading'
        />
      }
    >
      <KangurSetup
        onStart={(mode) =>
          handleStartKangur(mode, {
            recommendation:
              mode === recommendedMode.mode
                ? {
                  description: recommendedMode.description,
                  label: recommendedMode.label,
                  source: 'kangur_setup',
                  title: recommendedMode.title,
                }
                : null,
          })
        }
        recommendedDescription={recommendedMode.description}
        recommendedLabel={recommendedMode.label}
        recommendedMode={recommendedMode.mode}
        recommendedTitle={recommendedMode.title}
      />
    </KangurGameSetupStage>
  );
}
