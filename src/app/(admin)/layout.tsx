import { redirect } from 'next/navigation';
import { JSX } from 'react';

import { AdminLayout } from '@/features/admin/layout/AdminLayout';
import { auth, getUserPreferences } from '@/features/auth/server';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';

export const dynamic = 'force-dynamic';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  let initialMenuCollapsed = false;
  let session = null;
  try {
    session = await auth();
    if (!session?.user?.id) {
      redirect('/auth/signin');
    }
    if (session.user.accountDisabled || session.user.accountBanned) {
      redirect('/auth/signin?error=AccountDisabled');
    }
    try {
      const preferences = await getUserPreferences(session.user.id);
      if (typeof preferences.adminMenuCollapsed === 'boolean') {
        initialMenuCollapsed = preferences.adminMenuCollapsed;
      }
    } catch {
      // Fallback to cookie-derived value when preferences are unavailable.
    }
  } catch {
    redirect('/auth/signin');
  }
  return (
    <SettingsStoreProvider mode="admin">
      <AdminLayout session={session} initialMenuCollapsed={initialMenuCollapsed}>
        {children}
      </AdminLayout>
    </SettingsStoreProvider>
  );
}
