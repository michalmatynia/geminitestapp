'use client';

import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import KangurSetup from '@/features/kangur/ui/components/KangurSetup';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameKangurSetupWidget(): React.JSX.Element | null {
  const { handleHome, handleStartKangur, screen } = useKangurGameRuntime();

  if (screen !== 'kangur_setup') {
    return null;
  }

  return (
    <div className='w-full flex flex-col items-center gap-4'>
      <KangurPageIntroCard
        accent='amber'
        className='max-w-md'
        description='Wybierz edycje konkursu i zestaw zadan do rozwiazania.'
        headingSize='lg'
        onBack={handleHome}
        testId='kangur-game-kangur-setup-top-section'
        title='Kangur Matematyczny'
      />
      <KangurSetup onStart={handleStartKangur} />
    </div>
  );
}
