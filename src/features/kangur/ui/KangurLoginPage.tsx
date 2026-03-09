'use client';

import { signOut } from 'next-auth/react';
import {
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type JSX,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import {
  clearStoredActiveLearnerId,
  setStoredActiveLearnerId,
} from '@/features/kangur/services/kangur-active-learner';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

type KangurLoginPageProps = {
  callbackUrl?: string;
  defaultCallbackUrl: string;
  onClose?: () => void;
};

type KangurCredentialsCallbackPayload = {
  error?: string;
  url?: string;
};

type KangurVerifyCredentialsPayload = {
  challengeId?: string;
  code?: string;
  message?: string;
  mfaRequired?: boolean;
  ok?: boolean;
};

type KangurApiErrorPayload = {
  error?: {
    message?: string;
  };
};

type KangurParentAccountCreatePayload = {
  created?: boolean;
  debug?: {
    verificationUrl?: string;
  } | null;
  email?: string;
  emailVerified?: boolean;
  hasPassword?: boolean;
  message?: string;
  ok?: boolean;
};

type KangurParentEmailVerifyPayload = {
  callbackUrl?: string | null;
  email?: string;
  emailVerified?: boolean;
  message?: string;
  ok?: boolean;
};

type KangurLoginKind = 'parent' | 'student' | 'unknown';

const KANGUR_LEARNER_LOGIN_PATTERN = /^[a-zA-Z0-9]+$/;

export const resolveKangurLoginCallbackNavigation = (
  callbackUrl: string,
  currentOrigin: string
): { kind: 'router' | 'location'; href: string } | null => {
  const trimmed = callbackUrl.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('/')) {
    return { kind: 'router', href: trimmed };
  }

  try {
    const parsed = new URL(trimmed, currentOrigin);
    if (parsed.origin === currentOrigin) {
      return { kind: 'router', href: `${parsed.pathname}${parsed.search}${parsed.hash}` };
    }
  } catch {
    return { kind: 'location', href: trimmed };
  }

  return { kind: 'location', href: trimmed };
};

export const resolveKangurLoginKind = (identifier: string): KangurLoginKind => {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return 'unknown';
  }
  return trimmed.includes('@') ? 'parent' : 'student';
};

const signInParentWithCredentials = async ({
  authFlow,
  callbackUrl,
  email,
  password,
}: {
  authFlow?: string;
  callbackUrl: string;
  email: string;
  password: string;
}): Promise<{ error?: string; message?: string; ok: boolean; url?: string }> => {
  const verifyResponse = await fetch('/api/auth/verify-credentials', {
    method: 'POST',
    headers: withCsrfHeaders({
      'Content-Type': 'application/json',
    }),
    credentials: 'same-origin',
    body: JSON.stringify({
      authFlow: authFlow ?? 'kangur_parent',
      email,
      password,
    }),
  });
  const verifyPayload =
    (await verifyResponse.json().catch(() => null)) as KangurVerifyCredentialsPayload | null;

  if (!verifyResponse.ok || verifyPayload?.ok !== true || !verifyPayload?.challengeId) {
    return {
      error: verifyPayload?.code ?? 'credentials_verify_failed',
      message: verifyPayload?.message,
      ok: false,
    };
  }

  if (verifyPayload.mfaRequired) {
    return {
      error: 'MFA_REQUIRED',
      message: verifyPayload.message,
      ok: false,
    };
  }

  const csrfResponse = await fetch('/api/auth/csrf', {
    credentials: 'same-origin',
  });
  const csrfPayload = (await csrfResponse.json().catch(() => null)) as { csrfToken?: string } | null;
  const csrfToken = csrfPayload?.csrfToken?.trim();

  if (!csrfResponse.ok || !csrfToken) {
    return { error: 'csrf_unavailable', ok: false };
  }

  const response = await fetch('/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    credentials: 'same-origin',
    body: new URLSearchParams(
      Object.entries({
        authFlow: authFlow ?? 'kangur_parent',
        callbackUrl,
        challengeId: verifyPayload.challengeId,
        csrfToken,
        email,
        json: 'true',
      }).reduce<Record<string, string>>((acc, [key, value]) => {
        if (typeof value === 'string' && value.length > 0) {
          acc[key] = value;
        }
        return acc;
      }, {})
    ),
  });

  const payload = (await response.json().catch(() => null)) as KangurCredentialsCallbackPayload | null;
  if (!response.ok || payload?.error) {
    return {
      error: payload?.error ?? 'credentials_callback_failed',
      ok: false,
      url: payload?.url,
    };
  }

  return {
    ok: true,
    url: payload?.url,
  };
};

