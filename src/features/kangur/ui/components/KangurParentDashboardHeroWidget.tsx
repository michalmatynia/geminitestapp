'use client';

import {
  ArrowLeft,
  BookOpen,
  Home,
  LayoutGrid,
  LogIn,
  LogOut,
  UserRound,
} from 'lucide-react';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurGlassPanel,
  KangurIconBadge,
  KangurStatusChip,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import { useKangurParentDashboardRuntime } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';

export function KangurParentDashboardHeroWidget({
  showActions = true,
}: {
  showActions?: boolean;
}): React.JSX.Element {
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

  if (!isAuthenticated) {
    return (
      <KangurGlassPanel
        className='flex w-full flex-col items-center gap-5 text-center'
        padding='xl'
        surface='solid'
        variant='soft'
      >
        <KangurIconBadge
          accent='indigo'
          data-testid='parent-dashboard-auth-icon'
          size='3xl'
        >
          🪪
        </KangurIconBadge>
        <h1 className='text-center text-2xl font-extrabold text-slate-800'>
          Panel Rodzica / Nauczyciela
        </h1>
        <p className='text-center text-sm text-slate-500'>
          Ten widok pokazuje prywatne postepy ucznia, wiec dostep wymaga zalogowanego konta.
        </p>

        <KangurButton
          className='w-full'
          onClick={navigateToLogin}
          size='lg'
          variant='primary'
          data-doc-id='profile_login'
        >
          <LogIn className='h-5 w-5' />
          Zaloguj sie
        </KangurButton>

        <KangurButton asChild size='sm' variant='ghost' data-doc-id='top_nav_home'>
          <Link href={createPageUrl('Game', basePath)} targetPageKey='Game'>
            <ArrowLeft className='h-4 w-4' /> Wroc do gry
          </Link>
        </KangurButton>
      </KangurGlassPanel>
    );
  }

  if (!canManageLearners) {
    return (
      <KangurGlassPanel
        className='flex w-full flex-col items-center gap-5 text-center'
        padding='xl'
        surface='solid'
        variant='soft'
      >
        <KangurIconBadge
          accent='slate'
          data-testid='parent-dashboard-locked-icon'
          size='3xl'
        >
          🔒
        </KangurIconBadge>
        <h1 className='text-center text-2xl font-extrabold text-slate-800'>Panel Rodzica</h1>
        <p className='text-center text-sm text-slate-500'>
          Ten widok jest dostepny tylko dla konta rodzica, ktore zarzadza profilami uczniow.
        </p>
        <KangurButton asChild size='lg' variant='primary' data-doc-id='top_nav_profile'>
          <Link href={createPageUrl('LearnerProfile', basePath)} targetPageKey='LearnerProfile'>
            Wroc do profilu ucznia
          </Link>
        </KangurButton>
      </KangurGlassPanel>
    );
  }

  return (
    <KangurGlassPanel className='flex flex-col gap-4' padding='lg' surface='mistStrong' variant='soft'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div className='max-w-2xl'>
          {showActions ? (
            <KangurStatusChip accent='indigo' className='uppercase tracking-wide' size='sm'>
              Rola: {viewerRoleLabel}
            </KangurStatusChip>
          ) : null}
          <h1 className='text-3xl font-extrabold text-slate-800'>Panel Rodzica</h1>
          <p className='mt-1 text-slate-500'>
            Konto wlasciciela: <span className='font-semibold text-slate-700'>{viewerName}</span>.
            Wybrany uczen:{' '}
            <span className='font-semibold text-slate-700'>
              {activeLearner?.displayName ?? 'Brak profilu'}
            </span>
            .
          </p>
        </div>

        {showActions ? (
          <div className='flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end'>
            <KangurTopNavGroup label='Szybkie akcje rodzica' className='w-full sm:w-auto'>
              <KangurButton asChild size='sm' variant='navigation'>
                <Link href={createPageUrl('Game', basePath)} targetPageKey='Game'>
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
      </div>
    </KangurGlassPanel>
  );
}
