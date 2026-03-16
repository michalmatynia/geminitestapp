import { LogIn } from 'lucide-react';

import KangurHeroMilestoneSummary from '@/features/kangur/ui/components/KangurHeroMilestoneSummary';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';

export function KangurLearnerProfileHeroWidget(): React.JSX.Element | null {
  const { user, progress } = useKangurLearnerProfileRuntime();
  const { openLoginModal } = useKangurLoginModal();
  const hasMeaningfulProgress =
    progress.totalXp > 0 ||
    progress.gamesPlayed > 0 ||
    progress.lessonsCompleted > 0 ||
    (progress.dailyQuestsCompleted ?? 0) > 0;
  const shouldRender = !user || hasMeaningfulProgress;

  if (!shouldRender) {
    return null;
  }

  return (
    <KangurPageIntroCard
      accent='indigo'
      className='mx-auto w-full max-w-2xl'
      headingAs='h1'
      onBack={() => {}}
      showBackButton={false}
      showDescription={false}
      showHeading={false}
      testId='kangur-learner-profile-hero'
      title='Profil ucznia'
    >
      <KangurHeroMilestoneSummary
        className='mb-3 w-full'
        dataTestIdPrefix='kangur-learner-profile-hero-milestone'
        trackDataTestIdPrefix='kangur-learner-profile-hero-milestone-track'
        progress={progress}
      />

      {!user ? (
        <div className='grid w-full kangur-panel-gap sm:flex sm:w-auto sm:flex-row'>
          <KangurButton
            className='w-full sm:w-auto'
            onClick={() => {
              openLoginModal();
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
              openLoginModal(null, { authMode: 'create-account' });
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
