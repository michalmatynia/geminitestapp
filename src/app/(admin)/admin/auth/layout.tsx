'use client';

import { AuthProvider } from '@/features/auth/public';

export default function AuthAdminLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <AuthProvider>{children}</AuthProvider>;
}
