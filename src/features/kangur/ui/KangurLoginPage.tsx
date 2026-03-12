'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  createContext,
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useContext,
  type FormEvent,
  type CSSProperties,
  type JSX,
} from 'react';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import {
  clearStoredActiveLearnerId,
  setStoredActiveLearnerId,
} from '@/features/kangur/services/kangur-active-learner';
import { KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS } from '@/features/kangur/settings';
import { KangurHomeLogo } from '@/features/kangur/ui/components/KangurHomeLogo';
import { useKangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import {
  KangurButton,
  KangurGlassPanel,
  KangurGradientHeading,
} from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import type { VerifyCredentialsResponse } from '@/shared/contracts/auth';
import {
  type KangurAuthMode,
  parseKangurAuthMode,
  parseKangurParentAccountActionResponse,
  parseKangurParentEmailVerifyResponse,
} from '@/shared/contracts/kangur-auth';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

type KangurLoginPageProps = {
  callbackUrl?: string;
  defaultCallbackUrl: string;
  onClose?: () => void;
  parentAuthMode?: KangurAuthMode;
};

const LOGIN_ROUTE_ACKNOWLEDGE_MS = 110;

type KangurCredentialsCallbackPayload = {
  error?: string;
  url?: string;
};

type KangurApiErrorPayload = {
  error?: string | { message?: string };
  message?: string;
  retryAfterMs?: number;
};

type KangurLoginKind = 'parent' | 'student' | 'unknown';

const KANGUR_LEARNER_LOGIN_PATTERN = /^[a-zA-Z0-9]+$/;
const KANGUR_PARENT_AUTH_MODE_PARAM = 'authMode';
const KangurLoginPagePropsContext = createContext<KangurLoginPageProps | null>(null);

const useKangurLoginPageProps = (): KangurLoginPageProps => {
  const value = useContext(KangurLoginPagePropsContext);
  if (!value) {
    throw new Error('KangurLoginPage props are unavailable.');
  }
  return value;
};

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
    (await verifyResponse.json().catch(() => null)) as VerifyCredentialsResponse | null;

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
      return 'Potwierdź e-mail rodzica, zanim się zalogujesz. Sprawdź skrzynkę i kliknij link potwierdzający.';
    case 'PASSWORD_SETUP_REQUIRED':
      return 'To konto rodzica trzeba najpierw zabezpieczyć hasłem. Ustaw hasło i wyślij e-mail potwierdzający.';
    case 'MFA_REQUIRED':
      return 'To konto wymaga dodatkowej weryfikacji. Zaloguj się przez główny ekran konta.';
    case 'EMAIL_LOCKED':
    case 'IP_RATE_LIMIT':
      return 'Za dużo prób logowania. Spróbuj ponownie za chwilę.';
    case 'ACCOUNT_BANNED':
    case 'ACCOUNT_DISABLED':
      return 'To konto rodzica jest niedostępne.';
    default:
      return fallbackMessage?.trim() || 'Nie udało się zalogować rodzica. Sprawdź e-mail i hasło.';
  }
};

