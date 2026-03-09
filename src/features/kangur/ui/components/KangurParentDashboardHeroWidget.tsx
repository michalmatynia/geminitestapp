'use client';

import {
  BookOpen,
  Home,
  LayoutGrid,
  LogIn,
  LogOut,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
  getKangurHomeHref,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import { useKangurParentDashboardRuntime } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';

export function KangurParentDashboardHeroWidget({
  showActions = true,
}: {
  showActions?: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const {
    activeLearner,
    basePath,
    canManageLearners,
    isAuthenticated,
    logout,
    navigateToLogin,
    viewerName,
    viewerRoleLabel,
  } = useKangurParentDashboardRuntime();
  const handleGoHome = (): void => {
    router.push(getKangurHomeHref(basePath));
  };
  const handleGoToProfile = (): void => {
    router.push(createPageUrl('LearnerProfile', basePath));
  };

  if (!isAuthenticated) {
    return (
      <KangurPageIntroCard
        accent='indigo'
        className='mx-auto w-full max-w-2xl'
        description='Ten widok pokazuje prywatne postepy ucznia, wiec wymaga konta rodzica. Jesli go jeszcze nie masz, zaloz je bez opuszczania Kangura.'
        headingAs='h1'
        onBack={handleGoHome}
        testId='kangur-parent-dashboard-hero'
        title='Panel Rodzica / Nauczyciela'
      >
        <div className='grid w-full gap-3 sm:flex sm:w-auto sm:flex-row'>
          <KangurButton
            className='w-full sm:w-auto'
            onClick={() => {
              navigateToLogin();
            }}
            size='lg'
            variant='primary'
            data-doc-id='profile_login'
          >
            <LogIn className='h-5 w-5' />
            Zaloguj sie
          </KangurButton>
          <KangurButton
            asChild
            className='w-full sm:w-auto'
            size='lg'
            variant='surface'
          >
            <button
              onClick={() => {
                navigateToLogin({ authMode: 'create-account' });
              }}
              type='button'
            >
              Utworz konto rodzica
            </button>
          </KangurButton>
        </div>
      </KangurPageIntroCard>
    );
  }

  if (!canManageLearners) {
    return (
      <KangurPageIntroCard
        accent='slate'
        className='mx-auto w-full max-w-2xl'
        description='Ten widok jest dostepny tylko dla konta rodzica, ktore zarzadza profilami uczniow.'
        headingAs='h1'
        onBack={handleGoToProfile}
        testId='kangur-parent-dashboard-hero'
        title='Panel Rodzica'
      >
        <KangurButton
          className='w-full sm:w-auto'
          onClick={handleGoToProfile}
          size='lg'
          variant='primary'
          data-doc-id='top_nav_profile'
        >
          Wroc do profilu ucznia
        </KangurButton>
      </KangurPageIntroCard>
    );
  }

  return (
    <KangurPageIntroCard
      accent='indigo'
      className='mx-auto w-full max-w-2xl'
      description={
        <>
          Rola: <span className='font-semibold text-slate-700'>{viewerRoleLabel}</span>. Konto
          wlasciciela: <span className='font-semibold text-slate-700'>{viewerName}</span>. Wybrany
          uczen:{' '}
          <span className='font-semibold text-slate-700'>
            {activeLearner?.displayName ?? 'Brak profilu'}
          </span>
          .
        </>
      }
      headingAs='h1'
      onBack={handleGoToProfile}
      testId='kangur-parent-dashboard-hero'
      title='Panel Rodzica'
    >
      {showActions ? (
        <div className='flex flex-col items-center gap-2'>
          <div className='flex w-full justify-center'>
            <KangurTopNavGroup label='Szybkie akcje rodzica' className='w-full sm:w-auto'>
              <KangurButton asChild size='sm' variant='navigation'>
                <Link href={getKangurHomeHref(basePath)} targetPageKey='Game'>
                  <Home className='h-4 w-4' /> Gra
                </Link>
              </KangurButton>
              <KangurButton asChild size='sm' variant='navigation'>
                <Link href={createPageUrl('Lessons', basePath)} targetPageKey='Lessons'>
                  <BookOpen className='h-4 w-4' /> Lekcje
                </Link>
              </KangurButton>
              <KangurButton asChild size='sm' variant='navigation'>
                <Link href={createPageUrl('LearnerProfile', basePath)} targetPageKey='LearnerProfile'>
                  <UserRound className='h-4 w-4' /> Profil
                </Link>
              </KangurButton>
              <KangurButton asChild size='sm' variant='navigationActive'>
                <Link
                  href={createPageUrl('ParentDashboard', basePath)}
                  targetPageKey='ParentDashboard'
                >
                  <LayoutGrid className='h-4 w-4' /> Rodzic
                </Link>
              </KangurButton>
            </KangurTopNavGroup>
          </div>
          <KangurButton
            onClick={() => logout(false)}
            size='sm'
            type='button'
            variant='ghost'
            data-doc-id='profile_logout'
          >
            <LogOut className='h-4 w-4' /> Wyloguj
          </KangurButton>
        </div>
      ) : null}
    </KangurPageIntroCard>
  );
}
