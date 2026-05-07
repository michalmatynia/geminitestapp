'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AdminLayoutProvider } from '@/shared/providers/AdminLayoutProvider';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';
import { SkipToContentLink } from '@/shared/ui/SkipToContentLink';
import { cn } from '@/shared/utils/ui-utils';

import type { ReactNode } from 'react';

const navItems = [
  { href: '/admin/cms', label: 'Overview' },
  { href: '/admin/cms/builder', label: 'Builder' },
  { href: '/admin/cms/pages', label: 'Pages' },
  { href: '/admin/cms/slugs', label: 'Slugs' },
  { href: '/admin/cms/zones', label: 'Zones' },
  { href: '/admin/cms/themes', label: 'Themes' },
] as const;

export function CmsBuilderShell({ children }: { children: ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const isBuilder = pathname === '/admin/cms/builder';

  return (
    <SettingsStoreProvider mode='admin' canReadAdminSettings>
      <AdminLayoutProvider>
        <div className='dark flex h-screen w-full max-w-full flex-col overflow-hidden bg-background text-white'>
          <SkipToContentLink>Skip to CMS builder content</SkipToContentLink>
          <header className='flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4'>
            <Link href='/admin/cms' className='text-sm font-semibold tracking-tight'>
              CMS Builder
            </Link>
            <nav aria-label='CMS Builder navigation' className='flex min-w-0 items-center gap-1'>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin/cms' && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                      isActive && 'bg-muted text-foreground'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>
          <main
            id='cms-builder-content'
            className={cn(
              'min-h-0 flex-1 overflow-y-auto overflow-x-hidden',
              isBuilder ? 'p-0' : 'p-4'
            )}
          >
            {children}
          </main>
        </div>
      </AdminLayoutProvider>
    </SettingsStoreProvider>
  );
}