const getParentSignInErrorMessage = (errorCode?: string, fallbackMessage?: string): string => {
  switch (errorCode) {
    case 'EMAIL_UNVERIFIED':
      return 'Potwierdz email rodzica, zanim sie zalogujesz. Sprawdz skrzynke i kliknij link potwierdzajacy.';
    case 'MFA_REQUIRED':
      return 'To konto wymaga dodatkowej weryfikacji. Zaloguj sie przez glowny ekran konta.';
    case 'EMAIL_LOCKED':
    case 'IP_RATE_LIMIT':
      return 'Za duzo prob logowania. Sprobuj ponownie za chwile.';
    case 'ACCOUNT_BANNED':
    case 'ACCOUNT_DISABLED':
      return 'To konto rodzica jest niedostepne.';
    default:
      return fallbackMessage?.trim() || 'Nie udalo sie zalogowac rodzica. Sprawdz email i haslo.';
  }
};

const readApiErrorMessage = async (response: Response): Promise<string | null> => {
  const payload = (await response.json().catch(() => null)) as KangurApiErrorPayload | null;
  const message = payload?.error?.message?.trim();
  return message && message.length > 0 ? message : null;
};

const clearOneTimeAuthParams = (): void => {
  const url = new URL(window.location.href);
  let changed = false;

  for (const param of ['magicLinkToken', 'verifyEmailToken']) {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      changed = true;
    }
  }

  if (!changed) {
    return;
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  try {
    window.history.replaceState(window.history.state, '', nextUrl);
  } catch {
    // Ignore history rewrite failures; the tokens are still single-use server-side.
  }
};

