'use client';

import Link from 'next/link';
import { signIn, signOut } from 'next-auth/react';
import { Suspense, useState, type JSX } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import {
  clearStoredActiveLearnerId,
  setStoredActiveLearnerId,
} from '@/features/kangur/services/kangur-active-learner';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

type KangurLoginPageProps = {
  defaultCallbackUrl: string;
  backHref: string;
};

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

const navigateToCallback = (router: ReturnType<typeof useRouter>, callbackUrl: string): void => {
  const navigationTarget = resolveKangurLoginCallbackNavigation(callbackUrl, window.location.origin);
  if (navigationTarget?.kind === 'router') {
    router.push(navigationTarget.href);
    return;
  }
  window.location.assign(navigationTarget?.href ?? callbackUrl);
};

function KangurLoginPageContent({
  defaultCallbackUrl,
  backHref,
}: KangurLoginPageProps): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || defaultCallbackUrl;
  const [parentEmail, setParentEmail] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [parentError, setParentError] = useState<string | null>(null);
  const [isParentSubmitting, setIsParentSubmitting] = useState(false);
  const [studentNickname, setStudentNickname] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentError, setStudentError] = useState<string | null>(null);
  const [isStudentSubmitting, setIsStudentSubmitting] = useState(false);

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

  const handleParentSignIn = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsParentSubmitting(true);
    setParentError(null);

    try {
      await clearLearnerSession();

      const result = await signIn('credentials', {
        email: parentEmail,
        password: parentPassword,
        callbackUrl,
        redirect: false,
      });

      if (result?.error || !result?.ok) {
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
      navigateToCallback(router, callbackUrl);
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

  const handleStudentSignIn = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
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
      navigateToCallback(router, callbackUrl);
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

      <div className='mx-auto grid max-w-5xl gap-6 lg:grid-cols-2'>
        <section className='rounded-3xl bg-white p-8 shadow-xl'>
          <div className='mb-6'>
            <div className='text-sm font-bold uppercase tracking-[0.2em] text-indigo-500'>
              Rodzic
            </div>
            <h1 className='mt-2 text-3xl font-extrabold text-slate-800'>
              Zaloguj konto rodzica
            </h1>
            <p className='mt-2 text-sm text-slate-500'>
              Uzyj emaila i hasla konta wlasciciela, aby przejsc do panelu i zarzadzac profilami
              uczniow.
            </p>
          </div>

          <form
            className='flex flex-col gap-4'
            data-testid='kangur-login-parent-form'
            onSubmit={(event) => void handleParentSignIn(event)}
          >
            <label className='flex flex-col gap-2 text-sm font-semibold text-slate-700'>
              Email rodzica
              <input
                value={parentEmail}
                onChange={(event) => setParentEmail(event.target.value)}
                placeholder='rodzic@example.com'
                autoComplete='email'
                type='email'
                required
                className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400'
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
                className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400'
              />
            </label>
            {parentError && <div className='text-sm text-rose-500'>{parentError}</div>}
            <button
              type='submit'
              disabled={isParentSubmitting}
              className='inline-flex items-center justify-center rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white shadow hover:bg-indigo-600 disabled:opacity-60'
            >
              {isParentSubmitting ? 'Logowanie...' : 'Zaloguj rodzica'}
            </button>
            <p className='text-xs text-slate-500'>
              Po zalogowaniu rodzic moze tworzyc uczniow, nadawac im nicki i hasla, a konto email
              pozostaje wlascicielem wszystkich profili.
            </p>
          </form>
        </section>

        <section className='rounded-3xl bg-slate-900 p-8 text-white shadow-xl'>
          <div className='mb-6'>
            <div className='text-sm font-bold uppercase tracking-[0.2em] text-sky-300'>Uczen</div>
            <h2 className='mt-2 text-3xl font-extrabold'>Zaloguj profil ucznia</h2>
            <p className='mt-2 text-sm text-slate-300'>
              Uczen nie uzywa emaila. Loguje sie nickiem i haslem nadanym przez rodzica.
            </p>
          </div>

          <form
            className='flex flex-col gap-4'
            data-testid='kangur-login-student-form'
            onSubmit={(event) => void handleStudentSignIn(event)}
          >
            <label className='flex flex-col gap-2 text-sm font-semibold text-slate-200'>
              Nick ucznia
              <input
                value={studentNickname}
                onChange={(event) => setStudentNickname(event.target.value)}
                placeholder='nick-ucznia'
                autoComplete='username'
                required
                className='rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-400'
              />
            </label>
            <label className='flex flex-col gap-2 text-sm font-semibold text-slate-200'>
              Haslo
              <input
                type='password'
                value={studentPassword}
                onChange={(event) => setStudentPassword(event.target.value)}
                placeholder='Haslo ucznia'
                autoComplete='current-password'
                required
                className='rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-400'
              />
            </label>
            {studentError && <div className='text-sm text-rose-300'>{studentError}</div>}
            <button
              type='submit'
              disabled={isStudentSubmitting}
              className='rounded-2xl bg-sky-400 px-4 py-3 text-sm font-bold text-slate-900 shadow hover:bg-sky-300 disabled:opacity-60'
            >
              {isStudentSubmitting ? 'Logowanie...' : 'Zaloguj ucznia'}
            </button>
          </form>

          <Link href={backHref} className='mt-6 inline-flex text-sm text-slate-300 hover:text-white'>
            Wroc do Kangura
          </Link>
        </section>
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
