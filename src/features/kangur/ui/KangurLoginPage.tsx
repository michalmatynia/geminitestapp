'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import React, {
  Suspense,
  useCallback,
  useEffect,
  useId,
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
import {
  useLoginLogic,
  type KangurLoginKind,
  type KangurLoginSuccessStage,
} from '@/features/kangur/ui/login-page/use-login-logic';
import { useTurnstile } from '@/features/kangur/ui/login-page/use-turnstile';
import { LoadingState } from '@/features/kangur/shared/ui';

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

const PARENT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type KangurLoginSubmitStage =
  | 'idle'
  | 'clearing-session'
  | 'verifying-credentials'
  | 'signing-in-parent'
  | 'signing-in-student'
  | 'refreshing-session'
  | 'redirecting'
  | 'creating-account'
  | 'sending-verification';

type KangurLoginInputErrorTarget = 'identifier' | 'password' | 'both';

const isValidParentEmail = (value: string): boolean =>
  PARENT_EMAIL_PATTERN.test(value.trim());

const normalizeParentEmail = (value: string): string => value.trim().toLowerCase();

const resolveCredentialErrorTarget = (
  identifierValue: string,
  passwordValue: string
): KangurLoginInputErrorTarget => {
  const isIdentifierMissing = !identifierValue.trim();
  const isPasswordMissing = !passwordValue.trim();

  if (isIdentifierMissing && isPasswordMissing) {
    return 'both';
  }
  return isIdentifierMissing ? 'identifier' : 'password';
};

const clearLearnerSession = async (): Promise<void> => {
  await fetch('/api/kangur/auth/learner-signout', {
    method: 'POST',
    credentials: 'same-origin',
  });
};

const resetSessionsBeforeParentLogin = async (): Promise<void> => {
  await Promise.allSettled([clearLearnerSession()]);
};

const resetSessionsBeforeStudentLogin = async (): Promise<void> => {
  await Promise.allSettled([clearLearnerSession(), signOut({ redirect: false })]);
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
  changeEmailLabel?: string | null;
  onChangeEmail?: (() => void) | null;
  continueToSignInLabel?: string | null;
  onContinueToSignIn?: (() => void) | null;
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
  changeEmailLabel,
  onChangeEmail,
  continueToSignInLabel,
  onContinueToSignIn,
  onResend,
}: VerificationCardProps): React.JSX.Element {
  const translations = useTranslations('KangurLogin');

  return (
    <div className='mt-6 rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm'>
      <div className='text-sm font-semibold text-slate-900'>
        {translations('checkInboxLabel', { email })}
      </div>
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
          rel='noopener noreferrer'
        >
          {translations('verifyEmailNow')}
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
        {changeEmailLabel && onChangeEmail ? (
          <KangurButton
            type='button'
            variant='ghost'
            size='sm'
            onClick={onChangeEmail}
            className='justify-start px-0'
          >
            {changeEmailLabel}
          </KangurButton>
        ) : null}
        {continueToSignInLabel && onContinueToSignIn ? (
          <KangurButton
            type='button'
            variant='ghost'
            size='sm'
            onClick={onContinueToSignIn}
            className='justify-start px-0'
          >
            {continueToSignInLabel}
          </KangurButton>
        ) : null}
      </div>
    </div>
  );
}