function KangurLoginPageContent({
  callbackUrl: callbackUrlProp,
  defaultCallbackUrl,
  onClose,
}: KangurLoginPageProps): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useOptionalKangurAuth();
  const titleId = useId();
  const identifierInputId = useId();
  const passwordInputId = useId();
  const helperTextId = useId();
  const noticeId = useId();
  const errorId = useId();
  const callbackUrl = useMemo(() => {
    const explicitCallbackUrl = callbackUrlProp?.trim();
    if (explicitCallbackUrl) {
      return explicitCallbackUrl;
    }

    const searchCallbackUrl = searchParams.get('callbackUrl')?.trim();
    if (searchCallbackUrl) {
      return searchCallbackUrl;
    }

    return defaultCallbackUrl;
  }, [callbackUrlProp, defaultCallbackUrl, searchParams]);
  const magicLinkToken = searchParams.get('magicLinkToken')?.trim() ?? '';
  const verifyEmailToken = searchParams.get('verifyEmailToken')?.trim() ?? '';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const processedVerificationTokenRef = useRef<string | null>(null);
  const loginKind = resolveKangurLoginKind(identifier);
  const formDescribedBy = [helperTextId, notice ? noticeId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const clearLearnerSession = async (): Promise<void> => {
    clearStoredActiveLearnerId();
    await fetch('/api/kangur/auth/learner-signout', {
      method: 'POST',
      headers: withCsrfHeaders(),
      credentials: 'same-origin',
    }).catch(() => {});
  };

  const clearParentSession = async (): Promise<void> => {
    await signOut({ redirect: false }).catch(() => {});
  };

  const finishLogin = async (targetUrl: string): Promise<void> => {
    const navigationTarget = resolveKangurLoginCallbackNavigation(targetUrl, window.location.origin);
    if (!navigationTarget) {
      router.refresh();
      await auth?.checkAppState?.();
      onClose?.();
      return;
    }

    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (navigationTarget.kind === 'router' && navigationTarget.href === currentHref) {
      router.refresh();
      await auth?.checkAppState?.();
      onClose?.();
      return;
    }

    if (navigationTarget.kind === 'router') {
      onClose?.();
      router.push(navigationTarget.href, { scroll: false });
      return;
    }

    onClose?.();
    window.location.assign(navigationTarget.href);
  };

  const handleParentSignIn = async (email: string): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      await clearLearnerSession();

      const result = await signInParentWithCredentials({
        callbackUrl,
        email,
        password,
      });

      if (result.error || !result.ok) {
        trackKangurClientEvent('kangur_parent_signin_failed', {
          callbackUrl,
          statusCode: 401,
          reason: result.error,
        });
        setError(getParentSignInErrorMessage(result.error, result.message));
        return;
      }

      trackKangurClientEvent('kangur_parent_signin_succeeded', {
        callbackUrl,
      });
      await finishLogin(result.url ?? callbackUrl);
    } catch {
      trackKangurClientEvent('kangur_parent_signin_failed', {
        callbackUrl,
        reason: 'network_error',
      });
      setError('Nie udalo sie zalogowac rodzica. Sprobuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParentAccountCreate = async (email: string): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch('/api/kangur/auth/parent-account/create', {
        method: 'POST',
        headers: withCsrfHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'same-origin',
        body: JSON.stringify({
          email,
          password,
          callbackUrl,
        }),
      });

      if (!response.ok) {
        const message = await readApiErrorMessage(response);
        trackKangurClientEvent('kangur_parent_account_create_failed', {
          callbackUrl,
          statusCode: response.status,
        });
        setError(message ?? 'Nie udalo sie utworzyc konta rodzica. Sprobuj ponownie.');
        return;
      }

      const payload =
        (await response.json().catch(() => null)) as KangurParentAccountCreatePayload | null;
      trackKangurClientEvent('kangur_parent_account_created', {
        callbackUrl,
        created: payload?.created === true,
        emailVerified: payload?.emailVerified === true,
        hasPassword: payload?.hasPassword === true,
      });
      setPassword('');
      setNotice(
        payload?.message?.trim() ||
          (payload?.created === true
            ? 'Konto rodzica zostalo utworzone. Zalogujesz sie po potwierdzeniu emaila.'
            : 'To konto czeka na potwierdzenie emaila. Wyslalismy nowy link potwierdzajacy.')
      );
    } catch {
      trackKangurClientEvent('kangur_parent_account_create_failed', {
        callbackUrl,
        reason: 'network_error',
      });
      setError('Nie udalo sie utworzyc konta rodzica. Sprobuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailVerification = async (token: string): Promise<void> => {
    if (!token) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice('Trwa weryfikacja emaila...');

    try {
      const response = await fetch('/api/kangur/auth/parent-email/verify', {
        method: 'POST',
        headers: withCsrfHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'same-origin',
        body: JSON.stringify({
          token,
        }),
      });

      if (!response.ok) {
        const message = await readApiErrorMessage(response);
        trackKangurClientEvent('kangur_parent_email_verify_failed', {
          callbackUrl,
          statusCode: response.status,
        });
        setError(message ?? 'Ten link weryfikacyjny jest niewazny albo wygasl.');
        setNotice(null);
        return;
      }

      const payload =
        (await response.json().catch(() => null)) as KangurParentEmailVerifyPayload | null;
      trackKangurClientEvent('kangur_parent_email_verified', {
        callbackUrl,
      });
      clearOneTimeAuthParams();
      if (payload?.email) {
        setIdentifier(payload.email);
      }
      setPassword('');
      setNotice(payload?.message?.trim() || 'Email zostal zweryfikowany.');
      await auth?.checkAppState?.();

      if (auth?.isAuthenticated) {
        await finishLogin(payload?.callbackUrl?.trim() || callbackUrl);
      }
    } catch {
      trackKangurClientEvent('kangur_parent_email_verify_failed', {
        callbackUrl,
        reason: 'network_error',
      });
      setError('Nie udalo sie zweryfikowac emaila. Sprobuj ponownie.');
      setNotice(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStudentSignIn = async (loginName: string): Promise<void> => {
    if (!KANGUR_LEARNER_LOGIN_PATTERN.test(loginName)) {
      setError('Nick ucznia moze zawierac tylko litery i cyfry.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await Promise.allSettled([clearParentSession(), clearLearnerSession()]);

      const response = await fetch('/api/kangur/auth/learner-signin', {
        method: 'POST',
        headers: withCsrfHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'same-origin',
        body: JSON.stringify({
          loginName,
          password,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        trackKangurClientEvent('kangur_learner_signin_failed', {
          callbackUrl,
          statusCode: response.status,
        });
        setError(payload?.error?.message || 'Nie udalo sie zalogowac ucznia. Sprawdz login i haslo.');
        return;
      }

      const payload = (await response.json()) as { learnerId?: string };
      setStoredActiveLearnerId(payload.learnerId ?? null);
      trackKangurClientEvent('kangur_learner_signin_succeeded', {
        callbackUrl,
        learnerId: payload.learnerId ?? null,
      });
      await finishLogin(callbackUrl);
    } catch {
      trackKangurClientEvent('kangur_learner_signin_failed', {
        callbackUrl,
        reason: 'network_error',
      });
      setError('Nie udalo sie zalogowac ucznia. Sprobuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) {
      setError('Wpisz email rodzica albo nick ucznia.');
      return;
    }

    if (loginKind === 'parent') {
      if (!password.trim()) {
        setError('Wpisz haslo rodzica.');
        setNotice(null);
        return;
      }
      void handleParentSignIn(normalizedIdentifier);
      return;
    }

    void handleStudentSignIn(normalizedIdentifier);
  };

  useEffect(() => {
    if (!isHydrated || !magicLinkToken) {
      return;
    }

    setNotice(null);
    setError(
      'Logowanie linkiem z emaila nie jest juz dostepne. Zaloguj sie emailem i haslem albo utworz konto.'
    );
    clearOneTimeAuthParams();
  }, [isHydrated, magicLinkToken]);

  useEffect(() => {
    if (!isHydrated || !verifyEmailToken) {
      return;
    }

    if (processedVerificationTokenRef.current === verifyEmailToken) {
      return;
    }

    processedVerificationTokenRef.current = verifyEmailToken;
    void handleEmailVerification(verifyEmailToken);
  }, [auth?.isAuthenticated, callbackUrl, isHydrated, verifyEmailToken]);

  return (
    <div
      aria-labelledby={titleId}
      className='overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/97 shadow-[0_30px_120px_rgba(15,23,42,0.22)] backdrop-blur'
      data-testid='kangur-login-shell'
    >
      <div className='p-6 sm:p-8'>
        <h1 className='sr-only' id={titleId}>
          Logowanie Kangur
        </h1>
        <form
          aria-busy={isSubmitting ? 'true' : 'false'}
          aria-describedby={formDescribedBy || undefined}
          className='flex flex-col gap-4'
          data-hydrated={isHydrated ? 'true' : 'false'}
          data-login-kind={loginKind}
          data-testid='kangur-login-form'
          onSubmit={handleSubmit}
        >
          <label className='flex flex-col gap-2 text-sm font-semibold text-slate-700'>
            Email rodzica lub nick ucznia
            <input
              autoComplete='username'
              aria-describedby={formDescribedBy || undefined}
              className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60'
              disabled={!isHydrated || isSubmitting}
              id={identifierInputId}
              name='identifier'
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder='rodzic@example.com lub janek123'
              required
              type='text'
              value={identifier}
            />
          </label>

          <label className='flex flex-col gap-2 text-sm font-semibold text-slate-700'>
            Haslo
            <input
              autoComplete='current-password'
              aria-describedby={formDescribedBy || undefined}
              className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60'
              disabled={!isHydrated || isSubmitting}
              id={passwordInputId}
              name='password'
              onChange={(event) => setPassword(event.target.value)}
              placeholder={loginKind === 'parent' ? 'Haslo rodzica' : 'Haslo'}
              required={loginKind !== 'parent'}
              type='password'
              value={password}
            />
          </label>

          {notice ? (
            <div
              aria-atomic='true'
              aria-live='polite'
              className='text-sm text-emerald-600'
              id={noticeId}
              role='status'
            >
              {notice}
            </div>
          ) : null}
          {error ? (
            <div
              aria-atomic='true'
              aria-live='assertive'
              className='text-sm text-rose-500'
              id={errorId}
              role='alert'
            >
              {error}
            </div>
          ) : null}

          {loginKind === 'parent' ? (
            <div className='grid gap-3 sm:grid-cols-2'>
              <button
                className='inline-flex items-center justify-center rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white shadow transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60'
                disabled={!isHydrated || isSubmitting}
                type='submit'
              >
                {isSubmitting ? 'Logowanie...' : 'Zaloguj haslem'}
              </button>
              <button
                className='inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
                disabled={!isHydrated || isSubmitting}
                onClick={() => {
                  const normalizedIdentifier = identifier.trim();
                  if (!normalizedIdentifier) {
                    setError('Wpisz email rodzica, aby utworzyc konto.');
                    setNotice(null);
                    return;
                  }
                  if (!password.trim()) {
                    setError('Wpisz haslo rodzica, aby utworzyc konto.');
                    setNotice(null);
                    return;
                  }
                  void handleParentAccountCreate(normalizedIdentifier);
                }}
                type='button'
              >
                {isSubmitting ? 'Tworzenie...' : 'Utworz konto'}
              </button>
            </div>
          ) : (
            <button
              className='inline-flex items-center justify-center rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white shadow transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60'
              disabled={!isHydrated || isSubmitting}
              type='submit'
            >
              {isSubmitting ? 'Logowanie...' : 'Zaloguj sie'}
            </button>
          )}

          <p className='text-xs leading-5 text-slate-500' id={helperTextId}>
            Email z symbolem @ uruchamia logowanie rodzica. Rodzic loguje sie haslem, a nowe konto
            tworzysz emailem i haslem. Po potwierdzeniu emaila rodzic moze sie zalogowac, a AI
            Tutor zostaje odblokowany. Kazdy inny identyfikator traktujemy jako nick ucznia i
            sprawdzamy, czy sklada sie tylko z liter i cyfr.
          </p>
        </form>
      </div>
    </div>
  );
}

export function KangurLoginPage(props: KangurLoginPageProps): JSX.Element {
  return (
    <Suspense fallback={<div className='sr-only'>Ladowanie logowania Kangur...</div>}>
      <KangurLoginPageContent {...props} />
    </Suspense>
  );
}
