'use client';

import KangurSetup from '@/features/kangur/ui/components/KangurSetup';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameKangurSetupWidget(): React.JSX.Element | null {
  const { handleHome, handleStartKangur, screen } = useKangurGameRuntime();

  if (screen !== 'kangur_setup') {
    return null;
  }

  return <KangurSetup onStart={handleStartKangur} onBack={handleHome} />;
}
