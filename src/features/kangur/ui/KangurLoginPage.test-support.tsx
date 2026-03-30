/**
 * @vitest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

const {
  signInMock,
  signOutMock,
  sessionMock,
  frontendPublicOwnerMock,
  useKangurAiTutorSessionSyncMock,
  useKangurPageContentEntryMock,
  useKangurRouteNavigatorMock,
  useKangurTutorAnchorMock,
  useOptionalKangurAuthMock,
  useOptionalKangurRoutingMock,
  usePathnameMock,
  useRouterMock,
  useSearchParamsMock,
  clearSessionUserCacheMock,
  useTurnstileMock,
} = vi.hoisted(() => ({
  signInMock: vi.fn().mockResolvedValue({ ok: true, url: '/kangur' }),
  signOutMock: vi.fn().mockResolvedValue(undefined),
  sessionMock: vi.fn(),
  frontendPublicOwnerMock: vi.fn(),
  useKangurAiTutorSessionSyncMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
  useKangurRouteNavigatorMock: vi.fn(),
  useKangurTutorAnchorMock: vi.fn(),
  useOptionalKangurAuthMock: vi.fn(),
  useOptionalKangurRoutingMock: vi.fn(),
  usePathnameMock: vi.fn(),
  useRouterMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  clearSessionUserCacheMock: vi.fn(),
  useTurnstileMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useRouter: useRouterMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock('next-auth/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-auth/react')>();
  return {
    ...actual,
    signIn: signInMock,
    signOut: signOutMock,
    useSession: () => sessionMock(),
  };
});

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  useKangurAiTutorSessionSync: useKangurAiTutorSessionSyncMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: useKangurRouteNavigatorMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTutorAnchor', () => ({
  useKangurTutorAnchor: useKangurTutorAnchorMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: useOptionalKangurAuthMock,
}));

vi.mock('@/features/kangur/ui/FrontendPublicOwnerContext', () => ({
  useOptionalFrontendPublicOwner: () => frontendPublicOwnerMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: () => useOptionalKangurRoutingMock(),
}));

vi.mock('@/features/kangur/services/local-kangur-platform-auth', () => ({
  clearSessionUserCache: clearSessionUserCacheMock,
}));

vi.mock('@/features/kangur/ui/login-page/use-turnstile', () => ({
  useTurnstile: useTurnstileMock,
}));

export const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

export const setupKangurLoginPageTest = async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  signInMock.mockResolvedValue({ ok: true, url: '/kangur' });
  signOutMock.mockResolvedValue(undefined);
  sessionMock.mockReturnValue({
    data: null,
    status: 'unauthenticated',
  });
  frontendPublicOwnerMock.mockReturnValue(null);
  useOptionalKangurRoutingMock.mockReturnValue(null);
  usePathnameMock.mockReturnValue('/kangur/login');
  useRouterMock.mockReturnValue({ push: vi.fn(), refresh: vi.fn() });
  useSearchParamsMock.mockReturnValue(new URLSearchParams(''));
  useKangurPageContentEntryMock.mockReturnValue({ entry: null });
  useKangurRouteNavigatorMock.mockReturnValue({ push: vi.fn() });
  useOptionalKangurAuthMock.mockReturnValue(null);
  useTurnstileMock.mockReturnValue({ containerRef: { current: null }, isReady: false });

  const { KangurLoginPage } = await import('./KangurLoginPage');
  return KangurLoginPage;
};

export {
  clearSessionUserCacheMock,
  frontendPublicOwnerMock,
  sessionMock,
  signInMock,
  signOutMock,
  useKangurAiTutorSessionSyncMock,
  useKangurPageContentEntryMock,
  useKangurRouteNavigatorMock,
  useKangurTutorAnchorMock,
  useOptionalKangurAuthMock,
  useOptionalKangurRoutingMock,
  usePathnameMock,
  useRouterMock,
  useSearchParamsMock,
  useTurnstileMock,
};
