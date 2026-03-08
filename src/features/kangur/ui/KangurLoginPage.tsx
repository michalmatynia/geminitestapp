'use client';

import { signOut } from 'next-auth/react';
import { Suspense, useEffect, useState, type FormEvent, type JSX } from 'react';
import { useSearchParams } from 'next/navigation';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  clearStoredActiveLearnerId,
  setStoredActiveLearnerId,
} from '@/features/kangur/services/kangur-active-learner';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

type KangurLoginPageProps = {
  defaultCallbackUrl: string;
  backHref: string;
};

type KangurCredentialsCallbackPayload = {
  error?: string;
  url?: string;
};

type KangurLoginMode = 'parent' | 'student';

export const resolveKangurLoginCallbackNavigation = (
  callbackUrl: string,
  currentOrigin: string
): { kind: 'router' | 'location'; href: string } | null => {
  const trimmed = callbackUrl.trim();
  if (!trimmed) return null;
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

const navigateToCallback = (callbackUrl: string): void => {
  const navigationTarget = resolveKangurLoginCallbackNavigation(callbackUrl, window.location.origin);
  window.location.assign(navigationTarget?.href ?? callbackUrl);
};

const signInParentWithCredentials = async ({
  email,
  password,
  callbackUrl,
}: {
  email: string;
  password: string;
  callbackUrl: string;
}): Promise<{ ok: boolean; error?: string; url?: string }> => {
  const csrfResponse = await fetch('/api/auth/csrf', {
    credentials: 'same-origin',
  });
  const csrfPayload = (await csrfResponse.json().catch(() => null)) as { csrfToken?: string } | null;
  const csrfToken = csrfPayload?.csrfToken?.trim();

  if (!csrfResponse.ok || !csrfToken) {
    return { ok: false, error: 'csrf_unavailable' };
  }

  const response = await fetch('/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    credentials: 'same-origin',
    body: new URLSearchParams({
      email,
      password,
      callbackUrl,
      csrfToken,
      json: 'true',
    }),
  });

  const payload = (await response.json().catch(() => null)) as KangurCredentialsCallbackPayload | null;
  if (!response.ok || payload?.error) {
    return {
      ok: false,
      error: payload?.error ?? 'credentials_callback_failed',
      url: payload?.url,
    };
  }

  return {
    ok: true,
    url: payload?.url,
  };
};

