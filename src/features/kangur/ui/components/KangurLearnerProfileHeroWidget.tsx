'use client';

import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';

import { getKangurHomeHref } from '@/features/kangur/config/routing';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import {
  getKangurLearnerProfileDisplayName,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';

export function KangurLearnerProfileHeroWidget(): React.JSX.Element {
  const router = useRouter();
  const { basePath, user, navigateToLogin } = useKangurLearnerProfileRuntime();
  const displayName = getKangurLearnerProfileDisplayName(user);

  return (
    <KangurPageIntroCard
      accent='indigo'
      className='mx-auto w-full max-w-2xl'
      description={
        user ? (
          <>
            Statystyki ucznia: <span className='font-semibold text-slate-700'>{displayName}</span>.
          </>
        ) : (
          'Zaloguj sie, aby synchronizowac postep ucznia miedzy urzadzeniami. Jesli nie masz jeszcze konta rodzica, zaloz je tutaj.'
        )
      }
      headingAs='h1'
      onBack={() => router.push(getKangurHomeHref(basePath))}
      testId='kangur-learner-profile-hero'
      title='Profil ucznia'
    >
      {!user ? (
        <div className='grid w-full gap-3 sm:flex sm:w-auto sm:flex-row'>
          <KangurButton
            className='w-full sm:w-auto'
            onClick={() => {
              navigateToLogin();
            }}
            size='sm'
            variant='surface'
            data-doc-id='profile_login'
          >
            <LogIn className='h-4 w-4' /> Zaloguj sie, aby synchronizowac postep
          </KangurButton>
          <KangurButton
            className='w-full sm:w-auto'
            onClick={() => {
              navigateToLogin({ authMode: 'create-account' });
            }}
            size='sm'
            type='button'
            variant='primary'
          >
            Utworz konto rodzica
          </KangurButton>
        </div>
      ) : null}
    </KangurPageIntroCard>
  );
}
