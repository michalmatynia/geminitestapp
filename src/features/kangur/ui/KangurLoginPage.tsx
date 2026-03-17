'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';

import { KangurAppLoader } from '@/features/kangur/ui/components/KangurAppLoader';
import { KangurKangurWordmark } from '@/features/kangur/ui/components/KangurKangurWordmark';
import { useKangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_STACK_RELAXED_CLASSNAME,
  KANGUR_STACK_SPACED_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS } from '@/features/kangur/settings';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import type { KangurAuthMode } from '@/features/kangur/shared/contracts/kangur-auth';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';

import {
  KANGUR_LEARNER_LOGIN_PATTERN,
  KANGUR_PARENT_AUTH_MODE_PARAM,
  KANGUR_PARENT_CAPTCHA_SITE_KEY,
} from './login-page/login-constants';
import {
  KangurLoginPageProps,
  KangurLoginPagePropsContext,
  useKangurLoginPageProps,
} from './login-page/login-context';
import { useLoginLogic, resolveKangurLoginCallbackNavigation } from './login-page/use-login-logic';
import { useTurnstile } from './login-page/use-turnstile';

const DEFAULT_LOGIN_DESCRIPTION =
  'Rodzic loguje się emailem i hasłem. Uczeń loguje się nickiem i hasłem.';
const MAGIC_LINK_DEPRECATED_NOTICE =
  'Logowanie linkiem z e-maila nie jest już dostępne. Zaloguj się e-mailem i hasłem albo utwórz konto.';
const EMAIL_UNVERIFIED_NOTICE =
  'Potwierdź e-mail rodzica, zanim się zalogujesz. Możesz też wysłać nowy e-mail potwierdzający.';
const LEGACY_PASSWORD_REQUIRED_NOTICE =
  'To starsze konto rodzica nie ma jeszcze hasła. Ustaw hasło poniżej, a wyślemy e-mail potwierdzający.';
const CREATE_ACCOUNT_CONFIRMATION_COPY =
  'Kliknij link potwierdzający w e-mailu. Potem zalogujesz się tym samym e-mailem i hasłem.';
const INVALID_STUDENT_NICK_COPY =
  'Nick ucznia może zawierać tylko litery, cyfry i myślniki.';

const resolveAuthModeFromParam = (value: string | null): KangurAuthMode | null => {
  if (value?.trim().toLowerCase() === 'create-account') {
    return 'create-account';
  }
  return null;
};

const resolveCooldownMs = (retryAfterMs?: number | null): number => {
  if (typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs)) {
    return Math.max(0, retryAfterMs);
  }
  return KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS;
};

