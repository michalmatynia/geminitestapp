'use client';

import { BookOpen, Home, LayoutGrid } from 'lucide-react';
import Link from 'next/link';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';
import {
  KangurButton,
  KangurPageTopBar,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameNavigationWidget(): React.JSX.Element {
  const { basePath, handleHome, logout, navigateToLogin, screen, user } = useKangurGameRuntime();

  return (
    <KangurPageTopBar
      contentClassName='justify-center'
      left={
        <KangurTopNavGroup>
          <KangurButton
            onClick={handleHome}
            size='md'
            variant={screen === 'home' ? 'navigationActive' : 'navigation'}
            aria-current={screen === 'home' ? 'page' : undefined}
            data-doc-id='top_nav_home'
          >
            <Home className='h-[22px] w-[22px]' strokeWidth={2.1} />
            <span>Strona glowna</span>
          </KangurButton>
          <KangurButton asChild size='md' variant='navigation' data-doc-id='top_nav_lessons'>
            <Link href={createPageUrl('Lessons', basePath)}>
              <BookOpen className='h-[22px] w-[22px]' strokeWidth={2.1} />
              <span>Lekcje</span>
            </Link>
          </KangurButton>
          <KangurProfileMenu
            basePath={basePath}
            isAuthenticated={Boolean(user)}
            onLogout={() => logout(false)}
            onLogin={navigateToLogin}
            isActive={false}
          />
          {user?.canManageLearners ? (
            <KangurButton
              asChild
              size='md'
              variant='navigation'
              data-doc-id='top_nav_parent_dashboard'
            >
              <Link href={createPageUrl('ParentDashboard', basePath)}>
                <LayoutGrid className='h-[22px] w-[22px]' strokeWidth={2.1} />
                <span>Rodzic</span>
              </Link>
            </KangurButton>
          ) : null}
        </KangurTopNavGroup>
      }
    />
  );
}
