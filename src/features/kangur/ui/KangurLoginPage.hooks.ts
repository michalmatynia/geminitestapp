'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS } from '@/features/kangur/settings';
import { useOptionalFrontendPublicOwner } from '@/features/kangur/ui/FrontendPublicOwnerContext';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';
import {
  type KangurAuthMode,
} from '@/features/kangur/shared/contracts/kangur-auth';
import {
  KANGUR_PARENT_CAPTCHA_SITE_KEY,
} from '@/features/kangur/ui/login-page/login-constants';
import {
  useKangurLoginPageProps,
} from '@/features/kangur/ui/login-page/login-context';
import {
  useLoginLogic,
} from '@/features/kangur/ui/login-page/use-login-logic';
import { useTurnstile } from '@/features/kangur/ui/login-page/use-turnstile';
import {
  isValidParentEmail,
  normalizeParentEmail,
  parseJsonResponse,
  resolveCredentialErrorTarget,
  resolveLoginKind,
  type KangurLoginInputErrorTarget,
  type KangurLoginSubmitStage,
  type VerificationCardState,
} from './KangurLoginPage.utils';

export function useKangurLoginPageState() {
  const translations = useTranslations('KangurLogin');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const frontendPublicOwner = useOptionalFrontendPublicOwner();
  const routing = useOptionalKangurRouting();
  const { sanitizeManagedHref } = useKangurRouteAccess();
  const {
    callbackUrl,
    defaultCallbackUrl,
    parentAuthMode,
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

  const loginKind = useMemo(
    () => resolveLoginKind(identifier, authMode),
    [identifier, authMode]
  );

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

  const currentOrigin = typeof window === 'undefined' ? null : window.location.origin;
  const normalizeLoginCallbackHref = useCallback(
    (href: string | null | undefined): string | undefined =>
      sanitizeManagedHref({
        href,
        pathname,
        currentOrigin,
        canonicalizePublicAlias: frontendPublicOwner?.publicOwner === 'kangur',
        basePath: routing?.basePath,
        fallbackHref: defaultCallbackUrl,
      }),
    [
      currentOrigin,
      defaultCallbackUrl,
      frontendPublicOwner?.publicOwner,
      pathname,
      routing?.basePath,
      sanitizeManagedHref,
    ]
  );

  const callbackValue =
    normalizeLoginCallbackHref(callbackUrl ?? defaultCallbackUrl) ?? defaultCallbackUrl;

  const isCaptchaRequired =
    authMode === 'create-account' && Boolean(KANGUR_PARENT_CAPTCHA_SITE_KEY);

  const { containerRef: captchaContainerRef } = useTurnstile({
    enabled: isCaptchaRequired && (authMode !== 'create-account' || !verificationCard),
    onVerify: (token) => setCaptchaToken(token),
    onError: () => setCaptchaToken(null),
    onExpire: () => setCaptchaToken(null),
    onLoadError: () => {
      setCaptchaToken(null);
      showFormError(translations('captchaVerificationFailed'));
    },
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

  const clearVerificationState = useCallback(() => {
    setVerificationCard(null);
    clearResendCooldown();
  }, [clearResendCooldown]);

  useEffect(() => {
    if (initialFocusAppliedRef.current) {
      return;
    }
    initialFocusAppliedRef.current = true;
    scheduleFieldFocus(identifier.trim() ? 'password' : 'identifier');
  }, [identifier, scheduleFieldFocus]);

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

  return {
    translations,
    authMode,
    setAuthMode,
    identifier,
    setIdentifier,
    password,
    setPassword,
    formError,
    formNotice,
    setFormNotice,
    inputErrorTarget,
    verificationCard,
    setVerificationCard,
    captchaToken,
    resendCooldownLabel,
    submitStage,
    setSubmitStage,
    isPasswordVisible,
    setIsPasswordVisible,
    identifierInputRef,
    passwordInputRef,
    identifierHintId,
    passwordHintId,
    formErrorId,
    formNoticeId,
    successMessageId,
    loginKind,
    isLoading,
    setIsLoading,
    successMessage,
    handleLoginSuccess,
    loginFormEntry,
    identifierEntry,
    clearInlineFeedback,
    showInputError,
    showFormError,
    callbackValue,
    captchaContainerRef,
    clearVerificationState,
    scheduleFieldFocus,
    handleModeSwitch,
    scheduleResendCooldown,
    normalizeLoginCallbackHref,
    handleResendVerification,
  };
}
