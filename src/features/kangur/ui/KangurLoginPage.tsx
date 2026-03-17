'use client';

import { useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getKangurHomeHref } from '@/features/kangur/config/routing';
import { KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS } from '@/features/kangur/settings';
import { useKangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import {
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_STACK_COMPACT_CLASSNAME,
  KANGUR_STACK_RELAXED_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import {
  type KangurAuthMode,
  parseKangurAuthMode,
} from '@/features/kangur/shared/contracts/kangur-auth';
import {
  KANGUR_LEARNER_LOGIN_PATTERN,
  KANGUR_PARENT_AUTH_MODE_PARAM,
  KANGUR_PARENT_CAPTCHA_SITE_KEY,
} from '@/features/kangur/ui/login-page/login-constants';
import {
  KangurLoginPagePropsContext,
  type KangurLoginPageProps,
  useKangurLoginPageProps,
} from '@/features/kangur/ui/login-page/login-context';
import { useLoginLogic, type KangurLoginKind } from '@/features/kangur/ui/login-page/use-login-logic';
import { useTurnstile } from '@/features/kangur/ui/login-page/use-turnstile';
import { LoadingState } from '@/features/kangur/shared/ui';

const DEFAULT_LOGIN_TITLE = 'Zaloguj się';
const DEFAULT_SESSION_TITLE = 'Logowanie do Kangur';
const DEFAULT_SESSION_DESCRIPTION =
  'Rodzic loguje się emailem i hasłem. Uczeń loguje się nickiem i hasłem.';
const CREATE_ACCOUNT_INSTRUCTION =
  'Kliknij link potwierdzający w e-mailu. Potem zalogujesz się tym samym e-mailem i hasłem.';
const EMAIL_UNVERIFIED_NOTICE =
  'Potwierdź e-mail rodzica, zanim się zalogujesz. Możesz też wysłać nowy e-mail potwierdzający.';
const PASSWORD_SETUP_REQUIRED_NOTICE =
  'To starsze konto rodzica nie ma jeszcze hasła. Ustaw hasło poniżej, a wyślemy e-mail potwierdzający.';
const MAGIC_LINK_DEPRECATED_NOTICE =
  'Logowanie linkiem z e-maila nie jest już dostępne. Zaloguj się e-mailem i hasłem albo utwórz konto.';
const INVALID_LEARNER_LOGIN_NOTICE =
  'Nick ucznia może zawierać tylko litery, cyfry i myślniki.';

const parseJsonResponse = async (response: Response): Promise<Record<string, unknown>> => {
  if (!response) return {};
  try {
    if (typeof response.json === 'function') {
      return (await response.json()) as Record<string, unknown>;
    }
  } catch {
    // Ignore parsing issues.
  }
  try {
    const text = await response.text();
    if (!text) return {};
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const resolveLoginKind = (identifier: string, authMode: KangurAuthMode): KangurLoginKind => {
  const trimmed = identifier.trim();
  if (!trimmed) return 'unknown';
  if (authMode === 'create-account') return 'parent';
  return trimmed.includes('@') ? 'parent' : 'student';
};

const formatCooldownLabel = (ms: number): string => {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  if (seconds >= 60 && seconds % 60 === 0) {
    return `${seconds / 60} min`;
  }
  return `${seconds} s`;
};

type VerificationCardState = {
  email: string;
  message?: string | null;
  error?: string | null;
  verificationUrl?: string | null;
};

type VerificationCardProps = VerificationCardState & {
  resendLabel: string;
  resendDisabled: boolean;
  resendHelper?: string | null;
  onResend: () => void;
};

function ParentVerificationCard({
  email,
  message,
  error,
  verificationUrl,
  resendLabel,
  resendDisabled,
  resendHelper,
  onResend,
}: VerificationCardProps): React.JSX.Element {
  return (
    <div className='mt-6 rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm'>
      <div className='text-sm font-semibold text-slate-900'>Sprawdź skrzynkę: {email}</div>
      {message ? (
        <div
          role='status'
          aria-live='polite'
          className='mt-3 text-sm font-medium text-slate-700'
        >
          {message}
        </div>
      ) : null}
      {error ? (
        <div className='mt-3 text-sm font-medium text-rose-600' role='alert'>
          {error}
        </div>
      ) : null}
      {verificationUrl ? (
        <a
          className='mt-4 inline-flex text-sm font-semibold text-indigo-600 underline underline-offset-4 cursor-pointer'
          href={verificationUrl}
          target='_blank'
          rel='noreferrer'
        >
          Potwierdź e-mail teraz
        </a>
      ) : null}
      <div className='mt-4 flex flex-col gap-2'>
        <KangurButton
          type='button'
          variant='ghost'
          size='sm'
          disabled={resendDisabled}
          onClick={onResend}
          className='justify-start px-0'
        >
          {resendLabel}
        </KangurButton>
        {resendHelper ? (
          <div className='text-xs text-slate-500'>{resendHelper}</div>
        ) : null}
      </div>
    </div>
  );
}

export function KangurLoginPageContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const { callbackUrl, defaultCallbackUrl, parentAuthMode } = useKangurLoginPageProps();
  const auth = useOptionalKangurAuth();
  const { isLoading, setIsLoading, successMessage, handleLoginSuccess } = useLoginLogic();
  const loginFormEntry = useKangurPageContentEntry('login-page-form');
  const identifierEntry = useKangurPageContentEntry('login-page-identifier-field');

  const [authMode, setAuthMode] = useState<KangurAuthMode>(parentAuthMode ?? 'sign-in');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [verificationCard, setVerificationCard] = useState<VerificationCardState | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [resendCooldownLabel, setResendCooldownLabel] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const identifierInputRef = useRef<HTMLInputElement>(null);
  const verifyAttemptedRef = useRef(false);
  const resendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useKangurTutorAnchor({
    id: 'kangur-auth-login-form',
    kind: 'login_form',
    ref: formRef,
    surface: 'auth',
    enabled: true,
    priority: 100,
    metadata: {
      label: 'Sekcja logowania',
    },
  });

  useKangurTutorAnchor({
    id: 'kangur-auth-login-identifier-field',
    kind: 'login_identifier_field',
    ref: identifierInputRef,
    surface: 'auth',
    enabled: true,
    priority: 120,
    metadata: {
      label: 'Pole identyfikatora',
    },
  });

  const loginKind = useMemo(
    () => resolveLoginKind(identifier, authMode),
    [identifier, authMode]
  );

  const sessionTitle = loginFormEntry.entry?.title ?? DEFAULT_SESSION_TITLE;
  const sessionDescription = loginFormEntry.entry?.summary ?? DEFAULT_SESSION_DESCRIPTION;

  useKangurAiTutorSessionSync({
    learnerId: null,
    sessionContext: {
      surface: 'auth',
      contentId: 'auth:login:sign-in',
      title: sessionTitle,
      description: sessionDescription,
    },
  });

  const callbackValue = callbackUrl ?? defaultCallbackUrl;
  const verifyEmailToken = searchParams?.get('verifyEmailToken') ?? null;
  const magicLinkToken = searchParams?.get('magicLinkToken') ?? null;

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const handleCaptchaReset = useCallback(() => {
    setCaptchaToken(null);
  }, []);

  const { containerRef: captchaContainerRef } = useTurnstile({
    onVerify: handleCaptchaVerify,
    onError: handleCaptchaReset,
    onExpire: handleCaptchaReset,
  });

  const clearResendCooldown = useCallback(() => {
    if (resendTimerRef.current) {
      clearTimeout(resendTimerRef.current);
      resendTimerRef.current = null;
    }
    setResendCooldownLabel(null);
  }, []);

  const scheduleResendCooldown = useCallback(
    (retryAfterMs?: number | null, options?: { forceDefault?: boolean }) => {
      if (resendTimerRef.current) {
        clearTimeout(resendTimerRef.current);
        resendTimerRef.current = null;
      }

      let nextMs =
        typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs) && retryAfterMs > 0
          ? retryAfterMs
          : null;

      if (!nextMs && options?.forceDefault) {
        nextMs = KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS;
      }

      if (!nextMs) {
        setResendCooldownLabel(null);
        return;
      }

      const label = formatCooldownLabel(nextMs);
      setResendCooldownLabel(label);
      resendTimerRef.current = setTimeout(() => {
        setResendCooldownLabel(null);
        resendTimerRef.current = null;
      }, nextMs);
    },
    []
  );

  const clearVerificationState = useCallback(() => {
    setVerificationCard(null);
    clearResendCooldown();
  }, [clearResendCooldown]);

  useEffect(() => {
    return () => {
      if (resendTimerRef.current) {
        clearTimeout(resendTimerRef.current);
        resendTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (magicLinkToken) {
      setFormError(MAGIC_LINK_DEPRECATED_NOTICE);
      setFormNotice(null);
      return;
    }

    if (!verifyEmailToken || verifyAttemptedRef.current) {
      return;
    }

    verifyAttemptedRef.current = true;

    const verifyEmail = async (): Promise<void> => {
      setIsLoading(true);
      setFormError(null);
      setFormNotice(null);
      clearVerificationState();
      try {
        const response = await fetch('/api/kangur/auth/parent-email/verify', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: verifyEmailToken }),
        });
        const payload = await parseJsonResponse(response);
        if (!response.ok || payload['ok'] !== true) {
          setFormError(
            typeof payload['error'] === 'string'
              ? payload['error']
              : 'Nie udało się potwierdzić e-maila rodzica.'
          );
          return;
        }
        if (typeof payload['email'] === 'string') {
          setIdentifier(payload['email']);
        }
        if (typeof payload['message'] === 'string') {
          setFormNotice(payload['message']);
        }
        setAuthMode('sign-in');
        await auth?.checkAppState?.();
      } catch {
        setFormError('Nie udało się potwierdzić e-maila rodzica.');
      } finally {
        setIsLoading(false);
      }
    };

    void verifyEmail();
  }, [
    auth,
    clearVerificationState,
    magicLinkToken,
    setIsLoading,
    verifyEmailToken,
  ]);

  const handleModeSwitch = (nextMode: KangurAuthMode) => {
    if (nextMode === authMode) return;
    setAuthMode(nextMode);
    setFormError(null);
    setFormNotice(null);
    if (nextMode === 'sign-in') {
      clearVerificationState();
    }
    setCaptchaToken(null);
  };

  const handleCreateAccount = async (): Promise<void> => {
    const email = identifier.trim();
    if (!email || !password.trim()) {
      setFormError('Wypełnij email i hasło.');
      return;
    }

    const captchaRequired = Boolean(KANGUR_PARENT_CAPTCHA_SITE_KEY);
    if (captchaRequired && !captchaToken) {
      setFormError('Uzupełnij weryfikację bezpieczeństwa.');
      return;
    }

    setIsLoading(true);
    setFormError(null);
    setFormNotice(null);
    clearVerificationState();

    try {
      const response = await fetch('/api/kangur/auth/parent-account/create', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          callbackUrl: callbackValue,
          captchaToken: captchaToken ?? undefined,
        }),
      });

      const payload = await parseJsonResponse(response);
      const retryAfterMs =
        typeof payload['retryAfterMs'] === 'number' ? payload['retryAfterMs'] : null;
      const verificationUrl =
        typeof (payload['debug'] as Record<string, unknown> | null | undefined)?.[
          'verificationUrl'
        ] === 'string'
          ? ((payload['debug'] as Record<string, unknown>)['verificationUrl'] as string)
          : null;

      if (response.ok && payload['ok'] === true) {
        setVerificationCard({
          email,
          message: CREATE_ACCOUNT_INSTRUCTION,
          verificationUrl,
        });
        scheduleResendCooldown(retryAfterMs, { forceDefault: true });
        return;
      }

      const isRateLimited = payload['code'] === 'RATE_LIMITED' || response.status === 429;
      if (isRateLimited) {
        setVerificationCard({
          email,
          message: CREATE_ACCOUNT_INSTRUCTION,
          error: typeof payload['error'] === 'string' ? payload['error'] : null,
          verificationUrl,
        });
        scheduleResendCooldown(retryAfterMs, { forceDefault: true });
        return;
      }

      setFormError(
        typeof payload['error'] === 'string'
          ? payload['error']
          : 'Nie udało się utworzyć konta rodzica.'
      );
    } catch {
      setFormError('Wystąpił błąd podczas zakładania konta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (): Promise<void> => {
    if (!verificationCard?.email || resendCooldownLabel) {
      return;
    }

    setIsLoading(true);
    setFormError(null);

    try {
      const response = await fetch('/api/kangur/auth/parent-account/resend', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verificationCard.email,
          callbackUrl: callbackValue,
        }),
      });

      const payload = await parseJsonResponse(response);
      const retryAfterMs =
        typeof payload['retryAfterMs'] === 'number' ? payload['retryAfterMs'] : null;
      const verificationUrl =
        typeof (payload['debug'] as Record<string, unknown> | null | undefined)?.[
          'verificationUrl'
        ] === 'string'
          ? ((payload['debug'] as Record<string, unknown>)['verificationUrl'] as string)
          : verificationCard.verificationUrl ?? null;

      if (response.ok && payload['ok'] === true) {
        setVerificationCard({
          email: verificationCard.email,
          message: typeof payload['message'] === 'string' ? payload['message'] : null,
          error: null,
          verificationUrl,
        });
        scheduleResendCooldown(retryAfterMs, { forceDefault: true });
        return;
      }

      const isRateLimited = payload['code'] === 'RATE_LIMITED' || response.status === 429;
      if (isRateLimited) {
        setVerificationCard({
          email: verificationCard.email,
          message: verificationCard.message ?? null,
          error: typeof payload['error'] === 'string' ? payload['error'] : null,
          verificationUrl,
        });
        scheduleResendCooldown(retryAfterMs, { forceDefault: true });
        return;
      }

      setVerificationCard({
        email: verificationCard.email,
        message: verificationCard.message ?? null,
        error: typeof payload['error'] === 'string' ? payload['error'] : null,
        verificationUrl,
      });
    } catch {
      setVerificationCard({
        email: verificationCard.email,
        message: verificationCard.message ?? null,
        error: 'Wystąpił błąd podczas wysyłania e-maila.',
        verificationUrl: verificationCard.verificationUrl ?? null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleParentLogin = async (): Promise<void> => {
    const email = identifier.trim();
    if (!email || !password.trim()) {
      setFormError('Podaj email i hasło.');
      return;
    }

    setIsLoading(true);
    setFormError(null);
    setFormNotice(null);
    clearVerificationState();

    try {
      await fetch('/api/kangur/auth/learner-signout', {
        method: 'POST',
        credentials: 'same-origin',
      });

      const verifyResponse = await fetch('/api/auth/verify-credentials', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authFlow: 'kangur_parent',
          email,
          password,
        }),
      });

      const verifyPayload = await parseJsonResponse(verifyResponse);

      if (verifyPayload['ok'] === false) {
        const code = typeof verifyPayload['code'] === 'string' ? verifyPayload['code'] : null;

        if (code === 'EMAIL_UNVERIFIED') {
          setVerificationCard({
            email,
            message: EMAIL_UNVERIFIED_NOTICE,
            error: null,
            verificationUrl: null,
          });
          scheduleResendCooldown(null);
          return;
        }

        if (code === 'PASSWORD_SETUP_REQUIRED') {
          setAuthMode('create-account');
          setIdentifier(email);
          setPassword('');
          setFormNotice(PASSWORD_SETUP_REQUIRED_NOTICE);
          return;
        }

        setFormError(
          typeof verifyPayload['message'] === 'string'
            ? verifyPayload['message']
            : 'Nie udało się zalogować rodzica.'
        );
        return;
      }

      if (!verifyResponse.ok) {
        setFormError('Nie udało się zalogować rodzica.');
        return;
      }

      const csrfResponse = await fetch('/api/auth/csrf', {
        credentials: 'same-origin',
      });
      const csrfPayload = await parseJsonResponse(csrfResponse);
      const csrfToken = typeof csrfPayload['csrfToken'] === 'string' ? csrfPayload['csrfToken'] : '';

      const body = new URLSearchParams();
      body.set('csrfToken', csrfToken);
      body.set('callbackUrl', callbackValue);
      body.set('email', email);
      body.set('password', password);
      body.set('redirect', 'false');

      const callbackResponse = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      const callbackPayload = await parseJsonResponse(callbackResponse);

      if (!callbackResponse.ok) {
        setFormError('Nie udało się zalogować rodzica.');
        return;
      }

      await handleLoginSuccess({
        kind: 'parent',
        callbackUrl: typeof callbackPayload['url'] === 'string' ? callbackPayload['url'] : null,
      });
    } catch {
      setFormError('Wystąpił błąd podczas logowania rodzica.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentLogin = async (): Promise<void> => {
    const loginName = identifier.trim();
    if (!loginName || !password.trim()) {
      setFormError('Podaj nick ucznia i hasło.');
      return;
    }

    if (!KANGUR_LEARNER_LOGIN_PATTERN.test(loginName)) {
      setFormError(INVALID_LEARNER_LOGIN_NOTICE);
      return;
    }

    setIsLoading(true);
    setFormError(null);
    setFormNotice(null);
    clearVerificationState();

    try {
      await fetch('/api/kangur/auth/learner-signout', {
        method: 'POST',
        credentials: 'same-origin',
      });

      await signOut({ redirect: false });

      const response = await fetch('/api/kangur/auth/learner-signin', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loginName,
          password,
        }),
      });

      const payload = await parseJsonResponse(response);

      if (!response.ok) {
        setFormError(
          typeof payload['error'] === 'string'
            ? payload['error']
            : 'Nie udało się zalogować ucznia.'
        );
        return;
      }

      await handleLoginSuccess({
        kind: 'student',
        learnerId: typeof payload['learnerId'] === 'string' ? payload['learnerId'] : null,
      });
    } catch {
      setFormError('Wystąpił błąd podczas logowania ucznia.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    if (authMode === 'create-account') {
      void handleCreateAccount();
      return;
    }
    if (loginKind === 'parent') {
      void handleParentLogin();
      return;
    }
    void handleStudentLogin();
  };

  const resendLabel = resendCooldownLabel
    ? `Wyślij e-mail ponownie za ${resendCooldownLabel}`
    : 'Wyślij e-mail ponownie';
  const resendHelper = resendCooldownLabel
    ? `Nowy e-mail będzie można wysłać za ${resendCooldownLabel}.`
    : null;

  const loginTitle = loginFormEntry.entry?.title ?? DEFAULT_LOGIN_TITLE;
  const loginSummary = loginFormEntry.entry?.summary ?? null;
  const identifierLabel =
    authMode === 'create-account'
      ? 'Email'
      : identifierEntry.entry?.title ?? 'Email lub nick ucznia';

  const identifierPlaceholder =
    authMode === 'create-account' ? 'rodzic@example.com' : 'Wpisz email lub nick ucznia';
  const showVerificationCard = Boolean(verificationCard);
  const showForm = authMode !== 'create-account' || !showVerificationCard;
  const isCaptchaRequired = authMode === 'create-account' && Boolean(KANGUR_PARENT_CAPTCHA_SITE_KEY);
  const isSubmitDisabled =
    isLoading ||
    !identifier.trim() ||
    !password.trim() ||
    (authMode === 'create-account' && isCaptchaRequired && !captchaToken);

  return (
    <div className='flex w-full justify-center py-12'>
      <KangurGlassPanel
        data-testid='kangur-login-shell'
        variant='soft'
        padding='xl'
        className='w-full max-w-4xl overflow-hidden'
      >
        <div className={`${KANGUR_PANEL_GAP_CLASSNAME} flex flex-col lg:flex-row`}>
          <div className='flex flex-1 flex-col gap-4'>
            <div
              data-testid='kangur-login-hero-logo'
              className='flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700'
            >
              <svg viewBox='0 0 48 48' aria-hidden='true' className='h-7 w-7'>
                <path
                  d='M12 32c0-8 6-14 14-14s14 6 14 14'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='4'
                  strokeLinecap='round'
                />
                <circle cx='18' cy='18' r='4' fill='currentColor' />
                <circle cx='30' cy='18' r='4' fill='currentColor' />
              </svg>
            </div>
            <div className='space-y-2'>
              <KangurHeadline size='md' accent='amber'>
                {loginTitle}
              </KangurHeadline>
              {loginSummary ? (
                <p className='text-sm text-slate-600'>{loginSummary}</p>
              ) : null}
            </div>
          </div>

          <div className='flex-1'>
            <div className={KANGUR_SEGMENTED_CONTROL_CLASSNAME}>
              <KangurButton
                type='button'
                variant={authMode === 'sign-in' ? 'segmentActive' : 'segment'}
                size='sm'
                aria-pressed={authMode === 'sign-in'}
                onClick={() => handleModeSwitch('sign-in')}
              >
                Mam konto
              </KangurButton>
              <KangurButton
                type='button'
                variant={authMode === 'create-account' ? 'segmentActive' : 'segment'}
                size='sm'
                aria-pressed={authMode === 'create-account'}
                onClick={() => handleModeSwitch('create-account')}
              >
                Utwórz konto
              </KangurButton>
            </div>

            {showForm ? (
              <form
                ref={formRef}
                data-testid='kangur-login-form'
                data-hydrated='true'
                data-login-kind={loginKind}
                data-tutor-anchor='login_form'
                aria-busy={isLoading ? 'true' : 'false'}
                onSubmit={handleSubmit}
                className={`mt-6 ${KANGUR_STACK_RELAXED_CLASSNAME}`}
              >
                <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
                  <label htmlFor='identifier' className='text-sm font-medium text-slate-700'>
                    {identifierLabel}
                  </label>
                  <input
                    ref={identifierInputRef}
                    id='identifier'
                    name='identifier'
                    type={authMode === 'create-account' ? 'email' : 'text'}
                    aria-label={identifierLabel}
                    value={identifier}
                    onChange={(event) => {
                      setIdentifier(event.target.value);
                      if (formError) setFormError(null);
                    }}
                    disabled={isLoading}
                    data-testid='kangur-login-identifier-input'
                    data-tutor-anchor='login_identifier_field'
                    className='rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    placeholder={identifierPlaceholder}
                    autoComplete={authMode === 'create-account' ? 'email' : 'username'}
                    autoCapitalize='off'
                    autoCorrect='off'
                  />
                </div>

                <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
                  <label htmlFor='password' className='text-sm font-medium text-slate-700'>
                    Hasło
                  </label>
                  <input
                    id='password'
                    name='password'
                    type='password'
                    aria-label='Hasło'
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (formError) setFormError(null);
                    }}
                    disabled={isLoading}
                    className='rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    placeholder='Wpisz hasło'
                    autoComplete={authMode === 'create-account' ? 'new-password' : 'current-password'}
                  />
                </div>

                {authMode === 'create-account' && isCaptchaRequired ? (
                  <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
                    <div
                      ref={captchaContainerRef}
                      className='min-h-[65px] self-center'
                      aria-label='Weryfikacja bezpieczeństwa'
                    />
                  </div>
                ) : null}

                {formError ? (
                  <div role='alert' className='rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600'>
                    {formError}
                  </div>
                ) : null}

                {formNotice ? (
                  <div
                    role='status'
                    aria-live='polite'
                    className='rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-600'
                  >
                    {formNotice}
                  </div>
                ) : null}

                {successMessage ? (
                  <div
                    role='status'
                    aria-live='polite'
                    className='rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600'
                  >
                    {successMessage}
                  </div>
                ) : null}

                <KangurButton
                  type='submit'
                  variant='primary'
                  size='lg'
                  fullWidth
                  disabled={isSubmitDisabled}
                  className='justify-center rounded-xl'
                >
                  {authMode === 'create-account'
                    ? 'Utwórz konto rodzica'
                    : loginKind === 'parent'
                      ? 'Zaloguj rodzica'
                      : 'Zaloguj'}
                </KangurButton>
              </form>
            ) : null}

            {verificationCard ? (
              <ParentVerificationCard
                {...verificationCard}
                resendLabel={resendLabel}
                resendDisabled={Boolean(resendCooldownLabel) || isLoading}
                resendHelper={resendHelper}
                onResend={handleResendVerification}
              />
            ) : null}
          </div>
        </div>
      </KangurGlassPanel>
    </div>
  );
}