function KangurLoginPageContent({
  defaultCallbackUrl,
  backHref,
}: KangurLoginPageProps): JSX.Element {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || defaultCallbackUrl;
  const [isHydrated, setIsHydrated] = useState(false);
  const [loginMode, setLoginMode] = useState<KangurLoginMode>('parent');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [parentError, setParentError] = useState<string | null>(null);
  const [isParentSubmitting, setIsParentSubmitting] = useState(false);
  const [studentNickname, setStudentNickname] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentError, setStudentError] = useState<string | null>(null);
  const [isStudentSubmitting, setIsStudentSubmitting] = useState(false);
  const isParentMode = loginMode === 'parent';
  const isSubmitting = isParentMode ? isParentSubmitting : isStudentSubmitting;
  const isAnySubmitting = isParentSubmitting || isStudentSubmitting;
  const areControlsDisabled = !isHydrated || isAnySubmitting;
  const activeError = isParentMode ? parentError : studentError;

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

  const handleParentSignIn = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    setIsParentSubmitting(true);
    setParentError(null);

    try {
      await clearLearnerSession();

      const result = await signInParentWithCredentials({
        email: parentEmail,
        password: parentPassword,
        callbackUrl,
      });

      if (result.error || !result.ok) {
        trackKangurClientEvent('kangur_parent_signin_failed', {
          statusCode: 401,
          callbackUrl,
        });
        setParentError('Nie udalo sie zalogowac rodzica. Sprawdz email i haslo.');
        return;
      }

      trackKangurClientEvent('kangur_parent_signin_succeeded', {
        callbackUrl,
      });
      navigateToCallback(result.url ?? callbackUrl);
    } catch {
      trackKangurClientEvent('kangur_parent_signin_failed', {
        callbackUrl,
        reason: 'network_error',
      });
      setParentError('Nie udalo sie zalogowac rodzica. Sprobuj ponownie.');
    } finally {
      setIsParentSubmitting(false);
    }
  };

  const handleStudentSignIn = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    setIsStudentSubmitting(true);
    setStudentError(null);

    try {
      await Promise.allSettled([clearParentSession(), clearLearnerSession()]);

      const response = await fetch('/api/kangur/auth/learner-signin', {
        method: 'POST',
        headers: withCsrfHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'same-origin',
        body: JSON.stringify({
          loginName: studentNickname,
          password: studentPassword,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        trackKangurClientEvent('kangur_learner_signin_failed', {
          statusCode: response.status,
          callbackUrl,
        });
        setStudentError(
          payload?.error?.message || 'Nie udalo sie zalogowac ucznia. Sprawdz login i haslo.'
        );
        return;
      }

      const payload = (await response.json()) as { learnerId?: string };
      setStoredActiveLearnerId(payload.learnerId ?? null);
      trackKangurClientEvent('kangur_learner_signin_succeeded', {
        learnerId: payload.learnerId ?? null,
        callbackUrl,
      });
      navigateToCallback(callbackUrl);
    } catch {
      trackKangurClientEvent('kangur_learner_signin_failed', {
        callbackUrl,
        reason: 'network_error',
      });
      setStudentError('Nie udalo sie zalogowac ucznia. Sprobuj ponownie.');
    } finally {
      setIsStudentSubmitting(false);
    }
  };

  const handleLoginModeChange = (nextMode: KangurLoginMode): void => {
    if (nextMode === loginMode || isAnySubmitting) {
      return;
    }

    setParentError(null);
    setStudentError(null);
    setLoginMode(nextMode);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (isParentMode) {
      void handleParentSignIn(event);
      return;
    }

    void handleStudentSignIn(event);
  };

  return (
    <div className='kangur-premium-bg min-h-screen px-4 py-10' data-testid='kangur-login-shell'>
      <div className='mx-auto mb-8 max-w-3xl text-center text-slate-800'>
        <p className='text-sm font-bold uppercase tracking-[0.24em] text-indigo-500'>
          Kangur
        </p>
        <h1 className='mt-3 text-4xl font-extrabold'>Jedno logowanie dla rodzica i ucznia</h1>
        <p className='mt-3 text-sm text-slate-600'>
          Rodzic loguje sie emailem i haslem. Uczen loguje sie nickiem i haslem nadanym przez
          rodzica.
        </p>
      </div>

      <section className='mx-auto max-w-3xl overflow-hidden rounded-[2rem] bg-white/95 shadow-2xl ring-1 ring-slate-200/80 backdrop-blur'>
        <div className='border-b border-slate-200 bg-slate-50/90 p-4 sm:p-5'>
          <div
            role='tablist'
            aria-label='Typ logowania'
            className='grid grid-cols-2 gap-3 rounded-2xl bg-white p-2 shadow-inner shadow-slate-200/60'
          >
            <button
              id='kangur-login-tab-parent'
              type='button'
              role='tab'
              aria-selected={isParentMode}
              aria-controls='kangur-login-panel'
              disabled={areControlsDisabled}
              onClick={() => handleLoginModeChange('parent')}
              className={`rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isParentMode
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Rodzic
            </button>
            <button
              id='kangur-login-tab-student'
              type='button'
              role='tab'
              aria-selected={!isParentMode}
              aria-controls='kangur-login-panel'
              disabled={areControlsDisabled}
              onClick={() => handleLoginModeChange('student')}
              className={`rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isParentMode
                  ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  : 'bg-sky-400 text-slate-900 shadow-lg shadow-sky-100'
              }`}
            >
              Uczen
            </button>
          </div>
        </div>

        <div
          id='kangur-login-panel'
          role='tabpanel'
          aria-labelledby={isParentMode ? 'kangur-login-tab-parent' : 'kangur-login-tab-student'}
          className='p-6 sm:p-8'
        >
          <div className='mb-6'>
            <div
              className={`text-sm font-bold uppercase tracking-[0.2em] ${
                isParentMode ? 'text-indigo-500' : 'text-sky-500'
              }`}
            >
              {isParentMode ? 'Rodzic' : 'Uczen'}
            </div>
            <h2 className='mt-2 text-3xl font-extrabold text-slate-900'>
              {isParentMode ? 'Zaloguj konto rodzica' : 'Zaloguj profil ucznia'}
            </h2>
            <p className='mt-2 text-sm text-slate-500'>
              {isParentMode
                ? 'Uzyj emaila i hasla konta wlasciciela, aby przejsc do panelu i zarzadzac profilami uczniow.'
                : 'Uczen loguje sie nickiem i haslem nadanym przez rodzica. Nie uzywa emaila.'}
            </p>
          </div>

          <div
            className={`mb-6 rounded-3xl border px-4 py-4 ${
              isParentMode
                ? 'border-indigo-100 bg-indigo-50/80'
                : 'border-sky-100 bg-sky-50/80'
            }`}
          >
            <p className='text-sm font-bold text-slate-900'>
              {isParentMode ? 'Logowanie wlasciciela konta' : 'Logowanie profilu ucznia'}
            </p>
            <p className='mt-1 text-sm text-slate-600'>
              {isParentMode
                ? 'To konto zarzadza uczniami, ich nickami i haslami oraz widzi cala historie nauki.'
                : 'To logowanie prowadzi bezposrednio do profilu ucznia i korzysta z danych nadanych przez rodzica.'}
            </p>
          </div>

          <form
            className='flex flex-col gap-4'
            data-testid='kangur-login-form'
            data-hydrated={isHydrated ? 'true' : 'false'}
            data-login-mode={loginMode}
            onSubmit={handleSubmit}
          >
            {isParentMode ? (
              <>
                <label className='flex flex-col gap-2 text-sm font-semibold text-slate-700'>
                  Email rodzica
                  <input
                    value={parentEmail}
                    onChange={(event) => setParentEmail(event.target.value)}
                    placeholder='rodzic@example.com'
                    autoComplete='email'
                    type='email'
                    required
                    disabled={!isHydrated || isSubmitting}
                    className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60'
                  />
                </label>
                <label className='flex flex-col gap-2 text-sm font-semibold text-slate-700'>
                  Haslo
                  <input
                    type='password'
                    value={parentPassword}
                    onChange={(event) => setParentPassword(event.target.value)}
                    placeholder='Haslo rodzica'
                    autoComplete='current-password'
                    required
                    disabled={!isHydrated || isSubmitting}
                    className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60'
                  />
                </label>
              </>
            ) : (
              <>
                <label className='flex flex-col gap-2 text-sm font-semibold text-slate-700'>
                  Nick ucznia
                  <input
                    value={studentNickname}
                    onChange={(event) => setStudentNickname(event.target.value)}
                    placeholder='nick-ucznia'
                    autoComplete='username'
                    required
                    disabled={!isHydrated || isSubmitting}
                    className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60'
                  />
                </label>
                <label className='flex flex-col gap-2 text-sm font-semibold text-slate-700'>
                  Haslo
                  <input
                    type='password'
                    value={studentPassword}
                    onChange={(event) => setStudentPassword(event.target.value)}
                    placeholder='Haslo ucznia'
                    autoComplete='current-password'
                    required
                    disabled={!isHydrated || isSubmitting}
                    className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60'
                  />
                </label>
              </>
            )}

            {activeError && <div className='text-sm text-rose-500'>{activeError}</div>}

            <button
              type='submit'
              disabled={!isHydrated || isSubmitting}
              className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold shadow transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isParentMode
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                  : 'bg-sky-400 text-slate-900 hover:bg-sky-300'
              }`}
            >
              {isSubmitting
                ? 'Logowanie...'
                : isParentMode
                  ? 'Zaloguj rodzica'
                  : 'Zaloguj ucznia'}
            </button>

            <p className='text-xs text-slate-500'>
              {isParentMode
                ? 'Po zalogowaniu rodzic moze tworzyc uczniow, nadawac im nicki i hasla, a konto email pozostaje wlascicielem wszystkich profili.'
                : 'Uczen korzysta z jednego profilu przypisanego do rodzica. Jesli nie zna danych, musi poprosic rodzica o nick i haslo.'}
            </p>
          </form>

          <Link
            href={backHref}
            className='mt-6 inline-flex text-sm text-slate-500 hover:text-slate-900'
            targetPageKey='Game'
          >
            Wroc do Kangura
          </Link>
        </div>
      </section>
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
