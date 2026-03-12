'use client';

import { LogIn } from 'lucide-react';

import { getKangurHomeHref } from '@/features/kangur/config/routing';
import KangurHeroMilestoneSummary from '@/features/kangur/ui/components/KangurHeroMilestoneSummary';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import {
  getKangurLearnerProfileDisplayName,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';

const HERO_BACK_TRANSITION_ACKNOWLEDGE_MS = 110;

export function KangurLearnerProfileHeroWidget(): React.JSX.Element {
  const routeNavigator = useKangurRouteNavigator();
  const { basePath, user, navigateToLogin, progress } = useKangurLearnerProfileRuntime();
  const { entry: heroContent } = useKangurPageContentEntry('learner-profile-hero');
  const displayName = getKangurLearnerProfileDisplayName(user);
  const heroTitle = heroContent?.title ?? 'Profil ucznia';
  const heroUserSummary =
    heroContent?.summary ?? 'Statystyki ucznia:';
  const heroGuestSummary =
    heroContent?.summary ??
    'Zaloguj się, aby synchronizować postęp ucznia między urządzeniami. Jeśli nie masz jeszcze konta rodzica, załóż je tutaj.';

  return (
    <KangurPageIntroCard
      accent='indigo'
      className='mx-auto w-full max-w-2xl'
      description={
        user ? (
          <>
            {heroUserSummary}{' '}
            <span className='font-semibold [color:var(--kangur-page-text)]'>{displayName}</span>.
          </>
        ) : (
          heroGuestSummary
        )
      }
      headingAs='h1'
      onBack={() =>
        routeNavigator.push(getKangurHomeHref(basePath), {
          acknowledgeMs: HERO_BACK_TRANSITION_ACKNOWLEDGE_MS,
          pageKey: 'Game',
          sourceId: 'learner-profile-hero:back',
        })
      }
      testId='kangur-learner-profile-hero'
      title={heroTitle}
    >
      <KangurHeroMilestoneSummary
        className='mb-3 w-full'
        dataTestIdPrefix='kangur-learner-profile-hero-milestone'
        trackDataTestIdPrefix='kangur-learner-profile-hero-milestone-track'
        progress={progress}
      />

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
            <LogIn className='h-4 w-4' /> Zaloguj się, aby synchronizować postęp
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
            Utwórz konto rodzica
          </KangurButton>
        </div>
      ) : null}
    </KangurPageIntroCard>
  );
}