type KangurLoginPagePropsInput = Omit<KangurLoginPageProps, 'defaultCallbackUrl'> & {
  defaultCallbackUrl?: string;
};

export function KangurLoginPage(props: KangurLoginPagePropsInput): React.JSX.Element {
  const searchParams = useSearchParams();
  const callbackParam = searchParams?.get('callbackUrl') ?? undefined;
  const authModeParam = searchParams?.get(KANGUR_PARENT_AUTH_MODE_PARAM);
  const resolvedDefaultCallbackUrl = props.defaultCallbackUrl ?? getKangurHomeHref();
  const resolvedCallbackUrl = props.callbackUrl ?? callbackParam;
  const resolvedParentAuthMode = props.parentAuthMode ??
    parseKangurAuthMode(authModeParam, 'sign-in');

  const contextValue = useMemo(
    () => ({
      defaultCallbackUrl: resolvedDefaultCallbackUrl,
      callbackUrl: resolvedCallbackUrl,
      onClose: props.onClose,
      parentAuthMode: resolvedParentAuthMode,
      showParentAuthModeTabs: props.showParentAuthModeTabs,
    }),
    [
      resolvedCallbackUrl,
      resolvedDefaultCallbackUrl,
      resolvedParentAuthMode,
      props.onClose,
      props.showParentAuthModeTabs,
    ]
  );

  return (
    <KangurLoginPagePropsContext.Provider value={contextValue}>
      <Suspense fallback={<LoadingState className='h-64' message='Ładowanie...' />}>
        <KangurLoginPageContent />
      </Suspense>
    </KangurLoginPagePropsContext.Provider>
  );
}

export { resolveKangurLoginCallbackNavigation } from '@/features/kangur/ui/login-page/use-login-logic';

export default KangurLoginPage;
