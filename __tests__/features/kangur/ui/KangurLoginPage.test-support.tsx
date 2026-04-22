/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

const {
  trackKangurClientEventMock,
  withKangurClientError,
  withKangurClientErrorSync,
  checkAppStateMock,
  locationAssignMock,
  routerPushMock,
  routerRefreshMock,
  signInMock,
  signOutMock,
  useKangurAiTutorSessionSyncMock,
  useOptionalKangurAuthMock,
  useKangurPageContentEntryMock,
  usePathnameMock,
  useRouterMock,
  useSearchParamsMock,
  useTurnstileMock,
} = vi.hoisted(() => ({
  trackKangurClientEventMock: vi.fn(),
  withKangurClientError: globalThis.__kangurClientErrorMocks().withKangurClientError,
  withKangurClientErrorSync: globalThis.__kangurClientErrorMocks().withKangurClientErrorSync,
  checkAppStateMock: vi.fn(),
  locationAssignMock: vi.fn(),
  routerPushMock: vi.fn(),
  routerRefreshMock: vi.fn(),
  signInMock: vi.fn(),
  signOutMock: vi.fn(),
  useKangurAiTutorSessionSyncMock: vi.fn(),
  useOptionalKangurAuthMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
  usePathnameMock: vi.fn(),
  useRouterMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  useTurnstileMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useRouter: useRouterMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock('nextjs-toploader/app', () => ({
  usePathname: usePathnameMock,
  useRouter: useRouterMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock('next-auth/react', () => ({
  signIn: signInMock,
  signOut: signOutMock,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: trackKangurClientEventMock,
  withKangurClientError,
  withKangurClientErrorSync,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: useOptionalKangurAuthMock,
  useOptionalKangurAuthActions: () => useOptionalKangurAuthMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  useKangurAiTutorSessionSync: useKangurAiTutorSessionSyncMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/login-page/use-turnstile', () => ({
  useTurnstile: useTurnstileMock,
}));

const originalLocation = window.location;
const originalCaptchaSiteKey = process.env['NEXT_PUBLIC_KANGUR_PARENT_CAPTCHA_SITE_KEY'];

export const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

export const restoreKangurLoginPageWindowLocation = () => {
  Object.defineProperty(window, 'location', {
    value: originalLocation,
    configurable: true,
  });
  if (originalCaptchaSiteKey === undefined) {
    delete process.env['NEXT_PUBLIC_KANGUR_PARENT_CAPTCHA_SITE_KEY'];
  } else {
    process.env['NEXT_PUBLIC_KANGUR_PARENT_CAPTCHA_SITE_KEY'] = originalCaptchaSiteKey;
  }
};

export const setupKangurLoginPageTest = async () => {
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
  Object.defineProperty(window, 'location', {
    value: {
      ...originalLocation,
      assign: locationAssignMock,
      hash: '',
      href: 'https://example.com/kangur/game',
      origin: 'https://example.com',
      pathname: '/kangur/game',
      search: '',
    },
    configurable: true,
  });
  delete process.env['NEXT_PUBLIC_KANGUR_PARENT_CAPTCHA_SITE_KEY'];
  useRouterMock.mockReturnValue({
    push: routerPushMock,
    refresh: routerRefreshMock,
  });
  usePathnameMock.mockReturnValue('/kangur/login');
  useSearchParamsMock.mockReturnValue(
    new URLSearchParams('callbackUrl=%2Ftests%3Ffocus%3Ddivision')
  );
  signOutMock.mockResolvedValue(undefined);
  signInMock.mockResolvedValue({
    error: undefined,
    ok: true,
    url: '/tests?focus=division',
  });
  checkAppStateMock.mockResolvedValue(undefined);
  useOptionalKangurAuthMock.mockReturnValue({
    checkAppState: checkAppStateMock,
    isAuthenticated: false,
  });
  useKangurPageContentEntryMock.mockReturnValue({
    data: undefined,
    entry: null,
    error: null,
    isError: false,
    isFetched: true,
    isFetching: false,
    isLoading: false,
    isPending: false,
    isSuccess: true,
    refetch: vi.fn(),
    status: 'success',
  });
  useTurnstileMock.mockImplementation(
    ({ enabled, onVerify }: { enabled?: boolean; onVerify: (token: string) => void }) => {
      if (enabled) {
        queueMicrotask(() => onVerify('turnstile-token-1'));
      }
      return {
        containerRef: { current: null },
        isReady: Boolean(enabled),
      };
    }
  );
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url === '/kangur-api/auth/learner-signout') {
        return {
          json: vi.fn().mockResolvedValue({ ok: true }),
          ok: true,
          status: 200,
        };
      }

      if (url === '/api/auth/verify-credentials') {
        return {
          json: vi.fn().mockResolvedValue({
            ok: true,
            challengeId: 'challenge-1',
            mfaRequired: false,
          }),
          ok: true,
          status: 200,
        };
      }

      if (url === '/kangur-api/auth/parent-account/create') {
        return {
          json: vi.fn().mockResolvedValue({
            ok: true,
            email: 'parent@example.com',
            created: true,
            emailVerified: false,
            hasPassword: true,
            retryAfterMs: 60_000,
            debug: {
              verificationUrl:
                'https://example.com/kangur/login?callbackUrl=%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-1',
            },
            message:
              'Sprawdź e-mail rodzica. Konto zostanie utworzone po potwierdzeniu adresu, a AI Tutor odblokuje się po weryfikacji.',
          }),
          ok: true,
          status: 200,
        };
      }

      if (url === '/kangur-api/auth/parent-account/resend') {
        return {
          json: vi.fn().mockResolvedValue({
            ok: true,
            email: 'parent@example.com',
            created: false,
            emailVerified: false,
            hasPassword: true,
            retryAfterMs: 60_000,
            debug: {
              verificationUrl:
                'https://example.com/kangur/login?callbackUrl=%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-2',
            },
            message:
              'Wysłaliśmy nowy e-mail potwierdzający. Konto rodzica uaktywni się po weryfikacji adresu.',
          }),
          ok: true,
          status: 200,
        };
      }

      if (url === '/kangur-api/auth/parent-email/verify') {
        return {
          json: vi.fn().mockResolvedValue({
            ok: true,
            email: 'parent@example.com',
            callbackUrl: '/tests?focus=division',
            emailVerified: true,
            message:
              'E-mail został zweryfikowany. Konto rodzica jest gotowe, AI Tutor jest odblokowany i możesz zalogować się e-mailem oraz hasłem.',
          }),
          ok: true,
          status: 200,
        };
      }

      if (url === '/kangur-api/auth/learner-signin') {
        return {
          json: vi.fn().mockResolvedValue({ learnerId: 'learner-7' }),
          ok: true,
          status: 200,
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    })
  );

  const { KangurLoginPage } = await import('@/features/kangur/ui/KangurLoginPage');
  return KangurLoginPage;
};

export {
  checkAppStateMock,
  locationAssignMock,
  routerPushMock,
  routerRefreshMock,
  signInMock,
  signOutMock,
  trackKangurClientEventMock,
  useKangurAiTutorSessionSyncMock,
  useKangurPageContentEntryMock,
  useOptionalKangurAuthMock,
  usePathnameMock,
  useRouterMock,
  useSearchParamsMock,
  useTurnstileMock,
};
