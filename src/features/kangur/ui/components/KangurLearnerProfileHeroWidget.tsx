'use client';

import { LogIn } from 'lucide-react';

import {
  KangurButton,
  KangurGlassPanel,
  KangurGradientHeading,
} from '@/features/kangur/ui/design/primitives';
import {
  getKangurLearnerProfileDisplayName,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';

export function KangurLearnerProfileHeroWidget(): React.JSX.Element {
  const { user, navigateToLogin } = useKangurLearnerProfileRuntime();
  const displayName = getKangurLearnerProfileDisplayName(user);

  return (
    <KangurGlassPanel
      className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'
      padding='lg'
      surface='mistStrong'
      variant='soft'
    >
      <div className='max-w-2xl'>
        <div className='text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>
          Dane i postep
        </div>
        <KangurGradientHeading gradientClass='from-indigo-500 to-purple-600' size='lg'>
          Profil ucznia
        </KangurGradientHeading>
        <p className='mt-2 text-sm text-slate-500'>Statystyki ucznia: {displayName}.</p>
      </div>
      {!user ? (
        <KangurButton
          className='sm:self-start'
          onClick={navigateToLogin}
          size='sm'
          variant='surface'
          data-doc-id='profile_login'
        >
          <LogIn className='h-4 w-4' /> Zaloguj sie, aby synchronizowac postep
        </KangurButton>
      ) : null}
    </KangurGlassPanel>
  );
}