export function KangurLoginPageContent(): React.JSX.Element {
  const translations = useTranslations('KangurLogin');
  const searchParams = useSearchParams();
  const {
    callbackUrl,
    defaultCallbackUrl,
    parentAuthMode,
    showParentAuthModeTabs = true,
  } = useKangurLoginPageProps();
  const auth = useOptionalKangurAuth();
  const { isLoading, setIsLoading, successMessage, handleLoginSuccess } = useLoginLogic();
  const loginFormEntry = useKangurPageContentEntry('login-page-form');
  const identifierEntry = useKangurPageContentEntry('login-page-identifier-field');

  const [authMode, setAuthMode] = useState<KangurAuthMode>(parentAuthMode ?? 'sign-in');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [inputErrorTarget, setInputErrorTarget] = useState<KangurLoginInputErrorTarget | null>(
    null
  );
  const [verificationCard, setVerificationCard] = useState<VerificationCardState | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [resendCooldownLabel, setResendCooldownLabel] = useState<string | null>(null);
  const [submitStage, setSubmitStage] = useState<KangurLoginSubmitStage>('idle');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const identifierInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const verifyAttemptedRef = useRef(false);
  const initialFocusAppliedRef = useRef(false);
  const resendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const identifierHintId = useId();
  const passwordHintId = useId();
  const formErrorId = useId();
  const formNoticeId = useId();
  const successMessageId = useId();

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
  const isEmailIdentifierField = authMode === 'create-account' || loginKind === 'parent';
  const identifierInputType = isEmailIdentifierField ? 'email' : 'text';
  const authModeHint = useMemo(() => {
    if (authMode === 'create-account') {
      return translations('createAccountModeHint');
    }
    if (loginKind === 'parent') {
      return translations('parentLoginModeHint');
    }
    if (loginKind === 'student') {
      return translations('studentLoginModeHint');
    }
    return translations('signInModeHint');
  }, [authMode, loginKind, translations]);
  const clearInlineFeedback = useCallback(
    (options?: { resetStage?: boolean }) => {
      setFormError(null);
      setFormNotice(null);
      setInputErrorTarget(null);
      if (options?.resetStage !== false && submitStage !== 'idle') {
        setSubmitStage('idle');
      }
    },
    [submitStage]
  );
  const showInputError = useCallback(
    (message: string, target: KangurLoginInputErrorTarget) => {
      setFormError(message);
      setFormNotice(null);
      setInputErrorTarget(target);
      if (submitStage !== 'idle') {
        setSubmitStage('idle');
      }
    },
    [submitStage]
  );
  const showFormError = useCallback(
    (message: string) => {
      setFormError(message);
      setFormNotice(null);
      setInputErrorTarget(null);
      if (submitStage !== 'idle') {
        setSubmitStage('idle');
      }
    },
    [submitStage]
  );
  const passwordHelperText = useMemo(() => {
    if (authMode === 'create-account') {
      return translations('createAccountPasswordHint');
    }
    if (loginKind === 'parent') {
      return translations('parentPasswordHint');
    }
    return translations('studentPasswordHint');
  }, [authMode, loginKind, translations]);
  const submitButtonLabel = useMemo(() => {
    if (isLoading) {
      if (submitStage === 'creating-account' || submitStage === 'sending-verification') {
        return translations('createAccountSubmitting');
      }
      if (submitStage === 'refreshing-session' || submitStage === 'redirecting') {
        return translations('openingSpaceButtonLabel');
      }
      return translations('loginSubmitting');
    }

    if (authMode === 'create-account') {
      return translations('submitCreateAccount');
    }
    if (loginKind === 'parent') {
      return translations('submitParentLogin');
    }
    return translations('submitStudentLogin');
  }, [authMode, isLoading, loginKind, submitStage, translations]);
  const submitStageNotice = useMemo(() => {
    if (!isLoading) {
      return null;
    }

    switch (submitStage) {
      case 'clearing-session':
        return translations('sessionResettingNotice');
      case 'verifying-credentials':
        return translations('verifyingCredentialsNotice');
      case 'signing-in-parent':
        return translations('signingInParentNotice');
      case 'signing-in-student':
        return translations('signingInStudentNotice');
      case 'refreshing-session':
        return translations('refreshingSessionNotice');
      case 'redirecting':
        return translations('redirectingNotice');
      case 'creating-account':
        return translations('creatingAccountNotice');
      case 'sending-verification':
        return translations('sendingVerificationNotice');
      case 'idle':
      default:
        return null;
    }
  }, [isLoading, submitStage, translations]);
  const activeFormNotice = submitStageNotice ?? formNotice;
  const isIdentifierInvalid =
    inputErrorTarget === 'identifier' || inputErrorTarget === 'both';
  const isPasswordInvalid = inputErrorTarget === 'password' || inputErrorTarget === 'both';
  const sharedFieldFeedbackId = formError
    ? formErrorId
    : activeFormNotice
      ? formNoticeId
      : successMessage
        ? successMessageId
        : null;
  const identifierDescribedBy = [identifierHintId, sharedFieldFeedbackId]
    .filter(Boolean)
    .join(' ');
  const passwordDescribedBy = [passwordHintId, sharedFieldFeedbackId]
    .filter(Boolean)
    .join(' ');

  const sessionTitle = loginFormEntry.entry?.title ?? translations('defaultSessionTitle');
  const sessionDescription =
    loginFormEntry.entry?.summary ?? translations('defaultSessionDescription');

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

  const handleCaptchaLoadError = useCallback(() => {
    setCaptchaToken(null);
    showFormError(translations('captchaVerificationFailed'));
  }, [showFormError, translations]);

  const showVerificationCard = Boolean(verificationCard);
  const showForm = authMode !== 'create-account' || !showVerificationCard;
  const isCaptchaRequired =
    authMode === 'create-account' && Boolean(KANGUR_PARENT_CAPTCHA_SITE_KEY);
  const isSubmitDisabled =
    isLoading ||
    !identifier.trim() ||
    !password.trim() ||
    (authMode === 'create-account' && isCaptchaRequired && !captchaToken);

  const { containerRef: captchaContainerRef } = useTurnstile({
    enabled: isCaptchaRequired && showForm,
    onVerify: handleCaptchaVerify,
    onError: handleCaptchaReset,
    onExpire: handleCaptchaReset,
    onLoadError: handleCaptchaLoadError,
  });

  const clearResendCooldown = useCallback(() => {
    if (resendTimerRef.current) {
      clearTimeout(resendTimerRef.current);
      resendTimerRef.current = null;
    }
    setResendCooldownLabel(null);
  }, []);

  const formatCooldownLabel = useCallback(
    (ms: number): string => {
      const seconds = Math.max(1, Math.ceil(ms / 1000));
      if (seconds >= 60 && seconds % 60 === 0) {
        return translations('cooldownMinutes', { count: seconds / 60 });
      }
      return translations('cooldownSeconds', { count: seconds });
    },
    [translations]
  );

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
    [formatCooldownLabel]
  );

  const clearVerificationState = useCallback(() => {
    setVerificationCard(null);
    clearResendCooldown();
  }, [clearResendCooldown]);

  const scheduleFieldFocus = useCallback((target: 'identifier' | 'password') => {
    if (typeof window === 'undefined') {
      return;
    }
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }
    focusTimerRef.current = window.setTimeout(() => {
      focusTimerRef.current = null;
      const field =
        target === 'password' ? passwordInputRef.current : identifierInputRef.current;
      field?.focus();
      field?.select();
    }, 0);
  }, []);

  const handleChangeVerificationEmail = useCallback(() => {
    clearVerificationState();
    clearInlineFeedback();
    scheduleFieldFocus('identifier');
  }, [clearInlineFeedback, clearVerificationState, scheduleFieldFocus]);

  const normalizeIdentifierOnBlur = useCallback(() => {
    const nextIdentifier =
      authMode === 'create-account' || loginKind === 'parent'
        ? normalizeParentEmail(identifier)
        : identifier.trim();

    if (nextIdentifier === identifier) {
      return;
    }

    setIdentifier(nextIdentifier);
    clearInlineFeedback();
  }, [authMode, clearInlineFeedback, identifier, loginKind]);

  const loginTitle = loginFormEntry.entry?.title ?? translations('defaultLoginTitle');
  const loginSummary = loginFormEntry.entry?.summary ?? null;
  const identifierLabel =
    authMode === 'create-account'
      ? translations('createAccountIdentifierLabel')
      : identifierEntry.entry?.title ?? translations('identifierLabel');
  const identifierPlaceholder =
    authMode === 'create-account'
      ? translations('createAccountIdentifierPlaceholder')
      : translations('identifierPlaceholder');

  useEffect(() => {
    return () => {
      if (resendTimerRef.current) {
        clearTimeout(resendTimerRef.current);
        resendTimerRef.current = null;
      }
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (initialFocusAppliedRef.current) {
      return;
    }
    if (isLoading || showVerificationCard || verifyEmailToken || magicLinkToken) {
      return;
    }
    initialFocusAppliedRef.current = true;
    scheduleFieldFocus(identifier.trim() ? 'password' : 'identifier');
  }, [
    identifier,
    isLoading,
    magicLinkToken,
    scheduleFieldFocus,
    showVerificationCard,
    verifyEmailToken,
  ]);

  useEffect(() => {
    if (magicLinkToken) {
      showFormError(translations('magicLinkDeprecatedNotice'));
      return;
    }

    if (!verifyEmailToken || verifyAttemptedRef.current) {
      return;
    }

    verifyAttemptedRef.current = true;

    const verifyEmail = async (): Promise<void> => {
      setIsLoading(true);
      clearInlineFeedback({ resetStage: false });
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
          showFormError(
            typeof payload['error'] === 'string'
              ? payload['error']
              : translations('verifyParentEmailFailed')
          );
          return;
        }
        if (typeof payload['email'] === 'string') {
          setIdentifier(payload['email']);
        }
        if (typeof payload['message'] === 'string') {
          setFormNotice(payload['message']);
          setInputErrorTarget(null);
        }
        setPassword('');
        setIsPasswordVisible(false);
        setAuthMode('sign-in');
        scheduleFieldFocus(typeof payload['email'] === 'string' ? 'password' : 'identifier');
        await auth?.checkAppState?.();
      } catch {
        showFormError(translations('verifyParentEmailFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    void verifyEmail();
  }, [
    auth,
    clearInlineFeedback,
    clearVerificationState,
    magicLinkToken,
    scheduleFieldFocus,
    setIsLoading,
    showFormError,
    translations,
    verifyEmailToken,
  ]);

  const handleModeSwitch = (nextMode: KangurAuthMode) => {
    if (nextMode === authMode) return;
    setAuthMode(nextMode);
    setPassword('');
    setIsPasswordVisible(false);
    clearInlineFeedback();
    if (nextMode === 'sign-in') {
      clearVerificationState();
    }
    setCaptchaToken(null);
    scheduleFieldFocus(identifier.trim() ? 'password' : 'identifier');
  };

  const handleCreateAccount = async (): Promise<void> => {
    const email = normalizeParentEmail(identifier);
    if (!email || !password.trim()) {
      showInputError(
        translations('fillEmailAndPassword'),
        resolveCredentialErrorTarget(email, password)
      );
      return;
    }
    if (!isValidParentEmail(email)) {
      showInputError(translations('invalidParentEmailNotice'), 'identifier');
      return;
    }
    if (password.trim().length < 8) {
      showInputError(translations('passwordRequirement'), 'password');
      return;
    }

    const captchaRequired = Boolean(KANGUR_PARENT_CAPTCHA_SITE_KEY);
    if (captchaRequired && !captchaToken) {
      showFormError(translations('completeSecurityVerification'));
      return;
    }

    setIsLoading(true);
    setIdentifier(email);
    clearInlineFeedback({ resetStage: false });
    setSubmitStage('creating-account');
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
      const serverMessage =
        typeof payload['message'] === 'string'
          ? payload['message']
          : translations('createAccountInstruction');
      const accountReady =
        payload['emailVerified'] === true && payload['hasPassword'] === true;

      if (response.ok && payload['ok'] === true) {
        if (accountReady) {
          clearVerificationState();
          setAuthMode('sign-in');
          setIdentifier(email);
          setPassword('');
          setIsPasswordVisible(false);
          setFormNotice(serverMessage);
          scheduleFieldFocus('password');
        } else {
          setVerificationCard({
            email,
            message: serverMessage,
            verificationUrl,
          });
          setPassword('');
          setIsPasswordVisible(false);
          scheduleResendCooldown(retryAfterMs, { forceDefault: true });
        }
        return;
      }

      const isRateLimited = payload['code'] === 'RATE_LIMITED' || response.status === 429;
      if (isRateLimited) {
        setVerificationCard({
          email,
          message: serverMessage,
          error: typeof payload['error'] === 'string' ? payload['error'] : null,
          verificationUrl,
        });
        setPassword('');
        setIsPasswordVisible(false);
        scheduleResendCooldown(retryAfterMs, { forceDefault: true });
        return;
      }

      showFormError(
        typeof payload['error'] === 'string'
          ? payload['error']
          : translations('createParentAccountFailed')
      );
    } catch {
      showFormError(translations('createParentAccountUnexpected'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (): Promise<void> => {
    if (!verificationCard?.email || resendCooldownLabel) {
      return;
    }

    setIsLoading(true);
    clearInlineFeedback({ resetStage: false });
    setSubmitStage('sending-verification');

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
        error: translations('resendEmailUnexpected'),
        verificationUrl: verificationCard.verificationUrl ?? null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleParentLogin = async (): Promise<void> => {
    const email = normalizeParentEmail(identifier);
    if (!email || !password.trim()) {
      showInputError(
        translations('enterParentEmailAndPassword'),
        resolveCredentialErrorTarget(email, password)
      );
      return;
    }
    if (!isValidParentEmail(email)) {
      showInputError(translations('invalidParentEmailNotice'), 'identifier');
      return;
    }

    setIsLoading(true);
    setIdentifier(email);
    clearInlineFeedback({ resetStage: false });
    setSubmitStage('clearing-session');
    clearVerificationState();

    try {
      await resetSessionsBeforeParentLogin();
      setSubmitStage('verifying-credentials');

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
            message: translations('emailUnverifiedNotice'),
            error: null,
            verificationUrl: null,
          });
          setPassword('');
          setIsPasswordVisible(false);
          scheduleResendCooldown(null);
          return;
        }

        if (code === 'PASSWORD_SETUP_REQUIRED') {
          setAuthMode('create-account');
          setIdentifier(email);
          setPassword('');
          setIsPasswordVisible(false);
          setFormNotice(translations('passwordSetupRequiredNotice'));
          scheduleFieldFocus('password');
          return;
        }

        showFormError(
          typeof verifyPayload['message'] === 'string'
            ? verifyPayload['message']
            : translations('parentLoginFailed')
        );
        return;
      }

      if (!verifyResponse.ok) {
        showFormError(translations('parentLoginFailed'));
        return;
      }

      setSubmitStage('signing-in-parent');
      const signInResult = await signIn('credentials', {
        email,
        password,
        callbackUrl: callbackValue,
        redirect: false,
      });
      if (!signInResult?.ok || signInResult.error) {
        showFormError(translations('parentLoginFailed'));
        return;
      }

      await handleLoginSuccess({
        kind: 'parent',
        callbackUrl: typeof signInResult.url === 'string' ? signInResult.url : callbackValue,
        onStageChange: (stage: KangurLoginSuccessStage) => setSubmitStage(stage),
      });
    } catch {
      showFormError(translations('parentLoginUnexpected'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentLogin = async (): Promise<void> => {
    const loginName = identifier.trim();
    if (!loginName || !password.trim()) {
      showInputError(
        translations('enterStudentLoginAndPassword'),
        resolveCredentialErrorTarget(loginName, password)
      );
      return;
    }

    if (!KANGUR_LEARNER_LOGIN_PATTERN.test(loginName)) {
      showInputError(translations('invalidLearnerLoginNotice'), 'identifier');
      return;
    }

    setIsLoading(true);
    clearInlineFeedback({ resetStage: false });
    setSubmitStage('clearing-session');
    clearVerificationState();

    try {
      await resetSessionsBeforeStudentLogin();
      setSubmitStage('signing-in-student');

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
        showFormError(
          typeof payload['error'] === 'string'
            ? payload['error']
            : translations('studentLoginFailed')
        );
        return;
      }

      await handleLoginSuccess({
        kind: 'student',
        learnerId: typeof payload['learnerId'] === 'string' ? payload['learnerId'] : null,
        onStageChange: (stage: KangurLoginSuccessStage) => setSubmitStage(stage),
      });
    } catch {
      showFormError(translations('studentLoginUnexpected'));
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
    ? translations('resendEmailIn', { label: resendCooldownLabel })
    : translations('resendEmail');
  const resendHelper = resendCooldownLabel
    ? translations('resendHelper', { label: resendCooldownLabel })
    : null;

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
            {showParentAuthModeTabs ? (
              <div className={KANGUR_SEGMENTED_CONTROL_CLASSNAME}>
                <KangurButton
                  type='button'
                  variant={authMode === 'sign-in' ? 'segmentActive' : 'segment'}
                  size='sm'
                  aria-pressed={authMode === 'sign-in'}
                  onClick={() => handleModeSwitch('sign-in')}
                >
                  {translations('haveAccount')}
                </KangurButton>
                <KangurButton
                  type='button'
                  variant={authMode === 'create-account' ? 'segmentActive' : 'segment'}
                  size='sm'
                  aria-pressed={authMode === 'create-account'}
                  onClick={() => handleModeSwitch('create-account')}
                >
                  {translations('createAccount')}
                </KangurButton>
              </div>
            ) : null}

            <div
              data-testid='kangur-login-mode-hint'
              className='mt-4 rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-600'
            >
              {authModeHint}
            </div>

            {showForm ? (
              <form
                ref={formRef}
                data-testid='kangur-login-form'
                data-hydrated='true'
                data-login-kind={loginKind}
                data-tutor-anchor='login_form'
                aria-busy={isLoading ? 'true' : 'false'}
                noValidate
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
                    type={identifierInputType}
                    aria-label={identifierLabel}
                    aria-invalid={isIdentifierInvalid ? 'true' : 'false'}
                    aria-describedby={identifierDescribedBy || undefined}
                    value={identifier}
                    onChange={(event) => {
                      setIdentifier(event.target.value);
                      clearInlineFeedback();
                    }}
                    onBlur={normalizeIdentifierOnBlur}
                    disabled={isLoading}
                    data-testid='kangur-login-identifier-input'
                    data-tutor-anchor='login_identifier_field'
                    className='rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    placeholder={identifierPlaceholder}
                    autoComplete={isEmailIdentifierField ? 'email' : 'username'}
                    inputMode={isEmailIdentifierField ? 'email' : 'text'}
                    autoCapitalize='off'
                    autoCorrect='off'
                    spellCheck={false}
                  />
                  <p
                    id={identifierHintId}
                    data-testid='kangur-login-identifier-hint'
                    className='text-xs text-slate-500'
                  >
                    {authModeHint}
                  </p>
                </div>

                <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
                  <label htmlFor='password' className='text-sm font-medium text-slate-700'>
                    {translations('passwordLabel')}
                  </label>
                  <div className='relative'>
                    <input
                      ref={passwordInputRef}
                      id='password'
                      name='password'
                      type={isPasswordVisible ? 'text' : 'password'}
                      aria-label={translations('passwordLabel')}
                      aria-invalid={isPasswordInvalid ? 'true' : 'false'}
                      aria-describedby={passwordDescribedBy || undefined}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        clearInlineFeedback();
                      }}
                      disabled={isLoading}
                      className='w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                      placeholder={translations('passwordPlaceholder')}
                      autoComplete={authMode === 'create-account' ? 'new-password' : 'current-password'}
                    />
                    <button
                      type='button'
                      onClick={() => setIsPasswordVisible((current) => !current)}
                      disabled={isLoading}
                      className='absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600'
                      aria-label={
                        isPasswordVisible
                          ? translations('hidePassword')
                          : translations('showPassword')
                      }
                      data-testid='kangur-login-password-toggle'
                    >
                      {isPasswordVisible ? (
                        <EyeOff className='h-4 w-4' aria-hidden='true' />
                      ) : (
                        <Eye className='h-4 w-4' aria-hidden='true' />
                      )}
                    </button>
                  </div>
                  <p
                    id={passwordHintId}
                    data-testid='kangur-login-password-hint'
                    className='text-xs text-slate-500'
                  >
                    {passwordHelperText}
                  </p>
                </div>

                {authMode === 'create-account' && isCaptchaRequired ? (
                  <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
                    <div
                      ref={captchaContainerRef}
                      className='min-h-[65px] self-center'
                      aria-label={translations('securityVerificationLabel')}
                    />
                  </div>
                ) : null}

                {formError ? (
                  <div
                    id={formErrorId}
                    role='alert'
                    className='rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600'
                  >
                    {formError}
                  </div>
                ) : null}

                {activeFormNotice ? (
                  <div
                    id={formNoticeId}
                    role='status'
                    aria-live='polite'
                    className='rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-600'
                  >
                    {activeFormNotice}
                  </div>
                ) : null}

                {successMessage ? (
                  <div
                    id={successMessageId}
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
                  {submitButtonLabel}
                </KangurButton>
              </form>
            ) : null}

            {verificationCard ? (
              <ParentVerificationCard
                {...verificationCard}
                resendLabel={resendLabel}
                resendDisabled={Boolean(resendCooldownLabel) || isLoading}
                resendHelper={resendHelper}
                changeEmailLabel={
                  authMode === 'create-account'
                    ? translations('changeEmailAction')
                    : null
                }
                onChangeEmail={authMode === 'create-account' ? handleChangeVerificationEmail : null}
                continueToSignInLabel={
                  authMode === 'create-account'
                    ? translations('continueToSignInAction')
                    : null
                }
                onContinueToSignIn={
                  authMode === 'create-account'
                    ? () => handleModeSwitch('sign-in')
                    : null
                }
                onResend={() => void handleResendVerification()}
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
  const translations = useTranslations('KangurLogin');
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
      <Suspense fallback={<LoadingState className='h-64' message={translations('loading')} />}>
        <KangurLoginPageContent />
      </Suspense>
    </KangurLoginPagePropsContext.Provider>
  );
}

export { resolveKangurLoginCallbackNavigation } from '@/features/kangur/ui/login-page/use-login-logic';

export default KangurLoginPage;
