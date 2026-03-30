'use client';

import { useLocale, useTranslations } from 'next-intl';
import { LogIn } from 'lucide-react';

import KangurHeroMilestoneSummary from '@/features/kangur/ui/components/KangurHeroMilestoneSummary';
import { getKangurAvatarById } from '@/features/kangur/ui/avatars/catalog';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/lesson-library/KangurPageIntroCard';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import {
  getKangurLearnerProfileDisplayName,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GRID_TO_ROW_CLASSNAME,
  KANGUR_SPACED_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { translateKangurLearnerProfileWithFallback } from '@/features/kangur/ui/services/profile';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

const getLocalModeFallbackLabel = (locale: ReturnType<typeof normalizeSiteLocale>): string => {
  if (locale === 'uk') {
    return 'Локальний режим';
  }

  if (locale === 'de') {
    return 'Lokaler Modus';
  }

  if (locale === 'en') {
    return 'Local mode';
  }

  return 'Tryb lokalny';
};

const hasKangurMeaningfulProfileProgress = (
  progress: ReturnType<typeof useKangurLearnerProfileRuntime>['progress']
): boolean =>
  progress.totalXp > 0 ||
  progress.gamesPlayed > 0 ||
  progress.lessonsCompleted > 0 ||
  (progress.dailyQuestsCompleted ?? 0) > 0;

const resolveKangurHeroActionClassName = (isCoarsePointer: boolean): string =>
  isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto';

function KangurLearnerProfileHeroIdentity({
  displayName,
  selectedAvatar,
  translations,
}: {
  displayName: string | null;
  selectedAvatar: ReturnType<typeof getKangurAvatarById>;
  translations: ReturnType<typeof useTranslations<'KangurLearnerProfileWidgets.hero'>>;
}): React.JSX.Element | null {
  if (!displayName) {
    return null;
  }

  return (
    <div
      className={`mb-4 w-full ${KANGUR_SPACED_ROW_CLASSNAME} items-center sm:justify-center sm:gap-4`}
    >
      <div className='h-16 w-16 overflow-hidden rounded-full border border-white/80 bg-white/80 shadow-sm'>
        {selectedAvatar ? (
          <img
            src={selectedAvatar.src}
            alt={selectedAvatar.label}
            className='h-full w-full object-cover'
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center text-xl font-black text-slate-400'>
            ?
          </div>
        )}
      </div>
      <div className='text-center sm:text-left'>
        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
          {translations('avatarLabel')}
        </p>
        <p className='text-lg font-bold text-slate-800'>{displayName}</p>
      </div>
    </div>
  );
}

function KangurLearnerProfileHeroAuthActions({
  actionClassName,
  openLoginModal,
  translations,
}: {
  actionClassName: string;
  openLoginModal: ReturnType<typeof useKangurLoginModal>['openLoginModal'];
  translations: ReturnType<typeof useTranslations<'KangurLearnerProfileWidgets.hero'>>;
}): React.JSX.Element {
  return (
    <div className={KANGUR_PANEL_GRID_TO_ROW_CLASSNAME}>
      <KangurButton
        className={actionClassName}
        onClick={() => {
          openLoginModal();
        }}
        size='sm'
        variant='surface'
        data-doc-id='profile_login'
      >
        <LogIn aria-hidden='true' className='h-4 w-4' /> {translations('signIn')}
      </KangurButton>
      <KangurButton
        className={actionClassName}
        onClick={() => {
          openLoginModal(null, { authMode: 'create-account' });
        }}
        size='sm'
        type='button'
        variant='primary'
      >
        {translations('createParentAccount')}
      </KangurButton>
    </div>
  );
}

export function KangurLearnerProfileHeroWidget(): React.JSX.Element | null {
  const locale = normalizeSiteLocale(useLocale());
  const translations = useTranslations('KangurLearnerProfileWidgets.hero');
  const runtimeTranslations = useTranslations('KangurLearnerProfileRuntime');
  const isCoarsePointer = useKangurCoarsePointer();
  const { user, progress } = useKangurLearnerProfileRuntime();
  const { openLoginModal } = useKangurLoginModal();
  const activeLearner = user?.activeLearner ?? null;
  const selectedAvatar = getKangurAvatarById(activeLearner?.avatarId);
  const localModeLabel = translateKangurLearnerProfileWithFallback(
    (key, values) => runtimeTranslations(key as never, values as never),
    'localMode',
    getLocalModeFallbackLabel(locale)
  );
  const displayName = user ? getKangurLearnerProfileDisplayName(user, localModeLabel) : null;
  const shouldRender = !user || hasKangurMeaningfulProfileProgress(progress);
  const actionClassName = resolveKangurHeroActionClassName(isCoarsePointer);

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
      title={translations('title')}
    >
      <KangurLearnerProfileHeroIdentity
        displayName={displayName}
        selectedAvatar={selectedAvatar}
        translations={translations}
      />
      <KangurHeroMilestoneSummary
        className='mb-3 w-full'
        dataTestIdPrefix='kangur-learner-profile-hero-milestone'
        trackDataTestIdPrefix='kangur-learner-profile-hero-milestone-track'
        progress={progress}
      />

      {!user ? (
        <KangurLearnerProfileHeroAuthActions
          actionClassName={actionClassName}
          openLoginModal={openLoginModal}
          translations={translations}
        />
      ) : null}
    </KangurPageIntroCard>
  );
}
