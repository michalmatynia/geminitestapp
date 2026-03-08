'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import { setStoredActiveLearnerId } from '@/features/kangur/services/kangur-active-learner';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { resolveKangurLoginCallbackNavigation } from './callback-navigation';

const DEFAULT_CALLBACK_URL = '/kangur';

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

function KangurLoginPageContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || DEFAULT_CALLBACK_URL;
  const [studentLoginName, setStudentLoginName] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentError, setStudentError] = useState<string | null>(null);
  const [isStudentSubmitting, setIsStudentSubmitting] = useState(false);

  const parentSignInHref = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  const handleStudentSignIn = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsStudentSubmitting(true);
    setStudentError(null);

    try {
      const response = await fetch('/api/kangur/auth/learner-signin', {
        method: 'POST',
        headers: withCsrfHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'same-origin',
        body: JSON.stringify({
          loginName: studentLoginName,
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
      <div className='mx-auto grid max-w-5xl gap-6 lg:grid-cols-2'>
        <section className='rounded-3xl bg-white p-8 shadow-xl'>
          <div className='mb-6'>
            <div className='text-sm font-bold uppercase tracking-[0.2em] text-indigo-500'>
              Rodzic
            </div>
            <h1 className='mt-2 text-3xl font-extrabold text-slate-800'>
              Zaloguj konto wlasciciela
            </h1>
            <p className='mt-2 text-sm text-slate-500'>
              Rodzic loguje sie emailem i po zalogowaniu zarzadza profilami uczniow w panelu.
            </p>
          </div>

          <div className='flex flex-col gap-4'>
            <Link
              href={parentSignInHref}
              className='inline-flex items-center justify-center rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white shadow hover:bg-indigo-600'
            >
              Przejdz do logowania rodzica
            </Link>
            <p className='text-xs text-slate-500'>
              Po zalogowaniu rodzic moze tworzyc uczniow, nadawac im loginy i hasla, a konto email
              pozostaje wlascicielem wszystkich profili.
            </p>
          </div>
        </section>

        <section className='rounded-3xl bg-slate-900 p-8 text-white shadow-xl'>
          <div className='mb-6'>
            <div className='text-sm font-bold uppercase tracking-[0.2em] text-sky-300'>Uczen</div>
            <h2 className='mt-2 text-3xl font-extrabold'>Zaloguj profil ucznia</h2>
            <p className='mt-2 text-sm text-slate-300'>
              Uczen nie uzywa emaila. Loguje sie loginem i haslem nadanym przez rodzica.
            </p>
          </div>

          <form
            className='flex flex-col gap-4'
            onSubmit={(event) => void handleStudentSignIn(event)}
          >
            <input
              value={studentLoginName}
              onChange={(event) => setStudentLoginName(event.target.value)}
              placeholder='Login ucznia'
              autoComplete='username'
              className='rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-400'
            />
            <input
              type='password'
              value={studentPassword}
              onChange={(event) => setStudentPassword(event.target.value)}
              placeholder='Haslo ucznia'
              autoComplete='current-password'
              className='rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-400'
            />
            {studentError && <div className='text-sm text-rose-300'>{studentError}</div>}
            <button
              type='submit'
              disabled={isStudentSubmitting}
              className='rounded-2xl bg-sky-400 px-4 py-3 text-sm font-bold text-slate-900 shadow hover:bg-sky-300 disabled:opacity-60'
            >
              {isStudentSubmitting ? 'Logowanie...' : 'Zaloguj ucznia'}
            </button>
          </form>

          <Link href='/kangur' className='mt-6 inline-flex text-sm text-slate-300 hover:text-white'>
            Wroc do Kangura
          </Link>
        </section>
      </div>
    </div>
  );
}

export default function KangurLoginPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div className='sr-only'>Ladowanie logowania Kangur...</div>}>
      <KangurLoginPageContent />
    </Suspense>
  );
}
