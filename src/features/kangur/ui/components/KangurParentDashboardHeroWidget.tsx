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
import Link from 'next/link';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import {
  KangurButton,
  KangurIconBadge,
  KangurPanel,
  KangurStatusChip,
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
      <KangurPanel
        className='flex w-full flex-col items-center gap-5 text-center'
        padding='xl'
        variant='elevated'
      >
        <KangurIconBadge
          accent='indigo'
          data-testid='parent-dashboard-auth-icon'
          size='3xl'
        >
          🪪
        </KangurIconBadge>
        <h1 className='text-center text-2xl font-extrabold text-gray-800'>
          Panel Rodzica / Nauczyciela
        </h1>
        <p className='text-center text-sm text-gray-500'>
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
          <Link href={createPageUrl('Game', basePath)}>
            <ArrowLeft className='h-4 w-4' /> Wroc do gry
          </Link>
        </KangurButton>
      </KangurPanel>
    );
  }

  if (!canManageLearners) {
    return (
      <KangurPanel
        className='flex w-full flex-col items-center gap-5 text-center'
        padding='xl'
        variant='elevated'
      >
        <KangurIconBadge
          accent='slate'
          data-testid='parent-dashboard-locked-icon'
          size='3xl'
        >
          🔒
        </KangurIconBadge>
        <h1 className='text-center text-2xl font-extrabold text-gray-800'>Panel Rodzica</h1>
        <p className='text-center text-sm text-gray-500'>
          Ten widok jest dostepny tylko dla konta rodzica, ktore zarzadza profilami uczniow.
        </p>
        <KangurButton asChild size='lg' variant='primary' data-doc-id='top_nav_profile'>
          <Link href={createPageUrl('LearnerProfile', basePath)}>Wroc do profilu ucznia</Link>
        </KangurButton>
      </KangurPanel>
    );
  }

  return (
    <KangurPanel className='flex flex-col gap-4' padding='lg' variant='soft'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div>
          <KangurStatusChip accent='indigo' className='uppercase tracking-wide' size='sm'>
            Rola: {viewerRoleLabel}
          </KangurStatusChip>
          <h1 className='mt-3 text-3xl font-extrabold text-gray-800'>Panel Rodzica</h1>
          <p className='mt-1 text-gray-500'>
            Konto wlasciciela: <span className='font-semibold text-gray-700'>{viewerName}</span>.
            Wybrany uczen:{' '}
            <span className='font-semibold text-gray-700'>
              {activeLearner?.displayName ?? 'Brak profilu'}
            </span>
            .
          </p>
        </div>

        {showActions ? (
          <div className='flex flex-wrap gap-2'>
            <KangurButton asChild size='sm' variant='secondary'>
              <Link href={createPageUrl('Game', basePath)}>
                <Home className='h-4 w-4' /> Gra
              </Link>
            </KangurButton>
            <KangurButton asChild size='sm' variant='secondary'>
              <Link href={createPageUrl('Lessons', basePath)}>
                <BookOpen className='h-4 w-4' /> Lekcje
              </Link>
            </KangurButton>
            <KangurButton asChild size='sm' variant='secondary'>
              <Link href={createPageUrl('LearnerProfile', basePath)}>
                <UserRound className='h-4 w-4' /> Profil
              </Link>
            </KangurButton>
            <KangurButton asChild size='sm' variant='secondary'>
              <Link href={createPageUrl('ParentDashboard', basePath)}>
                <LayoutGrid className='h-4 w-4' /> Dashboard
              </Link>
            </KangurButton>
            <KangurButton
              onClick={() => logout(false)}
              size='sm'
              variant='ghost'
              data-doc-id='profile_logout'
            >
              <LogOut className='h-4 w-4' /> Wyloguj
            </KangurButton>
          </div>
        ) : null}
      </div>
    </KangurPanel>
  );
}
