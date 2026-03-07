
import { AuthProvider } from '@/features/auth/';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';

export default function AuthPublicLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <AuthProvider mode='public'>
      <QueryErrorBoundary>{children}</QueryErrorBoundary>
    </AuthProvider>
  );
}
