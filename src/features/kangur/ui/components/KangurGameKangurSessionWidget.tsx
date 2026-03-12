'use client';

import KangurGame from '@/features/kangur/ui/components/KangurGame';
import { KangurGameProvider } from '@/features/kangur/ui/context/KangurGameContext';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import {
  KangurCardDescription,
  KangurCardTitle,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';

export function KangurGameKangurSessionWidget(): React.JSX.Element | null {
  const { activeSessionRecommendation, kangurMode, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'kangur') {
    return null;
  }

  return (
    <div className='w-full max-w-lg flex flex-col items-center'>
      {activeSessionRecommendation ? (
        <KangurInfoCard
          accent='violet'
          className='mb-4 w-full rounded-[28px]'
          data-testid='kangur-kangur-session-recommendation-card'
          padding='md'
          tone='accent'
        >
          <div className='flex flex-col gap-2'>
            <div className='flex flex-wrap gap-2'>
              <KangurStatusChip
                accent='violet'
                data-testid='kangur-kangur-session-recommendation-chip'
                labelStyle='caps'
                size='sm'
              >
                Polecony kierunek
              </KangurStatusChip>
              <KangurStatusChip
                accent='amber'
                data-testid='kangur-kangur-session-recommendation-label'
                labelStyle='caps'
                size='sm'
              >
                {activeSessionRecommendation.label}
              </KangurStatusChip>
            </div>
            <KangurCardTitle data-testid='kangur-kangur-session-recommendation-title'>
              {activeSessionRecommendation.title}
            </KangurCardTitle>
            {activeSessionRecommendation.description ? (
              <KangurCardDescription
                data-testid='kangur-kangur-session-recommendation-description'
                relaxed
                size='xs'
              >
                {activeSessionRecommendation.description}
              </KangurCardDescription>
            ) : null}
          </div>
        </KangurInfoCard>
      ) : null}
      <KangurGameProvider mode={kangurMode} onBack={() => setScreen('kangur_setup')}>
        <KangurGame />
      </KangurGameProvider>
    </div>
  );
}