const formatCooldownLabel = (remainingMs: number): string => {
  const seconds = Math.ceil(remainingMs / 1000);
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} min`;
  }
  return `${seconds} s`;
};

type ParentVerificationState = {
  email: string;
  message: string | null;
  verificationUrl: string | null;
  resendAvailableAt: number | null;
};

const buildVerificationState = (input: {
  email: string;
  message: string | null;
  verificationUrl?: string | null;
  retryAfterMs?: number | null;
}): ParentVerificationState => {
  const cooldownMs = resolveCooldownMs(input.retryAfterMs);
  const resendAvailableAt = Date.now() + cooldownMs;
  return {
    email: input.email,
    message: input.message,
    verificationUrl: input.verificationUrl ?? null,
    resendAvailableAt,
  };
};

const resolveCallbackUrl = (
  propsCallbackUrl: string | undefined,
  searchParams: URLSearchParams,
  defaultCallbackUrl: string
): string => {
  return (
    propsCallbackUrl?.trim() ||
    searchParams.get('callbackUrl')?.trim() ||
    defaultCallbackUrl
  );
};

function KangurLoginPageContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const auth = useOptionalKangurAuth();
  const { defaultCallbackUrl, callbackUrl: propsCallbackUrl, onClose, parentAuthMode } =
    useKangurLoginPageProps();
  const { entry: loginFormEntry } = useKangurPageContentEntry('login-page-form');
  useKangurPageContentEntry('login-page-identifier-field');

  const requestedAuthMode = resolveAuthModeFromParam(
    searchParams.get(KANGUR_PARENT_AUTH_MODE_PARAM)
  );
  const initialAuthMode = requestedAuthMode ?? parentAuthMode ?? 'sign-in';
  const [activeAuthMode, setActiveAuthMode] = useState<KangurAuthMode>(initialAuthMode);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [verificationState, setVerificationState] = useState<ParentVerificationState | null>(
    null
  );
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const verifyTokenRef = useRef<string | null>(null);
  const magicLinkTokenRef = useRef<string | null>(null);

  const { isLoading, setIsLoading, handleLoginSuccess } = useLoginLogic();

  const resolvedCallbackUrl = useMemo(
    () => resolveCallbackUrl(propsCallbackUrl, searchParams, defaultCallbackUrl),
    [defaultCallbackUrl, propsCallbackUrl, searchParams]
  );

  const loginTitle = loginFormEntry?.title ?? 'Logowanie do Kangur';
  const loginDescription = loginFormEntry?.summary ?? DEFAULT_LOGIN_DESCRIPTION;

  useKangurAiTutorSessionSync({
    learnerId: auth?.user?.activeLearner?.id ?? null,
    sessionContext: {
      surface: 'auth',
      contentId: 'auth:login:sign-in',
      title: loginTitle,
      description: loginDescription,
    },
  });

  useEffect(() => {
    if (!requestedAuthMode) {
      return;
    }
    setActiveAuthMode(requestedAuthMode);
  }, [requestedAuthMode]);

  useEffect(() => {
    const verifyToken = searchParams.get('verifyEmailToken')?.trim() || null;
    if (!verifyToken || verifyTokenRef.current === verifyToken) {
      return;
    }
    verifyTokenRef.current = verifyToken;

    void (async () => {
      setIsLoading(true);
      setFormError(null);
      setFormNotice(null);
      setVerificationState(null);
      try {
        const response = await fetch('/api/kangur/auth/parent-email/verify', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: verifyToken }),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.ok) {
          setFormError(payload?.error || 'Nie udało się potwierdzić e-maila rodzica.');
          return;
        }
        setIdentifier(payload.email ?? '');
        setFormNotice(payload.message ?? null);
        setActiveAuthMode('sign-in');
        await auth?.checkAppState?.();
      } catch (error) {
        void ErrorSystem.captureException(error);
        setFormError('Nie udało się potwierdzić e-maila rodzica.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [auth, searchParams, setIsLoading]);

  useEffect(() => {
    const magicLinkToken = searchParams.get('magicLinkToken')?.trim() || null;
    if (!magicLinkToken || magicLinkTokenRef.current === magicLinkToken) {
      return;
    }
    magicLinkTokenRef.current = magicLinkToken;
    setFormError(MAGIC_LINK_DEPRECATED_NOTICE);
  }, [searchParams]);

  useEffect(() => {
    const availableAt = verificationState?.resendAvailableAt;
    if (!availableAt || availableAt <= Date.now()) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [verificationState?.resendAvailableAt]);

  const loginKind = useMemo(() => {
    if (activeAuthMode === 'create-account') {
      return 'parent';
    }
    const trimmed = identifier.trim();
    if (!trimmed) {
      return 'unknown';
    }
    if (trimmed.includes('@')) {
      return 'parent';
    }
    return KANGUR_LEARNER_LOGIN_PATTERN.test(trimmed) ? 'student' : 'unknown';
  }, [activeAuthMode, identifier]);

  const currentTime = Math.max(now, Date.now());
  const resendRemainingMs = verificationState?.resendAvailableAt
    ? Math.max(verificationState.resendAvailableAt - currentTime, 0)
    : 0;
  const resendCooldownLabel = resendRemainingMs > 0 ? formatCooldownLabel(resendRemainingMs) : null;
  const resendButtonLabel = resendCooldownLabel
    ? `Wyślij e-mail ponownie za ${resendCooldownLabel}`
    : 'Wyślij e-mail ponownie';
  const resendInfoCopy = resendCooldownLabel
    ? `Nowy e-mail będzie można wysłać za ${resendCooldownLabel}.`
    : null;

  const isCaptchaRequired = Boolean(KANGUR_PARENT_CAPTCHA_SITE_KEY);
  const handleTurnstileVerify = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);
  const handleTurnstileReset = useCallback(() => {
    setCaptchaToken(null);
  }, []);
  const { containerRef: captchaContainerRef } = useTurnstile({
    onVerify: handleTurnstileVerify,
    onError: handleTurnstileReset,
    onExpire: handleTurnstileReset,
  });

  const resetFormFeedback = (): void => {
    setFormError(null);
    setFormNotice(null);
  };

  const handleAuthModeChange = (nextMode: KangurAuthMode): void => {
    setActiveAuthMode(nextMode);
    resetFormFeedback();
    setVerificationState(null);
    if (nextMode === 'sign-in') {
      setCaptchaToken(null);
    }
  };

  const handleParentAccountCreate = async (): Promise<void> => {
    setIsLoading(true);
    resetFormFeedback();

    try {
      const response = await fetch('/api/kangur/auth/parent-account/create', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: identifier.trim(),
          password,
          callbackUrl: resolvedCallbackUrl,
          ...(captchaToken ? { captchaToken } : {}),
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        const retryAfterMs = payload?.retryAfterMs;
        const message = payload?.error || payload?.message || 'Nie udało się utworzyć konta rodzica.';
        setVerificationState(
          buildVerificationState({
            email: identifier.trim(),
            message,
            retryAfterMs,
            verificationUrl: payload?.debug?.verificationUrl,
          })
        );
        return;
      }

      setVerificationState(
        buildVerificationState({
          email: payload.email ?? identifier.trim(),
          message: CREATE_ACCOUNT_CONFIRMATION_COPY,
          retryAfterMs: payload.retryAfterMs,
          verificationUrl: payload?.debug?.verificationUrl,
        })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      setFormError('Nie udało się utworzyć konta rodzica.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParentResend = async (): Promise<void> => {
    if (!verificationState) {
      return;
    }

    setIsLoading(true);
    resetFormFeedback();

    try {
      const response = await fetch('/api/kangur/auth/parent-account/resend', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verificationState.email,
          callbackUrl: resolvedCallbackUrl,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        setVerificationState(
          buildVerificationState({
            email: verificationState.email,
            message: payload?.error || 'Nie udało się wysłać e-maila.',
            retryAfterMs: payload?.retryAfterMs,
            verificationUrl: verificationState.verificationUrl,
          })
        );
        return;
      }

      setVerificationState(
        buildVerificationState({
          email: payload.email ?? verificationState.email,
          message: payload.message ?? null,
          retryAfterMs: payload.retryAfterMs,
          verificationUrl: payload?.debug?.verificationUrl,
        })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      setFormError('Nie udało się wysłać e-maila.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParentSignIn = async (): Promise<void> => {
    setIsLoading(true);
    resetFormFeedback();

    try {
      await fetch('/api/kangur/auth/learner-signout', {
        method: 'POST',
        credentials: 'same-origin',
      });

      const verifyResponse = await fetch('/api/auth/verify-credentials', {
        method: 'POST',
        credentials: 'same-origin',
        headers: withCsrfHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          authFlow: 'kangur_parent',
          email: identifier.trim(),
          password,
        }),
      });
      const verifyPayload = await verifyResponse.json();

      if (!verifyPayload?.ok) {
        if (verifyPayload?.code === 'EMAIL_UNVERIFIED') {
          setVerificationState(
            buildVerificationState({
              email: identifier.trim(),
              message: EMAIL_UNVERIFIED_NOTICE,
              retryAfterMs: 0,
            })
          );
          return;
        }

        if (verifyPayload?.code === 'PASSWORD_SETUP_REQUIRED') {
          setFormNotice(LEGACY_PASSWORD_REQUIRED_NOTICE);
          setActiveAuthMode('create-account');
          setPassword('');
          return;
        }

        setFormError(verifyPayload?.message || 'Nie udało się zalogować rodzica.');
        return;
      }

      const csrfResponse = await fetch('/api/auth/csrf', {
        credentials: 'same-origin',
      });
      const csrfPayload = await csrfResponse.json();

      const callbackResponse = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          callbackUrl: resolvedCallbackUrl,
          csrfToken: csrfPayload?.csrfToken ?? '',
        }),
      });
      const callbackPayload = await callbackResponse.json();

      await handleLoginSuccess({
        kind: 'parent',
        callbackUrl: callbackPayload?.url ?? resolvedCallbackUrl,
      });
    } catch (error) {
      void ErrorSystem.captureException(error);
      setFormError('Nie udało się zalogować rodzica.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentSignIn = async (): Promise<void> => {
    setIsLoading(true);
    resetFormFeedback();

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
          loginName: identifier.trim(),
          password,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setFormError(payload?.error || 'Nie udało się zalogować ucznia.');
        return;
      }

      await handleLoginSuccess({
        kind: 'student',
        learnerId: payload?.learnerId ?? null,
        callbackUrl: resolvedCallbackUrl,
      });
    } catch (error) {
      void ErrorSystem.captureException(error);
      setFormError('Nie udało się zalogować ucznia.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password.trim()) {
      return;
    }

    if (activeAuthMode === 'create-account') {
      await handleParentAccountCreate();
      return;
    }

    if (trimmedIdentifier.includes('@')) {
      await handleParentSignIn();
      return;
    }

    if (!KANGUR_LEARNER_LOGIN_PATTERN.test(trimmedIdentifier)) {
      setFormError(INVALID_STUDENT_NICK_COPY);
      return;
    }

    await handleStudentSignIn();
  };

  const submitLabel =
    activeAuthMode === 'create-account'
      ? 'Utwórz konto rodzica'
      : loginKind === 'parent'
        ? 'Zaloguj rodzica'
        : 'Zaloguj';

  const isSubmitDisabled =
    isLoading ||
    !identifier.trim() ||
    !password.trim() ||
    (activeAuthMode === 'create-account' && isCaptchaRequired && !captchaToken);

  return (
    <div className='flex min-h-screen min-h-[100svh] min-h-[100dvh] w-full items-center justify-center px-4 py-8 sm:py-12'>
      <KangurGlassPanel
        data-testid='kangur-login-shell'
        padding='xl'
        className='w-full max-w-[520px] overflow-hidden'
      >
        <div className='flex flex-col gap-6'>
          <div className='flex flex-col items-center gap-3 text-center'>
            <div data-testid='kangur-login-hero-logo' className='w-full max-w-[280px]'>
              <KangurKangurWordmark />
            </div>
            <h1 className='text-2xl font-semibold'>{
              activeAuthMode === 'create-account' ? 'Utwórz konto rodzica' : 'Zaloguj się'
            }</h1>
            <p className='text-sm text-slate-600'>{loginDescription}</p>
          </div>

          <div className='flex w-full items-center justify-center gap-2'>
            <button
              type='button'
              aria-pressed={activeAuthMode === 'sign-in'}
              onClick={() => handleAuthModeChange('sign-in')}
              className='rounded-full border px-4 py-2 text-sm font-semibold'
            >
              Mam konto
            </button>
            <button
              type='button'
              aria-pressed={activeAuthMode === 'create-account'}
              onClick={() => handleAuthModeChange('create-account')}
              className='rounded-full border px-4 py-2 text-sm font-semibold'
            >
              Utwórz konto
            </button>
          </div>

          <form
            data-testid='kangur-login-form'
            data-hydrated='true'
            data-login-kind={loginKind}
            data-tutor-anchor='login_form'
            aria-busy={isLoading ? 'true' : 'false'}
            onSubmit={handleSubmit}
            className={KANGUR_STACK_RELAXED_CLASSNAME}
            noValidate
          >
            <div className='flex flex-col gap-1'>
              <label htmlFor='kangur-login-identifier' className='text-sm font-semibold'>
                {activeAuthMode === 'create-account' ? 'Email' : 'Email lub nick ucznia'}
              </label>
              <input
                id='kangur-login-identifier'
                data-testid='kangur-login-identifier-input'
                data-tutor-anchor='login_identifier_field'
                type='text'
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className='rounded-xl border px-4 py-3 text-sm'
                placeholder={
                  activeAuthMode === 'create-account'
                    ? 'rodzic@example.com'
                    : 'Wpisz email lub nick ucznia'
                }
                autoComplete='username'
                autoCapitalize='off'
                autoCorrect='off'
                disabled={isLoading}
              />
            </div>

            <div className='flex flex-col gap-1'>
              <label htmlFor='kangur-login-password' className='text-sm font-semibold'>
                Hasło
              </label>
              <input
                id='kangur-login-password'
                name='password'
                type='password'
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className='rounded-xl border px-4 py-3 text-sm'
                autoComplete={activeAuthMode === 'create-account' ? 'new-password' : 'current-password'}
                disabled={isLoading}
              />
            </div>

            {activeAuthMode === 'create-account' && isCaptchaRequired ? (
              <div className='flex flex-col items-center gap-2'>
                <div ref={captchaContainerRef} className='min-h-[65px]' />
              </div>
            ) : null}

            {formError ? (
              <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm' role='alert'>
                {formError}
              </div>
            ) : null}

            {formNotice ? (
              <div
                className='rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm'
                role='status'
                aria-live='polite'
              >
                {formNotice}
              </div>
            ) : null}

            <button
              type='submit'
              className='mt-2 rounded-xl border px-4 py-3 text-sm font-semibold'
              disabled={isSubmitDisabled}
            >
              {submitLabel}
            </button>
          </form>

          {verificationState ? (
            <div className={`${KANGUR_STACK_SPACED_CLASSNAME} rounded-2xl border px-4 py-4`}>
              <div className='text-sm font-semibold'>
                Sprawdź skrzynkę: {verificationState.email}
              </div>
              {verificationState.message ? (
                <div role='status' aria-live='polite' className='text-sm'>
                  {verificationState.message}
                </div>
              ) : null}
              {verificationState.verificationUrl ? (
                <a
                  href={verificationState.verificationUrl}
                  className='cursor-pointer text-sm font-semibold underline'
                >
                  Potwierdź e-mail teraz
                </a>
              ) : null}
              <div className='flex flex-col gap-1'>
                <button
                  type='button'
                  onClick={handleParentResend}
                  disabled={isLoading || resendRemainingMs > 0}
                  className='text-left text-sm font-semibold'
                >
                  {resendButtonLabel}
                </button>
                {resendInfoCopy ? <div className='text-xs'>{resendInfoCopy}</div> : null}
              </div>
            </div>
          ) : null}
        </div>
      </KangurGlassPanel>

      <button type='button' className='sr-only' onClick={onClose}>
        Zamknij logowanie
      </button>
    </div>
  );
}

export function KangurLoginPage(props: KangurLoginPageProps): React.JSX.Element {
  return (
    <Suspense fallback={<KangurAppLoader visible={true} />}>
      <KangurLoginPagePropsContext.Provider value={props}>
        <KangurLoginPageContent />
      </KangurLoginPagePropsContext.Provider>
    </Suspense>
  );
}

export { resolveKangurLoginCallbackNavigation };
export default KangurLoginPage;
