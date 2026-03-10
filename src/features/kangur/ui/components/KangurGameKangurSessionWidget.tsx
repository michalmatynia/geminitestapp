'use client';

import KangurGame from '@/features/kangur/ui/components/KangurGame';
import { KangurGameProvider } from '@/features/kangur/ui/context/KangurGameContext';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { KangurInfoCard, KangurStatusChip } from '@/features/kangur/ui/design/primitives';

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
                className='text-[11px] uppercase tracking-[0.16em]'
                data-testid='kangur-kangur-session-recommendation-chip'
                size='sm'
              >
                Polecony kierunek
              </KangurStatusChip>
              <KangurStatusChip
                accent='amber'
                className='text-[11px] uppercase tracking-[0.16em]'
                data-testid='kangur-kangur-session-recommendation-label'
                size='sm'
              >
                {activeSessionRecommendation.label}
              </KangurStatusChip>
            </div>
            <div
              className='text-sm font-semibold text-slate-900'
              data-testid='kangur-kangur-session-recommendation-title'
            >
              {activeSessionRecommendation.title}
            </div>
            {activeSessionRecommendation.description ? (
              <div
                className='text-xs leading-6 text-slate-700'
                data-testid='kangur-kangur-session-recommendation-description'
              >
                {activeSessionRecommendation.description}
              </div>
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
