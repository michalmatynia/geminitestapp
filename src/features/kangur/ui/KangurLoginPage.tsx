'use client';

import { signOut } from 'next-auth/react';
import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent, type JSX } from 'react';
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

type KangurApiErrorPayload = {
  error?: {
    message?: string;
  };
};

type KangurParentMagicLinkRequestPayload = {
  created?: boolean;
  debug?: {
    magicLinkUrl?: string;
    verificationUrl?: string | null;
  } | null;
  email?: string;
  emailVerified?: boolean;
  hasPassword?: boolean;
  message?: string;
  ok?: boolean;
};

type KangurParentMagicLinkExchangePayload = {
  callbackUrl?: string | null;
  challengeId?: string;
  email?: string;
  emailVerified?: boolean;
  hasPassword?: boolean;
  ok?: boolean;
};

type KangurParentEmailVerifyPayload = {
  callbackUrl?: string | null;
  email?: string;
  emailVerified?: boolean;
  message?: string;
  ok?: boolean;
};

type KangurParentPasswordSetPayload = {
  email?: string;
  hasPassword?: boolean;
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
  challengeId,
  email,
  password,
}: {
  authFlow?: string;
  callbackUrl: string;
  challengeId?: string;
  email: string;
  password?: string;
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
    body: new URLSearchParams(
      Object.entries({
        authFlow: authFlow ?? 'kangur_parent',
        callbackUrl,
        challengeId,
        csrfToken,
        email,
        json: 'true',
        password,
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
  const [pendingParentPasswordSetup, setPendingParentPasswordSetup] = useState<{
    callbackUrl: string;
    email: string;
  } | null>(null);
  const [newParentPassword, setNewParentPassword] = useState('');
  const [newParentPasswordConfirm, setNewParentPasswordConfirm] = useState('');
  const processedMagicLinkTokenRef = useRef<string | null>(null);
  const processedVerificationTokenRef = useRef<string | null>(null);
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

  const handleParentMagicLinkRequest = async (email: string): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch('/api/kangur/auth/parent-magic-link/request', {
        method: 'POST',
        headers: withCsrfHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'same-origin',
        body: JSON.stringify({
          email,
          callbackUrl,
        }),
      });

      if (!response.ok) {
        const message = await readApiErrorMessage(response);
        trackKangurClientEvent('kangur_parent_magic_link_request_failed', {
          callbackUrl,
          statusCode: response.status,
        });
        setError(message ?? 'Nie udalo sie wyslac magicznego linku. Sprobuj ponownie.');
        return;
      }

      const payload =
        (await response.json().catch(() => null)) as KangurParentMagicLinkRequestPayload | null;
      trackKangurClientEvent('kangur_parent_magic_link_requested', {
        callbackUrl,
        created: payload?.created === true,
        emailVerified: payload?.emailVerified === true,
        hasPassword: payload?.hasPassword === true,
      });
      setPassword('');
      setNotice(
        payload?.message?.trim() ||
          'Wyslalismy link do logowania. Sprawdz skrzynke email.'
      );
    } catch {
      trackKangurClientEvent('kangur_parent_magic_link_request_failed', {
        callbackUrl,
        reason: 'network_error',
      });
      setError('Nie udalo sie wyslac magicznego linku. Sprobuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLinkSignIn = async (token: string): Promise<void> => {
    if (!token) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice('Trwa logowanie magicznym linkiem...');

    try {
      await clearLearnerSession();

      const exchangeResponse = await fetch('/api/kangur/auth/parent-magic-link/exchange', {
        method: 'POST',
        headers: withCsrfHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'same-origin',
        body: JSON.stringify({
          token,
        }),
      });

      if (!exchangeResponse.ok) {
        const message = await readApiErrorMessage(exchangeResponse);
        trackKangurClientEvent('kangur_parent_magic_link_exchange_failed', {
          callbackUrl,
          statusCode: exchangeResponse.status,
        });
        setError(message ?? 'Ten magiczny link jest niewazny albo wygasl.');
        setNotice(null);
        return;
      }

      const payload =
        (await exchangeResponse.json().catch(() => null)) as KangurParentMagicLinkExchangePayload | null;

      if (!payload?.email || !payload.challengeId) {
        setError('Ten magiczny link jest niewazny albo wygasl.');
        setNotice(null);
        return;
      }

      const targetCallbackUrl = payload.callbackUrl?.trim() || callbackUrl;
      const result = await signInParentWithCredentials({
        authFlow: 'kangur_parent',
        callbackUrl: targetCallbackUrl,
        challengeId: payload.challengeId,
        email: payload.email,
      });

      if (result.error || !result.ok) {
        trackKangurClientEvent('kangur_parent_magic_link_signin_failed', {
          callbackUrl,
          statusCode: 401,
        });
        setError('Nie udalo sie zalogowac magicznym linkiem. Sprobuj poprosic o nowy link.');
        setNotice(null);
        return;
      }

      trackKangurClientEvent('kangur_parent_magic_link_signin_succeeded', {
        callbackUrl,
      });
      clearOneTimeAuthParams();

      if (payload.hasPassword === false) {
        setIdentifier(payload.email);
        setPassword('');
        setPendingParentPasswordSetup({
          callbackUrl: targetCallbackUrl,
          email: payload.email,
        });
        setNotice(
          'Konto rodzica zostalo utworzone magicznym linkiem. Ustaw teraz haslo, aby pozniej logowac sie tez emailem i haslem.'
        );
        await auth?.checkAppState?.();
        return;
      }

      await finishLogin(result.url ?? targetCallbackUrl);
    } catch {
      trackKangurClientEvent('kangur_parent_magic_link_exchange_failed', {
        callbackUrl,
        reason: 'network_error',
      });
      setError('Nie udalo sie zalogowac magicznym linkiem. Sprobuj ponownie.');
      setNotice(null);
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

  const handleParentPasswordSetup = async (): Promise<void> => {
    if (!pendingParentPasswordSetup) {
      return;
    }

    if (newParentPassword.length === 0) {
      setError('Wpisz haslo rodzica.');
      setNotice(null);
      return;
    }

    if (newParentPassword !== newParentPasswordConfirm) {
      setError('Hasla musza byc identyczne.');
      setNotice(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch('/api/kangur/auth/parent-password', {
        method: 'POST',
        headers: withCsrfHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'same-origin',
        body: JSON.stringify({
          password: newParentPassword,
        }),
      });

      if (!response.ok) {
        const message = await readApiErrorMessage(response);
        trackKangurClientEvent('kangur_parent_password_setup_failed', {
          callbackUrl: pendingParentPasswordSetup.callbackUrl,
          statusCode: response.status,
        });
        setError(message ?? 'Nie udalo sie ustawic hasla rodzica. Sprobuj ponownie.');
        return;
      }

      const payload =
        (await response.json().catch(() => null)) as KangurParentPasswordSetPayload | null;
      trackKangurClientEvent('kangur_parent_password_setup_succeeded', {
        callbackUrl: pendingParentPasswordSetup.callbackUrl,
      });
      setPendingParentPasswordSetup(null);
      setNewParentPassword('');
      setNewParentPasswordConfirm('');
      setNotice(
        payload?.message?.trim() ||
          'Haslo rodzica zostalo ustawione. Od teraz mozesz logowac sie emailem i haslem.'
      );
      await auth?.checkAppState?.();
      await finishLogin(pendingParentPasswordSetup.callbackUrl);
    } catch {
      trackKangurClientEvent('kangur_parent_password_setup_failed', {
        callbackUrl: pendingParentPasswordSetup.callbackUrl,
        reason: 'network_error',
      });
      setError('Nie udalo sie ustawic hasla rodzica. Sprobuj ponownie.');
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

    if (pendingParentPasswordSetup) {
      void handleParentPasswordSetup();
      return;
    }

    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) {
      setError('Wpisz email rodzica albo nick ucznia.');
      return;
    }

    if (loginKind === 'parent') {
      if (!password.trim()) {
        setError('Wpisz haslo rodzica albo wybierz magiczny link.');
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

    if (processedMagicLinkTokenRef.current === magicLinkToken) {
      return;
    }

    processedMagicLinkTokenRef.current = magicLinkToken;
    void handleMagicLinkSignIn(magicLinkToken);
  }, [callbackUrl, isHydrated, magicLinkToken]);

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
      className='overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/97 shadow-[0_30px_120px_rgba(15,23,42,0.22)] backdrop-blur'
      data-testid='kangur-login-shell'
    >
      <div className='p-6 sm:p-8'>
        <form
          className='flex flex-col gap-4'
          data-hydrated={isHydrated ? 'true' : 'false'}
          data-login-kind={loginKind}
          data-testid='kangur-login-form'
          onSubmit={handleSubmit}
        >
          {pendingParentPasswordSetup ? (
            <div className='flex flex-col gap-4 rounded-[1.5rem] border border-indigo-200 bg-indigo-50/70 p-4 text-sm text-slate-700'>
              <div className='space-y-1'>
                <p className='text-base font-bold text-slate-900'>Ustaw haslo rodzica</p>
                <p>
                  Konto <span className='font-semibold text-slate-900'>{pendingParentPasswordSetup.email}</span>{' '}
                  jest juz zalogowane magicznym linkiem. Ustaw haslo, aby przy kolejnym logowaniu
                  moc uzyc takze emaila i hasla.
                </p>
              </div>

              <label className='flex flex-col gap-2 font-semibold text-slate-700'>
                Nowe haslo
                <input
                  autoComplete='new-password'
                  className='rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60'
                  disabled={!isHydrated || isSubmitting}
                  name='newParentPassword'
                  onChange={(event) => setNewParentPassword(event.target.value)}
                  placeholder='Ustaw haslo rodzica'
                  required
                  type='password'
                  value={newParentPassword}
                />
              </label>

              <label className='flex flex-col gap-2 font-semibold text-slate-700'>
                Powtorz haslo
                <input
                  autoComplete='new-password'
                  className='rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60'
                  disabled={!isHydrated || isSubmitting}
                  name='newParentPasswordConfirm'
                  onChange={(event) => setNewParentPasswordConfirm(event.target.value)}
                  placeholder='Powtorz haslo'
                  required
                  type='password'
                  value={newParentPasswordConfirm}
                />
              </label>
            </div>
          ) : (
            <>
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
                  placeholder={loginKind === 'parent' ? 'Haslo rodzica (opcjonalne przy magicznym linku)' : 'Haslo'}
                  required={loginKind !== 'parent'}
                  type='password'
                  value={password}
                />
              </label>
            </>
          )}

          {notice ? <div className='text-sm text-emerald-600'>{notice}</div> : null}
          {error ? <div className='text-sm text-rose-500'>{error}</div> : null}

          {pendingParentPasswordSetup ? (
            <button
              className='inline-flex items-center justify-center rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white shadow transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60'
              disabled={!isHydrated || isSubmitting}
              type='submit'
            >
              {isSubmitting ? 'Zapisywanie...' : 'Ustaw haslo i przejdz dalej'}
            </button>
          ) : loginKind === 'parent' ? (
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
                    setError('Wpisz email rodzica, aby wyslac magiczny link.');
                    setNotice(null);
                    return;
                  }
                  void handleParentMagicLinkRequest(normalizedIdentifier);
                }}
                type='button'
              >
                {isSubmitting ? 'Wysylanie...' : 'Wyslij magiczny link'}
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

          <p className='text-xs leading-5 text-slate-500'>
            {pendingParentPasswordSetup
              ? 'Nowe konto rodzica powstaje po samym emailu. Po pierwszym zalogowaniu magicznym linkiem ustawiasz haslo, aby miec oba sposoby logowania.'
              : 'Email z symbolem @ uruchamia logowanie rodzica. Rodzic moze zalogowac sie haslem albo poprosic o magiczny link na email. Kazdy inny identyfikator traktujemy jako nick ucznia i sprawdzamy, czy sklada sie tylko z liter i cyfr.'}
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
