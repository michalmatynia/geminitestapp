'use client';

import { Eye, EyeOff } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import React, {
  Suspense,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { getKangurHomeHref } from '@/features/kangur/config/routing';
import { useOptionalFrontendPublicOwner } from '@/features/kangur/ui/FrontendPublicOwnerContext';
import { useKangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';
import {
  resolveRouteAwareManagedKangurHref,
} from '@/features/kangur/ui/routing/managed-paths';
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
import { LoadingState } from '@/features/kangur/shared/ui';
import { useKangurLoginPageState } from './KangurLoginPage.hooks';
import { ParentVerificationCard } from './KangurLoginPage.components';
import {
  isValidParentEmail,
  normalizeParentEmail,
  parseJsonResponse,
  resetSessionsBeforeParentLogin,
  resetSessionsBeforeStudentLogin,
  resolveCredentialErrorTarget,
} from './KangurLoginPage.utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export function KangurLoginPageContent(): React.JSX.Element {
  const state = useKangurLoginPageState();
  const { showParentAuthModeTabs } = useKangurLoginPageProps();
  const {
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
  } = state;

  const formRef = useRef<HTMLFormElement>(null);

  useKangurTutorAnchor({
    id: 'kangur-auth-login-form',
    kind: 'login_form',
    ref: formRef,
    surface: 'auth',
    enabled: true,
    priority: 100,
    metadata: { label: 'Sekcja logowania' },
  });

  useKangurTutorAnchor({
    id: 'kangur-auth-login-identifier-field',
    kind: 'login_identifier_field',
    ref: identifierInputRef,
    surface: 'auth',
    enabled: true,
    priority: 120,
    metadata: { label: 'Pole identyfikatora' },
  });

  const isEmailIdentifierField = authMode === 'create-account' || loginKind === 'parent';
  const identifierInputType = isEmailIdentifierField ? 'email' : 'text';
  const identifierLabel =
    identifierEntry.entry?.title ??
    (isEmailIdentifierField
      ? translations('parentEmailLabel')
      : translations('identifierLabel'));

  const authModeHint = useMemo(() => {
    if (authMode === 'create-account') return translations('createAccountModeHint');
    if (loginKind === 'parent') return translations('parentLoginModeHint');
    if (loginKind === 'student') return translations('studentLoginModeHint');
    return translations('signInModeHint');
  }, [authMode, loginKind, translations]);

  const passwordHelperText = useMemo(() => {
    if (authMode === 'create-account') return translations('createAccountPasswordHint');
    if (loginKind === 'parent') return translations('parentPasswordHint');
    return translations('studentPasswordHint');
  }, [authMode, loginKind, translations]);

  const handleIdentifierBlur = () => {
    const normalizedIdentifier = isEmailIdentifierField
      ? normalizeParentEmail(identifier)
      : identifier.trim();

    if (normalizedIdentifier !== identifier) {
      setIdentifier(normalizedIdentifier);
    }
  };

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
    if (authMode === 'create-account') return translations('submitCreateAccount');
    if (loginKind === 'parent') return translations('submitParentLogin');
    return translations('submitStudentLogin');
  }, [authMode, isLoading, loginKind, submitStage, translations]);

  const submitStageNotice = useMemo(() => {
    if (!isLoading) return null;
    switch (submitStage) {
      case 'clearing-session': return translations('sessionResettingNotice');
      case 'verifying-credentials': return translations('verifyingCredentialsNotice');
      case 'signing-in-parent': return translations('signingInParentNotice');
      case 'signing-in-student': return translations('signingInStudentNotice');
      case 'refreshing-session': return translations('refreshingSessionNotice');
      case 'redirecting': return translations('redirectingNotice');
      case 'creating-account': return translations('creatingAccountNotice');
      case 'sending-verification': return translations('sendingVerificationNotice');
      default: return null;
    }
  }, [isLoading, submitStage, translations]);

  const activeFormNotice = submitStageNotice ?? formNotice;
  const isIdentifierInvalid = inputErrorTarget === 'identifier' || inputErrorTarget === 'both';
  const isPasswordInvalid = inputErrorTarget === 'password' || inputErrorTarget === 'both';
  
  const sharedFieldFeedbackId = formError ? formErrorId : activeFormNotice ? formNoticeId : successMessage ? successMessageId : null;
  const identifierDescribedBy = [identifierHintId, sharedFieldFeedbackId].filter(Boolean).join(' ');
  const passwordDescribedBy = [passwordHintId, sharedFieldFeedbackId].filter(Boolean).join(' ');

  useKangurAiTutorSessionSync({
    learnerId: null,
    sessionContext: {
      surface: 'auth',
      contentId: 'auth:login:sign-in',
      title: loginFormEntry.entry?.title ?? translations('defaultSessionTitle'),
      description: loginFormEntry.entry?.summary ?? translations('defaultSessionDescription'),
    },
  });

  const handleCreateAccount = async (): Promise<void> => {
    const email = normalizeParentEmail(identifier);
    if (!email || !password.trim()) {
      showInputError(translations('fillEmailAndPassword'), resolveCredentialErrorTarget(email, password));
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
    if (Boolean(KANGUR_PARENT_CAPTCHA_SITE_KEY) && !captchaToken) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, callbackUrl: callbackValue, captchaToken: captchaToken ?? undefined }),
      });
      const payload = await parseJsonResponse(response);
      if (response.ok && payload['ok'] === true) {
        if (payload['emailVerified'] === true && payload['hasPassword'] === true) {
          setAuthMode('sign-in');
          setPassword('');
          setFormNotice(typeof payload['message'] === 'string' ? payload['message'] : translations('createAccountInstruction'));
          scheduleFieldFocus('password');
        } else {
          setVerificationCard({ email, message: typeof payload['message'] === 'string' ? payload['message'] : translations('createAccountInstruction') });
          scheduleResendCooldown(typeof payload['retryAfterMs'] === 'number' ? payload['retryAfterMs'] : null, { forceDefault: true });
        }
        return;
      }
      showFormError(typeof payload['error'] === 'string' ? payload['error'] : translations('createParentAccountFailed'));
    } catch {
      showFormError(translations('createParentAccountUnexpected'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleParentLogin = async (): Promise<void> => {
    const email = normalizeParentEmail(identifier);
    if (!email || !password.trim()) {
      showInputError(translations('enterParentEmailAndPassword'), resolveCredentialErrorTarget(email, password));
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
    try {
      await resetSessionsBeforeParentLogin();
      setSubmitStage('verifying-credentials');
      const verifyResponse = await fetch('/api/auth/verify-credentials', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authFlow: 'kangur_parent', email, password }),
      });
      const verifyPayload = await parseJsonResponse(verifyResponse);
      if (verifyPayload['ok'] === false) {
        if (verifyPayload['code'] === 'PASSWORD_SETUP_REQUIRED') {
          setAuthMode('sign-in');
          setPassword('');
          setFormNotice(
            typeof verifyPayload['message'] === 'string'
              ? verifyPayload['message']
              : translations('passwordSetupRequiredNotice')
          );
          scheduleFieldFocus('password');
          return;
        }
        showFormError(typeof verifyPayload['message'] === 'string' ? verifyPayload['message'] : translations('parentLoginFailed'));
        return;
      }
      setSubmitStage('signing-in-parent');
      const signInResult = await signIn('credentials', { email, password, callbackUrl: callbackValue, redirect: false });
      if (!signInResult?.ok || signInResult.error) {
        showFormError(translations('parentLoginFailed'));
        return;
      }
      await handleLoginSuccess({
        kind: 'parent',
        callbackUrl: normalizeLoginCallbackHref(signInResult.url) ?? callbackValue,
        onStageChange: setSubmitStage,
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
      showInputError(translations('enterStudentLoginAndPassword'), resolveCredentialErrorTarget(loginName, password));
      return;
    }
    if (!KANGUR_LEARNER_LOGIN_PATTERN.test(loginName)) {
      showInputError(translations('invalidLearnerLoginNotice'), 'identifier');
      return;
    }
    setIsLoading(true);
    clearInlineFeedback({ resetStage: false });
    setSubmitStage('clearing-session');
    try {
      await resetSessionsBeforeStudentLogin();
      setSubmitStage('signing-in-student');
      const response = await fetch('/api/kangur/auth/learner-signin', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginName, password }),
      });
      const payload = await parseJsonResponse(response);
      if (!response.ok) {
        showFormError(typeof payload['error'] === 'string' ? payload['error'] : translations('studentLoginFailed'));
        return;
      }
      await handleLoginSuccess({
        kind: 'student',
        learnerId: typeof payload['learnerId'] === 'string' ? payload['learnerId'] : null,
        onStageChange: setSubmitStage,
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
    if (authMode === 'create-account') { void handleCreateAccount(); return; }
    if (loginKind === 'parent') { void handleParentLogin(); return; }
    void handleStudentLogin();
  };

  const showForm = authMode !== 'create-account' || !verificationCard;

  return (
    <div className='flex w-full justify-center py-12'>
      <KangurGlassPanel variant='soft' padding='xl' className='w-full max-w-4xl overflow-hidden'>
        <div className={`${KANGUR_PANEL_GAP_CLASSNAME} flex flex-col lg:flex-row`}>
          <div className='flex flex-1 flex-col gap-4'>
            <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700'>
              <svg viewBox='0 0 48 48' aria-hidden='true' className='h-7 w-7'><path d='M12 32c0-8 6-14 14-14s14 6 14 14' fill='none' stroke='currentColor' strokeWidth='4' strokeLinecap='round'/><circle cx='18' cy='18' r='4' fill='currentColor'/><circle cx='30' cy='18' r='4' fill='currentColor'/></svg>
            </div>
            <div className='space-y-2'>
              <KangurHeadline size='md' accent='amber'>{loginFormEntry.entry?.title ?? translations('defaultLoginTitle')}</KangurHeadline>
              {loginFormEntry.entry?.summary && <p className='text-sm text-slate-600'>{loginFormEntry.entry.summary}</p>}
            </div>
          </div>

          <div className='flex-1'>
            {showParentAuthModeTabs !== false && (
              <div className={KANGUR_SEGMENTED_CONTROL_CLASSNAME}>
                <KangurButton type='button' variant={authMode === 'sign-in' ? 'segmentActive' : 'segment'} size='sm' onClick={() => handleModeSwitch('sign-in')}>{translations('haveAccount')}</KangurButton>
                <KangurButton type='button' variant={authMode === 'create-account' ? 'segmentActive' : 'segment'} size='sm' onClick={() => handleModeSwitch('create-account')}>{translations('createAccount')}</KangurButton>
              </div>
            )}

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
                noValidate
                onSubmit={handleSubmit}
                className={`mt-6 ${KANGUR_STACK_RELAXED_CLASSNAME}`}
              >
                <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
                  <label htmlFor='identifier' className='text-sm font-medium text-slate-700'>{identifierLabel}</label>
                  <input
                    ref={identifierInputRef}
                    data-testid='kangur-login-identifier-input'
                    id='identifier'
                    type={identifierInputType}
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      clearInlineFeedback();
                    }}
                    onBlur={handleIdentifierBlur}
                    disabled={isLoading}
                    aria-invalid={isIdentifierInvalid}
                    aria-describedby={identifierDescribedBy || undefined}
                    autoComplete={isEmailIdentifierField ? 'email' : 'username'}
                    inputMode={isEmailIdentifierField ? 'email' : 'text'}
                    className='rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    placeholder={
                      authMode === 'create-account'
                        ? translations('createAccountIdentifierPlaceholder')
                        : translations('identifierPlaceholder')
                    }
                  />
                  <p id={identifierHintId} className='sr-only'>
                    {identifierEntry.entry?.summary ?? authModeHint}
                  </p>
                </div>
                <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
                  <label htmlFor='password' className='text-sm font-medium text-slate-700'>{translations('passwordLabel')}</label>
                  <div className='relative'>
                    <input
                      ref={passwordInputRef}
                      id='password'
                      type={isPasswordVisible ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearInlineFeedback();
                      }}
                      disabled={isLoading}
                      aria-invalid={isPasswordInvalid}
                      aria-describedby={passwordDescribedBy || undefined}
                      className='w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                      placeholder={translations('passwordPlaceholder')}
                    />
                    <button
                      type='button'
                      aria-label={
                        isPasswordVisible
                          ? translations('hidePassword')
                          : translations('showPassword')
                      }
                      onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                      className='absolute inset-y-0 right-0 px-3 text-slate-400'
                    >
                      {isPasswordVisible ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
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
                {authMode === 'create-account' && Boolean(KANGUR_PARENT_CAPTCHA_SITE_KEY) && <div ref={captchaContainerRef} className='min-h-[65px] self-center'/>}
                {formError && (
                  <div
                    id={formErrorId}
                    role='alert'
                    className='rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600'
                  >
                    {formError}
                  </div>
                )}
                {activeFormNotice && (
                  <div
                    id={formNoticeId}
                    role='status'
                    className='rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-600'
                  >
                    {activeFormNotice}
                  </div>
                )}
                {successMessage && (
                  <div
                    id={successMessageId}
                    role='status'
                    className='rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700'
                  >
                    {successMessage}
                  </div>
                )}
                <KangurButton type='submit' variant='primary' size='lg' fullWidth disabled={isLoading || !identifier.trim() || !password.trim()} className='justify-center rounded-xl'>{submitButtonLabel}</KangurButton>
              </form>
            ) : null}

            {verificationCard && (
              <ParentVerificationCard
                {...verificationCard}
                resendLabel={resendCooldownLabel ? translations('resendEmailIn', { label: resendCooldownLabel }) : translations('resendEmail')}
                resendDisabled={Boolean(resendCooldownLabel) || isLoading}
                changeEmailLabel={translations('changeEmailAction')}
                onChangeEmail={() => {
                  clearVerificationState();
                  setPassword('');
                  clearInlineFeedback();
                  setAuthMode('create-account');
                  scheduleFieldFocus('identifier');
                }}
                continueToSignInLabel={
                  showParentAuthModeTabs === false
                    ? translations('continueToSignInAction')
                    : null
                }
                onContinueToSignIn={
                  showParentAuthModeTabs === false
                    ? () => {
                        clearVerificationState();
                        setPassword('');
                        clearInlineFeedback();
                        setAuthMode('sign-in');
                        scheduleFieldFocus('password');
                      }
                    : null
                }
                onResend={() => void handleResendVerification()}
              />
            )}
          </div>
        </div>
      </KangurGlassPanel>
    </div>
  );
}

