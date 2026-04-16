import { AuthProvider } from '@/features/auth/public';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';
import { SkipToContentLink } from '@/shared/ui/SkipToContentLink';

export default function AuthPublicLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <AuthProvider mode='public'>
      <>
        <SkipToContentLink />
        <main
          id='kangur-main-content'
          tabIndex={-1}
          className='min-h-screen bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        >
          <QueryErrorBoundary>{children}</QueryErrorBoundary>
        </main>
      </>
    </AuthProvider>
  );
}
