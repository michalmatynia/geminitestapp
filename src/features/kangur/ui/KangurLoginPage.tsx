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
  parentAuthMode?: KangurParentAuthMode;
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
type KangurParentAuthMode = 'sign-in' | 'create-account';

const KANGUR_LEARNER_LOGIN_PATTERN = /^[a-zA-Z0-9]+$/;
const KANGUR_PARENT_AUTH_MODE_PARAM = 'authMode';

const resolveKangurParentAuthMode = (
  value: string | null | undefined
): KangurParentAuthMode => (value?.trim().toLowerCase() === 'create-account' ? 'create-account' : 'sign-in');

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
  parentAuthMode: parentAuthModeProp,
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
  const requestedParentAuthMode =
    parentAuthModeProp ??
    resolveKangurParentAuthMode(searchParams.get(KANGUR_PARENT_AUTH_MODE_PARAM));
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdParentEmail, setCreatedParentEmail] = useState<string | null>(null);
  const [parentAuthMode, setParentAuthMode] = useState<KangurParentAuthMode>(
    requestedParentAuthMode
  );
  const [verificationDebugUrl, setVerificationDebugUrl] = useState<string | null>(null);
  const processedVerificationTokenRef = useRef<string | null>(null);
  const loginKind = resolveKangurLoginKind(identifier);
  const isParentFlowVisible = loginKind !== 'student';
  const visibleNotice = createdParentEmail ? null : notice;
  const createAccountConfirmationDetail =
    notice?.trim() || 'Kliknij link potwierdzajacy w emailu. Potem zalogujesz sie tym samym emailem i haslem.';
  const helperText =
    isParentFlowVisible && parentAuthMode === 'create-account'
      ? createdParentEmail
        ? null
        : 'Po potwierdzeniu emaila zalogujesz sie tym samym emailem i haslem.'
      : 'Tryb rodzica wybierasz przyciskami na gorze. Kazdy identyfikator bez symbolu @ traktujemy jako nick ucznia i sprawdzamy, czy sklada sie tylko z liter i cyfr.';
  const formDescribedBy = [helperText ? helperTextId : null, visibleNotice ? noticeId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setParentAuthMode(requestedParentAuthMode);
  }, [requestedParentAuthMode]);

  useEffect(() => {
    if (loginKind !== 'student') {
      return;
    }

    setParentAuthMode('sign-in');
    setCreatedParentEmail(null);
    setNotice(null);
    setVerificationDebugUrl(null);
  }, [loginKind]);

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
    setCreatedParentEmail(null);
    setVerificationDebugUrl(null);

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
    setCreatedParentEmail(null);
    setVerificationDebugUrl(null);

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
      const debugVerificationUrl = payload?.debug?.verificationUrl?.trim();
      trackKangurClientEvent('kangur_parent_account_created', {
        callbackUrl,
        created: payload?.created === true,
        emailVerified: payload?.emailVerified === true,
        hasPassword: payload?.hasPassword === true,
      });
      setPassword('');
      setCreatedParentEmail(email);
      setVerificationDebugUrl(
        debugVerificationUrl && debugVerificationUrl.length > 0 ? debugVerificationUrl : null
      );
      setNotice(
        payload?.created === true
          ? null
          : payload?.message?.trim() || 'To konto czeka na potwierdzenie emaila. Wyslalismy nowy link.'
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

  const handleParentVerificationResend = async (): Promise<void> => {
    if (!createdParentEmail) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/kangur/auth/parent-account/resend', {
        method: 'POST',
        headers: withCsrfHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'same-origin',
        body: JSON.stringify({
          email: createdParentEmail,
          callbackUrl,
        }),
      });

      if (!response.ok) {
        const message = await readApiErrorMessage(response);
        trackKangurClientEvent('kangur_parent_account_resend_failed', {
          callbackUrl,
          statusCode: response.status,
        });
        setError(message ?? 'Nie udalo sie wyslac nowego emaila potwierdzajacego. Sprobuj ponownie.');
        return;
      }

      const payload =
        (await response.json().catch(() => null)) as KangurParentAccountCreatePayload | null;
      const debugVerificationUrl = payload?.debug?.verificationUrl?.trim();
      trackKangurClientEvent('kangur_parent_account_resend_sent', {
        callbackUrl,
        hasPassword: payload?.hasPassword === true,
      });
      setVerificationDebugUrl(
        debugVerificationUrl && debugVerificationUrl.length > 0 ? debugVerificationUrl : null
      );
      setNotice(
        payload?.message?.trim() ||
          'Wyslalismy nowy email potwierdzajacy. Konto rodzica uaktywni sie po weryfikacji adresu.'
      );
    } catch {
      trackKangurClientEvent('kangur_parent_account_resend_failed', {
        callbackUrl,
        reason: 'network_error',
      });
      setError('Nie udalo sie wyslac nowego emaila potwierdzajacego. Sprobuj ponownie.');
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
    setCreatedParentEmail(null);
    setVerificationDebugUrl(null);

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
      setParentAuthMode('sign-in');
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
    setNotice(null);
    setCreatedParentEmail(null);
    setVerificationDebugUrl(null);

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
        setError(
          parentAuthMode === 'create-account'
            ? 'Wpisz haslo rodzica, aby utworzyc konto.'
            : 'Wpisz haslo rodzica.'
        );
        setNotice(null);
        return;
      }

      if (parentAuthMode === 'create-account') {
        void handleParentAccountCreate(normalizedIdentifier);
        return;
      }

      void handleParentSignIn(normalizedIdentifier);
      return;
    }

    if (!password.trim()) {
      setError('Wpisz haslo ucznia.');
      setNotice(null);
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
      className='overflow-hidden rounded-[2rem] border border-white/80 bg-white/97 shadow-[0_30px_120px_rgba(15,23,42,0.22)] backdrop-blur'
      data-testid='kangur-login-shell'
    >
      <div className='p-6 sm:p-8'>
        <div className='mb-6 rounded-[1.75rem] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_42%),linear-gradient(135deg,rgba(248,250,252,0.98),rgba(241,245,249,0.92))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:p-6'>
          <div className='text-[10px] font-black uppercase tracking-[0.28em] text-slate-500'>
            Kangur access
          </div>
          <div className='mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
            <div className='max-w-2xl'>
              <h1 className='text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-[2rem]' id={titleId}>
                Logowanie Kangur
              </h1>
              <p className='mt-2 text-sm leading-6 text-slate-600'>
                {isParentFlowVisible && parentAuthMode === 'create-account'
                  ? 'Podaj email rodzica i haslo. Wyslemy link potwierdzajacy.'
                  : 'Rodzic loguje sie emailem i haslem. Uczen loguje sie alfanumerycznym nickiem i haslem do gry.'}
              </p>
            </div>
            {isParentFlowVisible ? (
              <div
                className={
                  parentAuthMode === 'create-account'
                    ? 'inline-flex items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700'
                    : 'inline-flex items-center justify-center rounded-full border border-indigo-300 bg-indigo-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-700'
                }
              >
                {parentAuthMode === 'create-account' ? 'Nowe konto rodzica' : 'Logowanie rodzica'}
              </div>
            ) : (
              <div className='inline-flex items-center justify-center rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700'>
                Logowanie ucznia
              </div>
            )}
          </div>
        </div>
        <form
          aria-busy={isSubmitting ? 'true' : 'false'}
          aria-describedby={formDescribedBy || undefined}
          className='flex flex-col gap-4'
          data-hydrated={isHydrated ? 'true' : 'false'}
          data-login-kind={loginKind}
          data-testid='kangur-login-form'
          onSubmit={handleSubmit}
        >
          {isParentFlowVisible ? (
            <div className='grid gap-2 sm:grid-cols-2'>
              <button
                aria-pressed={parentAuthMode === 'sign-in'}
                className={
                  parentAuthMode === 'sign-in'
                    ? 'inline-flex cursor-pointer items-center justify-center rounded-2xl border border-indigo-500 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 shadow-sm transition hover:border-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-60'
                    : 'inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
                }
                disabled={!isHydrated || isSubmitting}
                onClick={() => {
                  setParentAuthMode('sign-in');
                  setError(null);
                  setNotice(null);
                  setCreatedParentEmail(null);
                  setVerificationDebugUrl(null);
                }}
                type='button'
              >
                Mam konto rodzica
              </button>
              <button
                aria-pressed={parentAuthMode === 'create-account'}
                className={
                  parentAuthMode === 'create-account'
                    ? 'inline-flex cursor-pointer items-center justify-center rounded-2xl border border-emerald-500 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm transition hover:border-emerald-600 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60'
                    : 'inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
                }
                disabled={!isHydrated || isSubmitting}
                onClick={() => {
                  setParentAuthMode('create-account');
                  setError(null);
                  setNotice(null);
                  setCreatedParentEmail(null);
                  setVerificationDebugUrl(null);
                }}
                type='button'
              >
                Tworze konto rodzica
              </button>
            </div>
          ) : null}

          <label className='flex flex-col gap-2 text-sm font-semibold text-slate-700'>
            {isParentFlowVisible && parentAuthMode === 'create-account'
              ? 'Email rodzica'
              : 'Email rodzica lub nick ucznia'}
            <input
              autoComplete='username'
              aria-describedby={formDescribedBy || undefined}
              className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60'
              disabled={!isHydrated || isSubmitting}
              id={identifierInputId}
              name='identifier'
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={
                isParentFlowVisible && parentAuthMode === 'create-account'
                  ? 'rodzic@example.com'
                  : 'rodzic@example.com lub janek123'
              }
              required
              type='text'
              value={identifier}
            />
          </label>

          <label className='flex flex-col gap-2 text-sm font-semibold text-slate-700'>
            {isParentFlowVisible && parentAuthMode === 'create-account'
              ? 'Ustaw haslo rodzica'
              : 'Haslo'}
            <input
              autoComplete={
                isParentFlowVisible && parentAuthMode === 'create-account'
                  ? 'new-password'
                  : 'current-password'
              }
              aria-describedby={formDescribedBy || undefined}
              className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60'
              disabled={!isHydrated || isSubmitting}
              id={passwordInputId}
              name='password'
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                isParentFlowVisible && parentAuthMode === 'create-account'
                  ? 'Ustaw haslo rodzica'
                  : loginKind === 'parent'
                    ? 'Haslo rodzica'
                    : 'Haslo'
              }
              required={loginKind === 'student'}
              type='password'
              value={password}
            />
          </label>
          {visibleNotice ? (
            <div
              aria-atomic='true'
              aria-live='polite'
              className='text-sm text-emerald-600'
              id={noticeId}
              role='status'
            >
              {visibleNotice}
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
          {createdParentEmail ? (
            <div
              aria-atomic='true'
              aria-live='polite'
              className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]'
              role='status'
            >
              <p className='font-bold text-slate-900'>Sprawdz skrzynke: {createdParentEmail}</p>
              <p className='mt-1 leading-6'>{createAccountConfirmationDetail}</p>
              <button
                className='mt-3 inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
                disabled={isSubmitting}
                onClick={() => {
                  void handleParentVerificationResend();
                }}
                type='button'
              >
                Wyslij email ponownie
              </button>
            </div>
          ) : null}
          {verificationDebugUrl ? (
            <a
              className='inline-flex w-fit cursor-pointer items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-800'
              href={verificationDebugUrl}
            >
              Potwierdz email teraz
            </a>
          ) : null}

          {isParentFlowVisible ? (
            <button
              className={
                parentAuthMode === 'create-account'
                  ? 'inline-flex cursor-pointer items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60'
                  : 'inline-flex cursor-pointer items-center justify-center rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white shadow transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60'
              }
              disabled={!isHydrated || isSubmitting}
              type='submit'
            >
              {isSubmitting
                ? parentAuthMode === 'create-account'
                  ? 'Tworzenie...'
                  : 'Logowanie...'
                : parentAuthMode === 'create-account'
                  ? 'Utworz konto rodzica'
                  : 'Zaloguj haslem'}
            </button>
          ) : (
            <button
              className='inline-flex cursor-pointer items-center justify-center rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white shadow transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60'
              disabled={!isHydrated || isSubmitting}
              type='submit'
            >
              {isSubmitting ? 'Logowanie...' : 'Zaloguj sie'}
            </button>
          )}

          {helperText ? (
            <p className='text-xs leading-5 text-slate-500' id={helperTextId}>
              {helperText}
            </p>
          ) : null}
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