const formatRetryAfterLabel = (retryAfterMs: number): string => {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  if (seconds < 60) {
    return `${seconds} s`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
};

const readApiErrorDetails = async (
  response: Response
): Promise<{ message: string | null; retryAfterMs: number | null }> => {
  const payload = (await response.json().catch(() => null)) as KangurApiErrorPayload | null;
  const errorMessage =
    typeof payload?.error === 'string' ? payload.error.trim() : payload?.error?.message?.trim();
  const fallbackMessage = payload?.message?.trim();
  const retryAfterMs =
    typeof payload?.retryAfterMs === 'number' &&
    Number.isFinite(payload.retryAfterMs) &&
    payload.retryAfterMs > 0
      ? payload.retryAfterMs
      : null;
  const message = errorMessage || fallbackMessage || null;

  if (message) {
    return { message, retryAfterMs };
  }

  if (retryAfterMs) {
    return {
      message: `Spróbuj ponownie za ${formatRetryAfterLabel(retryAfterMs)}.`,
      retryAfterMs,
    };
  }

  return { message: null, retryAfterMs: null };
};

const resolveParentVerificationRetryAfterMs = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS;

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

function KangurLoginPageContent(): JSX.Element {
  const {
    callbackUrl: callbackUrlProp,
    defaultCallbackUrl,
    onClose,
    parentAuthMode: parentAuthModeProp,
  } = useKangurLoginPageProps();
  const router = useRouter();
  const routeNavigator = useKangurRouteNavigator();
  const searchParams = useSearchParams();
  const auth = useOptionalKangurAuth();
  const { entry: loginFormContent } = useKangurPageContentEntry('login-page-form');
  const { entry: identifierFieldContent } = useKangurPageContentEntry(
    'login-page-identifier-field'
  );
  const loginFormRef = useRef<HTMLFormElement | null>(null);
  const identifierInputRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();
  const identifierInputId = useId();
  const identifierHelpId = useId();
  const passwordInputId = useId();
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
    parseKangurAuthMode(searchParams.get(KANGUR_PARENT_AUTH_MODE_PARAM));
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdParentEmail, setCreatedParentEmail] = useState<string | null>(null);
  const [resendAvailableAtMs, setResendAvailableAtMs] = useState<number | null>(null);
  const [parentAuthMode, setParentAuthMode] = useState<KangurAuthMode>(
    requestedParentAuthMode
  );
  const [verificationDebugUrl, setVerificationDebugUrl] = useState<string | null>(null);
  const [resendCountdownNowMs, setResendCountdownNowMs] = useState(() => Date.now());
  const processedVerificationTokenRef = useRef<string | null>(null);
  const loginKind = resolveKangurLoginKind(identifier);
  const isParentFlowVisible = loginKind !== 'student';
  const audienceLabel =
    parentAuthMode === 'create-account'
      ? 'Nowe konto rodzica'
      : loginKind === 'student'
        ? 'Uczeń'
        : loginKind === 'parent'
          ? 'Rodzic'
          : 'Rodzic lub uczeń';
  const audienceBadgeClassName =
    'inline-flex items-center justify-center rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] shadow-[0_14px_30px_-26px_rgba(15,23,42,0.22)]';
  const audienceBadgeStyle: CSSProperties =
    parentAuthMode === 'create-account'
      ? {
          background:
            'color-mix(in srgb, var(--kangur-soft-card-background) 86%, rgba(245,158,11,0.22))',
          borderColor: 'rgba(251,191,36,0.52)',
          color: '#9a5418',
        }
      : loginKind === 'student'
        ? {
            background:
              'color-mix(in srgb, var(--kangur-soft-card-background) 86%, rgba(56,189,248,0.2))',
            borderColor: 'rgba(125,211,252,0.5)',
            color: '#0369a1',
          }
        : loginKind === 'parent'
          ? {
              background:
                'color-mix(in srgb, var(--kangur-soft-card-background) 86%, rgba(99,102,241,0.2))',
              borderColor: 'rgba(165,180,252,0.5)',
              color: '#4338ca',
            }
          : {
              background:
                'color-mix(in srgb, var(--kangur-soft-card-background) 86%, rgba(245,158,11,0.18))',
              borderColor: 'rgba(251,191,36,0.48)',
              color: '#9a5418',
            };
  const introDescription =
    parentAuthMode === 'create-account'
      ? 'Zakładasz konto rodzica emailem i hasłem. Po potwierdzeniu adresu zalogujesz się tak samo za każdym razem.'
      : loginKind === 'student'
        ? 'Uczeń loguje się nickiem i hasłem. Rodzic może wejść emailem i hasłem.'
        : loginFormContent?.summary ??
          'Rodzic loguje się emailem i hasłem. Uczeń loguje się nickiem i hasłem.';
  const identifierFieldLabel =
    isParentFlowVisible && parentAuthMode === 'create-account'
      ? 'Email rodzica'
      : identifierFieldContent?.title ?? 'Email rodzica albo nick ucznia';
  const identifierFieldHelpText =
    parentAuthMode === 'create-account'
      ? 'Użyj adresu e-mail rodzica, na który wyślemy link potwierdzający konto.'
      : identifierFieldContent?.summary ??
        'Wpisz email rodzica lub login ucznia, aby przejść do właściwego trybu logowania.';
  const visibleNotice = createdParentEmail ? null : notice;
  const createAccountConfirmationDetail =
    notice?.trim() || 'Kliknij link potwierdzający w e-mailu. Potem zalogujesz się tym samym e-mailem i hasłem.';
  const resendRetryAfterMs =
    typeof resendAvailableAtMs === 'number'
      ? Math.max(0, resendAvailableAtMs - resendCountdownNowMs)
      : 0;
  const isResendCoolingDown = resendRetryAfterMs > 0;
  const resendAvailabilityMessage = isResendCoolingDown
    ? `Nowy e-mail będzie można wysłać za ${formatRetryAfterLabel(resendRetryAfterMs)}.`
    : null;
  const resendButtonLabel = isResendCoolingDown
    ? `Wyślij e-mail ponownie za ${formatRetryAfterLabel(resendRetryAfterMs)}`
    : 'Wyślij e-mail ponownie';
  const inputClassName =
    'kangur-text-field rounded-[24px] px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.76)] outline-none transition focus:border-amber-200 focus:ring-2 focus:ring-amber-200/70 disabled:cursor-not-allowed disabled:opacity-60';
  const formDescribedBy = [visibleNotice ? noticeId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');
  const identifierInputDescribedBy = [identifierHelpId, formDescribedBy || null]
    .filter(Boolean)
    .join(' ');
  const identifierAnchorLabel =
    isParentFlowVisible && parentAuthMode === 'create-account'
      ? 'Pole e-maila rodzica'
      : 'Pole e-maila rodzica albo nicku ucznia';
  const authSessionTitle =
    parentAuthMode === 'create-account'
      ? 'Tworzenie konta rodzica'
      : loginKind === 'student'
        ? 'Logowanie ucznia'
        : loginKind === 'parent'
          ? 'Logowanie rodzica'
          : loginFormContent?.title ?? 'Logowanie do Kangur';
  const authSessionContentId =
    parentAuthMode === 'create-account'
      ? 'auth:login:create-account'
      : loginKind === 'student'
        ? 'auth:login:student'
        : loginKind === 'parent'
          ? 'auth:login:parent'
          : 'auth:login:sign-in';

  useKangurAiTutorSessionSync({
    learnerId: auth?.user?.activeLearner?.id ?? null,
    sessionContext: {
      surface: 'auth',
      contentId: authSessionContentId,
      title: authSessionTitle,
      description: introDescription,
    },
  });

  useKangurTutorAnchor({
    id: 'kangur-auth-login-form',
    kind: 'login_form',
    ref: loginFormRef,
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
      label: identifierAnchorLabel,
    },
  });

  const startResendCooldown = (retryAfterMs: number): void => {
    const now = Date.now();
    setResendCountdownNowMs(now);
    setResendAvailableAtMs(now + retryAfterMs);
  };

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setParentAuthMode(requestedParentAuthMode);
  }, [requestedParentAuthMode]);

  useEffect(() => {
    if (!(typeof resendAvailableAtMs === 'number' && resendAvailableAtMs > Date.now())) {
      return;
    }

    setResendCountdownNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setResendCountdownNowMs(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [resendAvailableAtMs]);

  useEffect(() => {
    if (typeof resendAvailableAtMs === 'number' && resendAvailableAtMs <= resendCountdownNowMs) {
      setResendAvailableAtMs(null);
    }
  }, [resendAvailableAtMs, resendCountdownNowMs]);

  useEffect(() => {
    if (loginKind !== 'student') {
      return;
    }

    setParentAuthMode('sign-in');
    setCreatedParentEmail(null);
    setNotice(null);
    setVerificationDebugUrl(null);
    setResendAvailableAtMs(null);
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
      routeNavigator.push(navigationTarget.href, {
        acknowledgeMs: LOGIN_ROUTE_ACKNOWLEDGE_MS,
        scroll: false,
        sourceId: 'kangur-login:finish',
      });
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
        if (result.error === 'PASSWORD_SETUP_REQUIRED') {
          setParentAuthMode('create-account');
          setPassword('');
          setNotice(
            'To starsze konto rodzica nie ma jeszcze hasła. Ustaw hasło poniżej, a wyślemy e-mail potwierdzający.'
          );
          return;
        }
        if (result.error === 'EMAIL_UNVERIFIED') {
          setCreatedParentEmail(email);
          setNotice('Potwierdź e-mail rodzica, zanim się zalogujesz. Możesz też wysłać nowy e-mail potwierdzający.');
          return;
        }
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
      setError('Nie udało się zalogować rodzica. Spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParentAccountCreate = async (email: string): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    setCreatedParentEmail(null);
    setResendAvailableAtMs(null);
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
        const { message, retryAfterMs } = await readApiErrorDetails(response);
        trackKangurClientEvent('kangur_parent_account_create_failed', {
          callbackUrl,
          statusCode: response.status,
        });
        if (response.status === 429) {
          setCreatedParentEmail(email);
          setPassword('');
          if (retryAfterMs) {
            startResendCooldown(retryAfterMs);
          }
          setNotice(
            message ??
              'E-mail potwierdzający został już wysłany. Sprawdź skrzynkę i spróbuj ponownie za chwilę.'
          );
          return;
        }
        setError(message ?? 'Nie udało się utworzyć konta rodzica. Spróbuj ponownie.');
        return;
      }

      const payload = parseKangurParentAccountActionResponse(
        await response.json().catch(() => null)
      );
      const debugVerificationUrl = payload?.debug?.verificationUrl?.trim();
      const retryAfterMs = resolveParentVerificationRetryAfterMs(payload?.retryAfterMs);
      trackKangurClientEvent('kangur_parent_account_created', {
        callbackUrl,
        created: payload?.created === true,
        emailVerified: payload?.emailVerified === true,
        hasPassword: payload?.hasPassword === true,
      });
      setPassword('');
      setCreatedParentEmail(email);
      startResendCooldown(retryAfterMs);
      setVerificationDebugUrl(
        debugVerificationUrl && debugVerificationUrl.length > 0 ? debugVerificationUrl : null
      );
      setNotice(
        payload?.created === true
          ? null
          : payload?.message?.trim() || 'To konto czeka na potwierdzenie e-maila. Wysłaliśmy nowy link.'
      );
    } catch {
      trackKangurClientEvent('kangur_parent_account_create_failed', {
        callbackUrl,
        reason: 'network_error',
      });
      setError('Nie udało się utworzyć konta rodzica. Spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParentVerificationResend = async (): Promise<void> => {
    if (!createdParentEmail || isResendCoolingDown) {
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
        const { message, retryAfterMs } = await readApiErrorDetails(response);
        trackKangurClientEvent('kangur_parent_account_resend_failed', {
          callbackUrl,
          statusCode: response.status,
        });
        if (response.status === 429) {
          if (retryAfterMs) {
            startResendCooldown(retryAfterMs);
          }
          setNotice(
            message ??
              'E-mail potwierdzający został już wysłany. Sprawdź skrzynkę i spróbuj ponownie za chwilę.'
          );
          return;
        }
        setError(message ?? 'Nie udało się wysłać nowego e-maila potwierdzającego. Spróbuj ponownie.');
        return;
      }

      const payload = parseKangurParentAccountActionResponse(
        await response.json().catch(() => null)
      );
      const debugVerificationUrl = payload?.debug?.verificationUrl?.trim();
      const retryAfterMs = resolveParentVerificationRetryAfterMs(payload?.retryAfterMs);
      trackKangurClientEvent('kangur_parent_account_resend_sent', {
        callbackUrl,
        hasPassword: payload?.hasPassword === true,
      });
      setVerificationDebugUrl(
        debugVerificationUrl && debugVerificationUrl.length > 0 ? debugVerificationUrl : null
      );
      startResendCooldown(retryAfterMs);
      setNotice(payload?.message?.trim() || 'Wysłaliśmy nowy link potwierdzający.');
    } catch {
      trackKangurClientEvent('kangur_parent_account_resend_failed', {
        callbackUrl,
        reason: 'network_error',
      });
      setError('Nie udało się wysłać nowego e-maila potwierdzającego. Spróbuj ponownie.');
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
    setNotice('Sprawdzamy e-mail...');
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
        const { message } = await readApiErrorDetails(response);
        trackKangurClientEvent('kangur_parent_email_verify_failed', {
          callbackUrl,
          statusCode: response.status,
        });
        setError(message ?? 'Ten link weryfikacyjny jest nieważny albo wygasł.');
        setNotice(null);
        return;
      }

      const payload = parseKangurParentEmailVerifyResponse(await response.json().catch(() => null));
      trackKangurClientEvent('kangur_parent_email_verified', {
        callbackUrl,
      });
      clearOneTimeAuthParams();
      if (payload?.email) {
        setIdentifier(payload.email);
      }
      setParentAuthMode('sign-in');
      setPassword('');
      setNotice(
        payload?.message?.trim() || 'E-mail został zweryfikowany. Możesz zalogować się e-mailem i hasłem.'
      );
      await auth?.checkAppState?.();

      if (auth?.isAuthenticated) {
        await finishLogin(payload?.callbackUrl?.trim() || callbackUrl);
      }
    } catch {
      trackKangurClientEvent('kangur_parent_email_verify_failed', {
        callbackUrl,
        reason: 'network_error',
      });
      setError('Nie udało się zweryfikować e-maila. Spróbuj ponownie.');
      setNotice(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStudentSignIn = async (loginName: string): Promise<void> => {
    if (!KANGUR_LEARNER_LOGIN_PATTERN.test(loginName)) {
      setError('Nick ucznia może zawierać tylko litery i cyfry.');
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
        setError(payload?.error?.message || 'Nie udało się zalogować ucznia. Sprawdź login i hasło.');
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
      setError('Nie udało się zalogować ucznia. Spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) {
      setError('Wpisz e-mail rodzica albo nick ucznia.');
      return;
    }

    if (loginKind === 'parent') {
      if (!password.trim()) {
        setError(
          parentAuthMode === 'create-account'
            ? 'Wpisz hasło rodzica, aby utworzyc konto.'
            : 'Wpisz hasło rodzica.'
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
      setError('Wpisz hasło ucznia.');
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
      'Logowanie linkiem z e-maila nie jest już dostępne. Zaloguj się e-mailem i hasłem albo utwórz konto.'
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
    <KangurGlassPanel
      aria-labelledby={titleId}
      className='overflow-hidden shadow-[0_30px_90px_-44px_rgba(99,102,241,0.28)]'
      data-testid='kangur-login-shell'
      padding='xl'
      surface='playField'
      variant='soft'
    >
      <KangurGlassPanel
        className='relative mb-6 overflow-hidden'
        data-testid='kangur-login-hero'
        padding='lg'
        surface='warmGlow'
        variant='soft'
      >
        <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_16%,rgba(251,191,36,0.22),transparent_28%),radial-gradient(circle_at_88%_0%,rgba(99,102,241,0.16),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(45,212,191,0.12),transparent_32%)]' />
        <div className='relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div className='max-w-2xl'>
            <div className='flex items-center gap-3'>
              <div
                className='soft-card inline-flex items-center rounded-full border px-4 py-2 text-sm font-black tracking-[-0.03em] text-indigo-700 shadow-[0_18px_38px_-30px_rgba(99,102,241,0.28)]'
                data-testid='kangur-login-hero-logo'
              >
                <KangurHomeLogo
                  className='h-[22px] sm:h-[24px]'
                  idPrefix='kangur-login-page-logo'
                />
              </div>
              <div className='text-[10px] font-black uppercase tracking-[0.28em] text-[#9a5418]'>
                Konto StudiQ
              </div>
            </div>
            <KangurGradientHeading
              className='mt-3 text-[2rem] tracking-[-0.05em] sm:text-[2.65rem]'
              gradientClass='from-amber-500 via-orange-500 to-indigo-500'
              id={titleId}
              size='lg'
            >
              {loginFormContent?.title ?? 'Zaloguj się'}
            </KangurGradientHeading>
            <p className='mt-3 max-w-xl text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
              {introDescription}
            </p>
          </div>
          <div className={audienceBadgeClassName} style={audienceBadgeStyle}>
            {audienceLabel}
          </div>
        </div>
      </KangurGlassPanel>

      <form
        aria-busy={isSubmitting ? 'true' : 'false'}
        aria-describedby={formDescribedBy || undefined}
        className='flex flex-col gap-4'
        data-hydrated={isHydrated ? 'true' : 'false'}
        data-login-kind={loginKind}
        data-tutor-anchor='login_form'
        data-testid='kangur-login-form'
        onSubmit={handleSubmit}
        ref={loginFormRef}
      >
        {isParentFlowVisible ? (
          <div className='glass-panel rounded-[28px] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]'>
            <div className='grid gap-2 sm:grid-cols-2'>
              <KangurButton
                aria-pressed={parentAuthMode === 'sign-in'}
                disabled={!isHydrated || isSubmitting}
                fullWidth
                onClick={() => {
                  setParentAuthMode('sign-in');
                  setError(null);
                  setNotice(null);
                  setCreatedParentEmail(null);
                  setVerificationDebugUrl(null);
                }}
                size='md'
                type='button'
                variant={parentAuthMode === 'sign-in' ? 'segmentActive' : 'segment'}
              >
                Mam konto
              </KangurButton>
              <KangurButton
                aria-pressed={parentAuthMode === 'create-account'}
                disabled={!isHydrated || isSubmitting}
                fullWidth
                onClick={() => {
                  setParentAuthMode('create-account');
                  setError(null);
                  setNotice(null);
                  setCreatedParentEmail(null);
                  setVerificationDebugUrl(null);
                }}
                size='md'
                type='button'
                variant={parentAuthMode === 'create-account' ? 'segmentActive' : 'segment'}
              >
                Tworzę konto rodzica
              </KangurButton>
            </div>
          </div>
        ) : null}

        <div className='flex flex-col gap-2 text-sm font-semibold [color:var(--kangur-page-text)]'>
          <label htmlFor={identifierInputId}>{identifierFieldLabel}</label>
          <input
            autoComplete='username'
            aria-describedby={identifierInputDescribedBy || undefined}
            className={inputClassName}
            data-testid='kangur-login-identifier-input'
            data-tutor-anchor='login_identifier_field'
            disabled={!isHydrated || isSubmitting}
            id={identifierInputId}
            name='identifier'
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder={
              isParentFlowVisible && parentAuthMode === 'create-account'
                ? 'rodzic@example.com'
                : 'rodzic@example.com albo janek123'
            }
            ref={identifierInputRef}
            required
            type='text'
            value={identifier}
          />
          <span className='text-xs font-normal leading-5 [color:var(--kangur-page-muted-text)]' id={identifierHelpId}>
            {identifierFieldHelpText}
          </span>
        </div>

        <label className='flex flex-col gap-2 text-sm font-semibold [color:var(--kangur-page-text)]'>
          {isParentFlowVisible && parentAuthMode === 'create-account'
            ? 'Ustaw hasło rodzica'
            : 'Hasło'}
          <input
            autoComplete={
              isParentFlowVisible && parentAuthMode === 'create-account'
                ? 'new-password'
                : 'current-password'
            }
            aria-describedby={formDescribedBy || undefined}
            className={inputClassName}
            disabled={!isHydrated || isSubmitting}
            id={passwordInputId}
            name='password'
            onChange={(event) => setPassword(event.target.value)}
            placeholder={
              isParentFlowVisible && parentAuthMode === 'create-account'
                ? 'Ustaw hasło rodzica'
                : loginKind === 'parent'
                  ? 'Hasło rodzica'
                  : loginKind === 'student'
                    ? 'Hasło ucznia'
                    : 'Hasło'
            }
            required={loginKind === 'student'}
            type='password'
            value={password}
          />
        </label>
        {visibleNotice ? (
          <KangurGlassPanel
            aria-atomic='true'
            aria-live='polite'
            className='text-sm text-emerald-800'
            id={noticeId}
            padding='md'
            role='status'
            surface='successGlow'
            variant='soft'
          >
            {visibleNotice}
          </KangurGlassPanel>
        ) : null}
        {error ? (
          <KangurGlassPanel
            aria-atomic='true'
            aria-live='assertive'
            className='text-sm text-rose-700'
            id={errorId}
            padding='md'
            role='alert'
            surface='rose'
            variant='soft'
          >
            {error}
          </KangurGlassPanel>
        ) : null}
        {createdParentEmail ? (
          <KangurGlassPanel
            aria-atomic='true'
            aria-live='polite'
            className='text-sm [color:var(--kangur-page-text)]'
            padding='md'
            role='status'
            surface='warmGlow'
            variant='soft'
          >
            <p className='font-bold [color:var(--kangur-page-text)]'>
              Sprawdź skrzynkę: {createdParentEmail}
            </p>
            <p className='mt-1 leading-6'>{createAccountConfirmationDetail}</p>
            {resendAvailabilityMessage ? (
              <p className='mt-2 text-xs font-semibold uppercase tracking-[0.14em] [color:var(--kangur-page-muted-text)]'>
                {resendAvailabilityMessage}
              </p>
            ) : null}
            <KangurButton
              className='mt-3'
              disabled={isSubmitting || isResendCoolingDown}
              onClick={() => {
                void handleParentVerificationResend();
              }}
              size='sm'
              type='button'
              variant='surface'
            >
              {resendButtonLabel}
            </KangurButton>
          </KangurGlassPanel>
        ) : null}
        {verificationDebugUrl ? (
          <KangurButton asChild className='w-fit' size='sm' variant='surface'>
            <a href={verificationDebugUrl}>Potwierdź e-mail teraz</a>
          </KangurButton>
        ) : null}

        {isParentFlowVisible ? (
          <KangurButton
            disabled={!isHydrated || isSubmitting}
            fullWidth
            size='lg'
            type='submit'
            variant='primary'
          >
            {isSubmitting
              ? parentAuthMode === 'create-account'
                ? 'Tworzenie...'
                : 'Logowanie...'
              : parentAuthMode === 'create-account'
                ? 'Utwórz konto rodzica'
                : loginKind === 'parent'
                  ? 'Zaloguj rodzica'
                  : 'Zaloguj się'}
          </KangurButton>
        ) : (
          <KangurButton
            disabled={!isHydrated || isSubmitting}
            fullWidth
            size='lg'
            type='submit'
            variant='primary'
          >
            {isSubmitting ? 'Logowanie...' : 'Zaloguj ucznia'}
          </KangurButton>
        )}

      </form>
    </KangurGlassPanel>
  );
}

export function KangurLoginPage(props: KangurLoginPageProps): JSX.Element {
  const loginPageProps = props;

  return (
    <Suspense fallback={<div className='sr-only'>Ladowanie logowania StudiQ...</div>}>
      <KangurLoginPagePropsContext.Provider value={loginPageProps}>
        <KangurLoginPageContent />
      </KangurLoginPagePropsContext.Provider>
    </Suspense>
  );
}