export function KangurLoginPage(props: Omit<KangurLoginPageProps, 'defaultCallbackUrl'> & { defaultCallbackUrl?: string }): React.JSX.Element {
  const translations = useTranslations('KangurLogin');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routing = useOptionalKangurRouting();
  const frontendPublicOwner = useOptionalFrontendPublicOwner();
  const { sanitizeManagedHref } = useKangurRouteAccess();
  
  const routeAwareDefaultCallbackUrl = resolveRouteAwareManagedKangurHref({
    href: getKangurHomeHref(routing?.basePath),
    pathname,
    currentOrigin: typeof window === 'undefined' ? null : window.location.origin,
    canonicalizePublicAlias: frontendPublicOwner?.publicOwner === 'kangur',
  }) ?? getKangurHomeHref(routing?.basePath);

  const contextValue = useMemo(() => ({
    defaultCallbackUrl: sanitizeManagedHref({ href: props.defaultCallbackUrl ?? routeAwareDefaultCallbackUrl, pathname, currentOrigin: null, basePath: routing?.basePath, fallbackHref: routeAwareDefaultCallbackUrl }) ?? routeAwareDefaultCallbackUrl,
    callbackUrl: props.callbackUrl ?? searchParams?.get('callbackUrl') ?? undefined,
    onClose: props.onClose,
    parentAuthMode: props.parentAuthMode ?? parseKangurAuthMode(searchParams?.get(KANGUR_PARENT_AUTH_MODE_PARAM), 'sign-in'),
    showParentAuthModeTabs: props.showParentAuthModeTabs,
  }), [props, pathname, routing, routeAwareDefaultCallbackUrl, searchParams, sanitizeManagedHref]);

  return (
    <KangurLoginPagePropsContext.Provider value={contextValue}>
      <Suspense fallback={<LoadingState className='h-64' message={translations('loading')} />}>
        <KangurLoginPageContent />
      </Suspense>
    </KangurLoginPagePropsContext.Provider>
  );
}

export default KangurLoginPage;
