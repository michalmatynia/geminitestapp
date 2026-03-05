import { pagesConfig } from '@/features/kangur/legacy/pages.config';
import PageNotFound from '@/features/kangur/legacy/lib/PageNotFound';
import { AuthProvider, useAuth } from '@/features/kangur/legacy/lib/AuthContext';
import UserNotRegisteredError from '@/features/kangur/legacy/components/UserNotRegisteredError';
import { resolveKangurPageKey } from '@/features/kangur/config/routing';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;

const AuthenticatedApp = ({ pageKey, requestedPath }) => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className='fixed inset-0 flex items-center justify-center'>
        <div className='w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin'></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  const resolvedPageKey = resolveKangurPageKey(pageKey, Pages, mainPageKey);
  if (!resolvedPageKey) {
    return <PageNotFound requestedPath={requestedPath} />;
  }

  const ResolvedPage = Pages[resolvedPageKey];
  return (
    <LayoutWrapper currentPageName={resolvedPageKey}>
      <ResolvedPage />
    </LayoutWrapper>
  );
};

function App({ pageKey, requestedPath }) {
  return (
    <AuthProvider>
      <AuthenticatedApp pageKey={pageKey} requestedPath={requestedPath} />
    </AuthProvider>
  );
}

export default App;
