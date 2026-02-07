'use client';

import { AuthProvider } from '@/features/auth';

export default function AuthAdminLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <AuthProvider>{children}</AuthProvider>;
}
