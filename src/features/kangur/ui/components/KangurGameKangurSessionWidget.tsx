'use client';

import KangurGame from '@/features/kangur/ui/components/KangurGame';
import { KangurGameProvider } from '@/features/kangur/ui/context/KangurGameContext';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameKangurSessionWidget(): React.JSX.Element | null {
  const { kangurMode, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'kangur') {
    return null;
  }

  return (
    <div className='w-full max-w-lg flex flex-col items-center'>
      <KangurGameProvider mode={kangurMode} onBack={() => setScreen('kangur_setup')}>
        <KangurGame />
      </KangurGameProvider>
    </div>
  );
}
