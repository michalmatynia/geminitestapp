import { AuthProvider } from '@/features/auth/';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';

export default function AuthPublicLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <AuthProvider mode='public'>
      <main
        id='app-content'
        tabIndex={-1}
        className='min-h-screen bg-background focus:outline-none'
      >
        <QueryErrorBoundary>{children}</QueryErrorBoundary>
      </main>
    </AuthProvider>
  );
}
