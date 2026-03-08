'use client';

import { signOut } from 'next-auth/react';
import { Suspense, useEffect, useMemo, useState, type FormEvent, type JSX } from 'react';
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
  callbackUrl,
  email,
  password,
}: {
  callbackUrl: string;
  email: string;
  password: string;
}): Promise<{ error?: string; ok: boolean; url?: string }> => {
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
    body: new URLSearchParams({
      callbackUrl,
      csrfToken,
      email,
      json: 'true',
      password,
    }),
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

function KangurLoginPageContent({
  callbackUrl: callbackUrlProp,
  defaultCallbackUrl,
  onClose,
}: KangurLoginPageProps): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useOptionalKangurAuth();
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
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loginKind = resolveKangurLoginKind(identifier);

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
        });
        setError('Nie udalo sie zalogowac rodzica. Sprawdz email i haslo.');
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
      void handleParentSignIn(normalizedIdentifier);
      return;
    }

    void handleStudentSignIn(normalizedIdentifier);
  };

  const helperCopy =
    loginKind === 'parent'
      ? 'Wykryto email rodzica. Zalogujemy konto wlasciciela i odswiezymy biezacy widok.'
      : loginKind === 'student'
        ? 'Wykryto nick ucznia. Nick moze zawierac tylko litery i cyfry.'
        : 'Wpisz email rodzica albo alfanumeryczny nick ucznia. Haslo jest wspolne dla wybranego konta.';

  return (
    <div
      className='overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/97 shadow-[0_30px_120px_rgba(15,23,42,0.22)] backdrop-blur'
      data-testid='kangur-login-shell'
    >
      <div className='border-b border-slate-200 bg-slate-50/90 px-6 py-6 sm:px-8'>
        <p className='text-sm font-bold uppercase tracking-[0.24em] text-indigo-500'>Kangur</p>
        <h1 className='mt-3 pr-20 text-3xl font-extrabold text-slate-900 sm:text-[2rem]'>
          Zaloguj sie przez jeden wspolny formularz
        </h1>
        <p className='mt-3 max-w-2xl text-sm leading-6 text-slate-600'>
          Rodzic loguje sie emailem. Uczen loguje sie swoim nickiem bez znakow specjalnych.
          Formularz sam rozpoznaje, ktore konto sprawdzic.
        </p>
      </div>

      <div className='p-6 sm:p-8'>
        <div className='mb-6 rounded-3xl border border-indigo-100 bg-indigo-50/85 px-4 py-4'>
          <p className='text-sm font-bold text-slate-900'>Jedno logowanie, dwa typy kont</p>
          <p className='mt-1 text-sm leading-6 text-slate-600'>{helperCopy}</p>
        </div>

        <form
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
              className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60'
              disabled={!isHydrated || isSubmitting}
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
              className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60'
              disabled={!isHydrated || isSubmitting}
              name='password'
              onChange={(event) => setPassword(event.target.value)}
              placeholder='Haslo'
              required
              type='password'
              value={password}
            />
          </label>

          {error ? <div className='text-sm text-rose-500'>{error}</div> : null}

          <button
            className='inline-flex items-center justify-center rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white shadow transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60'
            disabled={!isHydrated || isSubmitting}
            type='submit'
          >
            {isSubmitting ? 'Logowanie...' : 'Zaloguj sie'}
          </button>

          <p className='text-xs leading-5 text-slate-500'>
            Email z symbolem @ uruchamia logowanie rodzica. Kazdy inny identyfikator traktujemy
            jako nick ucznia i sprawdzamy, czy sklada sie tylko z liter i cyfr.
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
