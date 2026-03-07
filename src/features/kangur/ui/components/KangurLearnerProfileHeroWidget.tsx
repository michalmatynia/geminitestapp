'use client';

import { LogIn } from 'lucide-react';

import { KangurButton } from '@/features/kangur/ui/design/primitives';
import {
  getKangurLearnerProfileDisplayName,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';

export function KangurLearnerProfileHeroWidget(): React.JSX.Element {
  const { user, navigateToLogin } = useKangurLearnerProfileRuntime();
  const displayName = getKangurLearnerProfileDisplayName(user);

  return (
    <div>
      <h1 className='bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-4xl font-extrabold text-transparent drop-shadow'>
        Profil ucznia
      </h1>
      <p className='mt-1 text-slate-500'>Statystyki ucznia: {displayName}.</p>
      {!user ? (
        <KangurButton
          className='mt-4'
          onClick={navigateToLogin}
          size='md'
          variant='secondary'
          data-doc-id='profile_login'
        >
          <LogIn className='h-4 w-4' /> Zaloguj sie, aby synchronizowac postep
        </KangurButton>
      ) : null}
    </div>
  );
}
