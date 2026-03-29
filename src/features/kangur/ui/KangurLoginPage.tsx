'use client';

import { Eye, EyeOff } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { getKangurHomeHref } from '@/features/kangur/config/routing';
import { useOptionalFrontendPublicOwner } from '@/features/kangur/ui/FrontendPublicOwnerContext';
import { useKangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
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
export { resolveKangurLoginCallbackNavigation } from '@/features/kangur/ui/login-page/use-login-logic';

type KangurLoginPageState = ReturnType<typeof useKangurLoginPageState>;
type KangurLoginTranslations = ReturnType<typeof useTranslations>;
type KangurOptionalAuth = ReturnType<typeof useOptionalKangurAuth>;
type KangurLoginEffectHelpers = {
  auth: KangurOptionalAuth;
  clearInlineFeedback: KangurLoginPageState['clearInlineFeedback'];
  clearVerificationState: KangurLoginPageState['clearVerificationState'];
  scheduleFieldFocus: KangurLoginPageState['scheduleFieldFocus'];
  showFormError: KangurLoginPageState['showFormError'];
  translations: KangurLoginTranslations;
};
type KangurLoginFormStatusProps = {
  activeFormNotice: string | null;
  formError: string | null;
  formErrorId: string;
  formNoticeId: string;
  successMessage: string | null;
  successMessageId: string;
};

const KANGUR_LOGIN_SUBMIT_STAGE_NOTICE_KEY_BY_STAGE: Record<
  KangurLoginPageState['submitStage'],
  string | null
> = {
  idle: null,
  'clearing-session': 'sessionResettingNotice',
  'verifying-credentials': 'verifyingCredentialsNotice',
  'signing-in-parent': 'signingInParentNotice',
  'signing-in-student': 'signingInStudentNotice',
  'refreshing-session': 'refreshingSessionNotice',
  redirecting: 'redirectingNotice',
  'creating-account': 'creatingAccountNotice',
  'sending-verification': 'sendingVerificationNotice',
};

const resolveKangurLoginSearchParamToken = (
  searchParams: ReturnType<typeof useSearchParams>,
  key: string
): string => searchParams?.get(key)?.trim() ?? '';

const requestKangurParentEmailVerification = async (verificationToken: string) =>
  fetch('/api/kangur/auth/parent-email/verify', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: verificationToken }),
  });

const resolveKangurLoginVerificationEmail = (
  payload: Record<string, unknown>
): string => (typeof payload['email'] === 'string' ? normalizeParentEmail(payload['email']) : '');

const resolveKangurLoginVerificationMessage = ({
  payload,
  translations,
}: {
  payload: Record<string, unknown>;
  translations: KangurLoginTranslations;
}): string =>
  typeof payload['message'] === 'string'
    ? payload['message']
    : translations('verifyParentEmailFailed');

const resolveKangurLoginIdentifierLabel = ({
  authMode,
  identifierEntry,
  isEmailIdentifierField,
  translations,
}: {
  authMode: KangurLoginPageState['authMode'];
  identifierEntry: KangurLoginPageState['identifierEntry'];
  isEmailIdentifierField: boolean;
  translations: KangurLoginTranslations;
}): string =>
  identifierEntry.entry?.title ??
  (authMode === 'create-account'
    ? translations('createAccountIdentifierLabel')
    : isEmailIdentifierField
    ? translations('parentEmailLabel')
    : translations('identifierLabel'));

const resolveKangurLoginIdentifierPlaceholder = ({
  authMode,
  translations,
}: {
  authMode: KangurLoginPageState['authMode'];
  translations: KangurLoginTranslations;
}): string =>
  authMode === 'create-account'
    ? translations('createAccountIdentifierPlaceholder')
    : translations('identifierPlaceholder');

const resolveKangurLoginAuthModeHint = ({
  authMode,
  loginKind,
  translations,
}: {
  authMode: KangurLoginPageState['authMode'];
  loginKind: KangurLoginPageState['loginKind'];
  translations: KangurLoginTranslations;
}): string => {
  if (authMode === 'create-account') return translations('createAccountModeHint');
  if (loginKind === 'parent') return translations('parentLoginModeHint');
  if (loginKind === 'student') return translations('studentLoginModeHint');
  return translations('signInModeHint');
};

const resolveKangurLoginPasswordHelperText = ({
  authMode,
  loginKind,
  translations,
}: {
  authMode: KangurLoginPageState['authMode'];
  loginKind: KangurLoginPageState['loginKind'];
  translations: KangurLoginTranslations;
}): string => {
  if (authMode === 'create-account') return translations('createAccountPasswordHint');
  if (loginKind === 'parent') return translations('parentPasswordHint');
  return translations('studentPasswordHint');
};

const resolveKangurLoginSubmitButtonLabel = ({
  authMode,
  isLoading,
  loginKind,
  submitStage,
  translations,
}: {
  authMode: KangurLoginPageState['authMode'];
  isLoading: boolean;
  loginKind: KangurLoginPageState['loginKind'];
  submitStage: KangurLoginPageState['submitStage'];
  translations: KangurLoginTranslations;
}): string => {
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
};

const resolveKangurLoginSubmitStageNotice = ({
  isLoading,
  submitStage,
  translations,
}: {
  isLoading: boolean;
  submitStage: KangurLoginPageState['submitStage'];
  translations: KangurLoginTranslations;
}): string | null => {
  if (!isLoading) return null;

  const translationKey = KANGUR_LOGIN_SUBMIT_STAGE_NOTICE_KEY_BY_STAGE[submitStage];
  return translationKey ? translations(translationKey) : null;
};

const resolveKangurLoginSharedFieldFeedbackId = ({
  activeFormNotice,
  formError,
  formErrorId,
  formNoticeId,
  successMessage,
  successMessageId,
}: {
  activeFormNotice: string | null;
  formError: string | null;
  formErrorId: string;
  formNoticeId: string;
  successMessage: string | null;
  successMessageId: string;
}): string | null =>
  formError
    ? formErrorId
    : activeFormNotice
    ? formNoticeId
    : successMessage
    ? successMessageId
    : null;

const joinKangurLoginDescribedBy = (...values: Array<string | null>): string =>
  values.filter(Boolean).join(' ');

const resolveKangurLoginVerificationDebugUrl = (
  payload: Record<string, unknown>
): string | null => {
  const debug = payload['debug'];
  if (
    typeof debug === 'object' &&
    debug !== null &&
    typeof (debug as Record<string, unknown>)['verificationUrl'] === 'string'
  ) {
    return (debug as Record<string, unknown>)['verificationUrl'] as string;
  }

  return null;
};

const resolveKangurLoginRetryAfterMs = (
  payload: Record<string, unknown>
): number | null =>
  typeof payload['retryAfterMs'] === 'number' ? payload['retryAfterMs'] : null;

const requestKangurParentAccountCreate = async ({
  callbackValue,
  captchaToken,
  email,
  password,
}: {
  callbackValue: KangurLoginPageState['callbackValue'];
  captchaToken: KangurLoginPageState['captchaToken'];
  email: string;
  password: string;
}) =>
  fetch('/api/kangur/auth/parent-account/create', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      callbackUrl: callbackValue,
      captchaToken: captchaToken ?? undefined,
    }),
  });

const resolveKangurCreateAccountValidation = ({
  captchaToken,
  email,
  password,
  translations,
}: {
  captchaToken: KangurLoginPageState['captchaToken'];
  email: string;
  password: string;
  translations: KangurLoginTranslations;
}):
  | {
      kind: 'form' | 'input';
      message: string;
      target?: ReturnType<typeof resolveCredentialErrorTarget>;
    }
  | null => {
  if (!email || !password.trim()) {
    return {
      kind: 'input',
      message: translations('fillEmailAndPassword'),
      target: resolveCredentialErrorTarget(email, password),
    };
  }
  if (!isValidParentEmail(email)) {
    return {
      kind: 'input',
      message: translations('invalidParentEmailNotice'),
      target: 'identifier',
    };
  }
  if (password.trim().length < 8) {
    return {
      kind: 'input',
      message: translations('passwordRequirement'),
      target: 'password',
    };
  }
  if (Boolean(KANGUR_PARENT_CAPTCHA_SITE_KEY) && !captchaToken) {
    return {
      kind: 'form',
      message: translations('completeSecurityVerification'),
    };
  }

  return null;
};

const applyKangurLoginValidationResult = ({
  showFormError,
  showInputError,
  validationResult,
}: {
  showFormError: KangurLoginPageState['showFormError'];
  showInputError: KangurLoginPageState['showInputError'];
  validationResult: ReturnType<typeof resolveKangurCreateAccountValidation>;
}): boolean => {
  if (!validationResult) {
    return false;
  }

  if (validationResult.kind === 'input' && validationResult.target) {
    showInputError(validationResult.message, validationResult.target);
    return true;
  }

  showFormError(validationResult.message);
  return true;
};

const prepareKangurCreateAccountSubmission = ({
  clearInlineFeedback,
  clearVerificationState,
  email,
  setIdentifier,
  setIsLoading,
  setSubmitStage,
}: {
  clearInlineFeedback: KangurLoginPageState['clearInlineFeedback'];
  clearVerificationState: KangurLoginPageState['clearVerificationState'];
  email: string;
  setIdentifier: KangurLoginPageState['setIdentifier'];
  setIsLoading: KangurLoginPageState['setIsLoading'];
  setSubmitStage: KangurLoginPageState['setSubmitStage'];
}): void => {
  setIsLoading(true);
  setIdentifier(email);
  clearInlineFeedback({ resetStage: false });
  setSubmitStage('creating-account');
  clearVerificationState();
};

const resolveKangurCreateAccountResponseMessage = ({
  payload,
  translations,
}: {
  payload: Record<string, unknown>;
  translations: KangurLoginTranslations;
}): string =>
  typeof payload['message'] === 'string'
    ? payload['message']
    : translations('createAccountInstruction');

const resolveKangurCreateAccountResponseError = ({
  payload,
  translations,
}: {
  payload: Record<string, unknown>;
  translations: KangurLoginTranslations;
}): string =>
  typeof payload['error'] === 'string'
    ? payload['error']
    : translations('createParentAccountFailed');

const applySuccessfulKangurCreateAccountResponse = ({
  email,
  payload,
  scheduleFieldFocus,
  scheduleResendCooldown,
  setAuthMode,
  setFormNotice,
  setPassword,
  setVerificationCard,
  translations,
  verificationUrl,
}: {
  email: string;
  payload: Record<string, unknown>;
  scheduleFieldFocus: KangurLoginPageState['scheduleFieldFocus'];
  scheduleResendCooldown: KangurLoginPageState['scheduleResendCooldown'];
  setAuthMode: KangurLoginPageState['setAuthMode'];
  setFormNotice: KangurLoginPageState['setFormNotice'];
  setPassword: KangurLoginPageState['setPassword'];
  setVerificationCard: KangurLoginPageState['setVerificationCard'];
  translations: KangurLoginTranslations;
  verificationUrl: string | null;
}): void => {
  const message = resolveKangurCreateAccountResponseMessage({
    payload,
    translations,
  });

  if (payload['emailVerified'] === true && payload['hasPassword'] === true) {
    setAuthMode('sign-in');
    setPassword('');
    setFormNotice(message);
    scheduleFieldFocus('password');
    return;
  }

  setVerificationCard({
    email,
    message,
    verificationUrl,
  });
  scheduleResendCooldown(resolveKangurLoginRetryAfterMs(payload), {
    forceDefault: true,
  });
};

const applyRateLimitedKangurCreateAccountResponse = ({
  email,
  payload,
  scheduleResendCooldown,
  setVerificationCard,
  translations,
  verificationUrl,
}: {
  email: string;
  payload: Record<string, unknown>;
  scheduleResendCooldown: KangurLoginPageState['scheduleResendCooldown'];
  setVerificationCard: KangurLoginPageState['setVerificationCard'];
  translations: KangurLoginTranslations;
  verificationUrl: string | null;
}): void => {
  setVerificationCard({
    email,
    error: resolveKangurCreateAccountResponseError({
      payload,
      translations,
    }),
    verificationUrl,
  });
  scheduleResendCooldown(resolveKangurLoginRetryAfterMs(payload), {
    forceDefault: true,
  });
};

const applyKangurCreateAccountResponse = ({
  email,
  payload,
  response,
  scheduleFieldFocus,
  scheduleResendCooldown,
  setAuthMode,
  setFormNotice,
  setPassword,
  setVerificationCard,
  showFormError,
  translations,
}: {
  email: string;
  payload: Record<string, unknown>;
  response: Response;
  scheduleFieldFocus: KangurLoginPageState['scheduleFieldFocus'];
  scheduleResendCooldown: KangurLoginPageState['scheduleResendCooldown'];
  setAuthMode: KangurLoginPageState['setAuthMode'];
  setFormNotice: KangurLoginPageState['setFormNotice'];
  setPassword: KangurLoginPageState['setPassword'];
  setVerificationCard: KangurLoginPageState['setVerificationCard'];
  showFormError: KangurLoginPageState['showFormError'];
  translations: KangurLoginTranslations;
}): void => {
  const verificationUrl = resolveKangurLoginVerificationDebugUrl(payload);

  if (response.ok && payload['ok'] === true) {
    applySuccessfulKangurCreateAccountResponse({
      email,
      payload,
      scheduleFieldFocus,
      scheduleResendCooldown,
      setAuthMode,
      setFormNotice,
      setPassword,
      setVerificationCard,
      translations,
      verificationUrl,
    });
    return;
  }

  if (payload['code'] === 'RATE_LIMITED' || response.status === 429) {
    applyRateLimitedKangurCreateAccountResponse({
      email,
      payload,
      scheduleResendCooldown,
      setVerificationCard,
      translations,
      verificationUrl,
    });
    return;
  }

  showFormError(resolveKangurCreateAccountResponseError({ payload, translations }));
};

const resolveKangurParentLoginValidation = ({
  email,
  password,
  translations,
}: {
  email: string;
  password: string;
  translations: KangurLoginTranslations;
}):
  | {
      message: string;
      target: ReturnType<typeof resolveCredentialErrorTarget> | 'identifier';
    }
  | null => {
  if (!email || !password.trim()) {
    return {
      message: translations('enterParentEmailAndPassword'),
      target: resolveCredentialErrorTarget(email, password),
    };
  }
  if (!isValidParentEmail(email)) {
    return {
      message: translations('invalidParentEmailNotice'),
      target: 'identifier',
    };
  }

  return null;
};

const requestKangurParentCredentialVerification = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) =>
  fetch('/api/auth/verify-credentials', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authFlow: 'kangur_parent', email, password }),
  });

const applyKangurParentCredentialFailure = ({
  clearInlineFeedback,
  email,
  scheduleFieldFocus,
  setAuthMode,
  setFormNotice,
  setPassword,
  setVerificationCard,
  showFormError,
  translations,
  verifyPayload,
}: {
  clearInlineFeedback: KangurLoginPageState['clearInlineFeedback'];
  email: string;
  scheduleFieldFocus: KangurLoginPageState['scheduleFieldFocus'];
  setAuthMode: KangurLoginPageState['setAuthMode'];
  setFormNotice: KangurLoginPageState['setFormNotice'];
  setPassword: KangurLoginPageState['setPassword'];
  setVerificationCard: KangurLoginPageState['setVerificationCard'];
  showFormError: KangurLoginPageState['showFormError'];
  translations: KangurLoginTranslations;
  verifyPayload: Record<string, unknown>;
}): boolean => {
  if (verifyPayload['ok'] !== false) {
    return false;
  }

  if (verifyPayload['code'] === 'EMAIL_UNVERIFIED') {
    clearInlineFeedback({ resetStage: false });
    setVerificationCard({
      email,
      message: translations('emailUnverifiedNotice'),
    });
    return true;
  }

  if (verifyPayload['code'] === 'PASSWORD_SETUP_REQUIRED') {
    setAuthMode('create-account');
    setPassword('');
    setFormNotice(translations('passwordSetupRequiredNotice'));
    scheduleFieldFocus('password');
    return true;
  }

  showFormError(
    typeof verifyPayload['message'] === 'string'
      ? verifyPayload['message']
      : translations('parentLoginFailed')
  );
  return true;
};

const resolveKangurStudentLoginValidation = ({
  loginName,
  password,
  translations,
}: {
  loginName: string;
  password: string;
  translations: KangurLoginTranslations;
}):
  | {
      message: string;
      target: ReturnType<typeof resolveCredentialErrorTarget> | 'identifier';
    }
  | null => {
  if (!loginName || !password.trim()) {
    return {
      message: translations('enterStudentLoginAndPassword'),
      target: resolveCredentialErrorTarget(loginName, password),
    };
  }
  if (!KANGUR_LEARNER_LOGIN_PATTERN.test(loginName)) {
    return {
      message: translations('invalidLearnerLoginNotice'),
      target: 'identifier',
    };
  }

  return null;
};

const requestKangurStudentLogin = async ({
  loginName,
  password,
}: {
  loginName: string;
  password: string;
}) =>
  fetch('/api/kangur/auth/learner-signin', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginName, password }),
  });

type KangurLoginPresentationState = {
  activeFormNotice: string | null;
  authModeHint: string;
  continueToSignInLabel: string | null;
  identifierDescribedBy: string;
  identifierInputType: 'email' | 'text';
  identifierLabel: string;
  identifierPlaceholder: string;
  isEmailIdentifierField: boolean;
  isIdentifierInvalid: boolean;
  isPasswordInvalid: boolean;
  passwordDescribedBy: string;
  passwordHelperText: string;
  resendHelper: string | null;
  resendLabel: string;
  showCaptcha: boolean;
  showForm: boolean;
  submitButtonLabel: string;
  submitDisabled: boolean;
};

const resolveKangurLoginIdentifierPresentation = ({
  authMode,
  identifierEntry,
  loginKind,
  translations,
}: {
  authMode: KangurLoginPageState['authMode'];
  identifierEntry: KangurLoginPageState['identifierEntry'];
  loginKind: KangurLoginPageState['loginKind'];
  translations: KangurLoginTranslations;
}): Pick<
  KangurLoginPresentationState,
  | 'identifierInputType'
  | 'identifierLabel'
  | 'identifierPlaceholder'
  | 'isEmailIdentifierField'
> => {
  const isEmailIdentifierField = authMode === 'create-account' || loginKind === 'parent';

  return {
    identifierInputType: isEmailIdentifierField ? 'email' : 'text',
    identifierLabel: resolveKangurLoginIdentifierLabel({
      authMode,
      identifierEntry,
      isEmailIdentifierField,
      translations,
    }),
    identifierPlaceholder: resolveKangurLoginIdentifierPlaceholder({
      authMode,
      translations,
    }),
    isEmailIdentifierField,
  };
};

const resolveKangurLoginFieldValidity = (
  inputErrorTarget: KangurLoginPageState['inputErrorTarget']
): Pick<KangurLoginPresentationState, 'isIdentifierInvalid' | 'isPasswordInvalid'> => ({
  isIdentifierInvalid:
    inputErrorTarget === 'identifier' || inputErrorTarget === 'both',
  isPasswordInvalid:
    inputErrorTarget === 'password' || inputErrorTarget === 'both',
});

const resolveKangurLoginFeedbackPresentation = ({
  activeFormNotice,
  formError,
  formErrorId,
  formNoticeId,
  passwordHintId,
  successMessage,
  successMessageId,
}: {
  activeFormNotice: string | null;
  formError: string | null;
  formErrorId: string;
  formNoticeId: string;
  passwordHintId: string;
  successMessage: string | null;
  successMessageId: string;
}): Pick<
  KangurLoginPresentationState,
  'identifierDescribedBy' | 'passwordDescribedBy'
> => {
  const sharedFieldFeedbackId = resolveKangurLoginSharedFieldFeedbackId({
    activeFormNotice,
    formError,
    formErrorId,
    formNoticeId,
    successMessage,
    successMessageId,
  });

  return {
    identifierDescribedBy: joinKangurLoginDescribedBy(sharedFieldFeedbackId),
    passwordDescribedBy: joinKangurLoginDescribedBy(
      passwordHintId,
      sharedFieldFeedbackId
    ),
  };
};

const resolveKangurLoginAuxiliaryPresentation = ({
  authMode,
  identifier,
  isLoading,
  password,
  resendCooldownLabel,
  showParentAuthModeTabs,
  translations,
  verificationCard,
}: {
  authMode: KangurLoginPageState['authMode'];
  identifier: string;
  isLoading: boolean;
  password: string;
  resendCooldownLabel: string | null;
  showParentAuthModeTabs: ReturnType<typeof useKangurLoginPageProps>['showParentAuthModeTabs'];
  translations: KangurLoginTranslations;
  verificationCard: KangurLoginPageState['verificationCard'];
}): Pick<
  KangurLoginPresentationState,
  | 'continueToSignInLabel'
  | 'resendHelper'
  | 'resendLabel'
  | 'showCaptcha'
  | 'showForm'
  | 'submitDisabled'
> => ({
  continueToSignInLabel:
    showParentAuthModeTabs === false
      ? translations('continueToSignInAction')
      : null,
  resendHelper: resendCooldownLabel
    ? translations('resendHelper', { label: resendCooldownLabel })
    : null,
  resendLabel: resendCooldownLabel
    ? translations('resendEmailIn', { label: resendCooldownLabel })
    : translations('resendEmail'),
  showCaptcha:
    authMode === 'create-account' && Boolean(KANGUR_PARENT_CAPTCHA_SITE_KEY),
  showForm: authMode !== 'create-account' || !verificationCard,
  submitDisabled: isLoading || !identifier.trim() || !password.trim(),
});

type KangurParentEmailVerificationInput = {
  effectHelpers: KangurLoginEffectHelpers;
  formNoticeSetter: KangurLoginPageState['setFormNotice'];
  isCancelled: () => boolean;
  setAuthMode: KangurLoginPageState['setAuthMode'];
  setIdentifier: KangurLoginPageState['setIdentifier'];
  setIsLoading: KangurLoginPageState['setIsLoading'];
  setPassword: KangurLoginPageState['setPassword'];
  verificationToken: string;
};

const reportKangurParentEmailVerificationFailure = ({
  isCancelled,
  showFormError,
  translations,
}: {
  isCancelled: () => boolean;
  showFormError: KangurLoginPageState['showFormError'];
  translations: KangurLoginTranslations;
}): void => {
  if (!isCancelled()) {
    showFormError(translations('verifyParentEmailFailed'));
  }
};

const applySuccessfulKangurParentEmailVerification = ({
  auth,
  clearVerificationState,
  formNoticeSetter,
  isCancelled,
  payload,
  scheduleFieldFocus,
  setAuthMode,
  setIdentifier,
  setPassword,
  translations,
}: {
  auth: KangurOptionalAuth;
  clearVerificationState: KangurLoginPageState['clearVerificationState'];
  formNoticeSetter: KangurLoginPageState['setFormNotice'];
  isCancelled: () => boolean;
  payload: Record<string, unknown>;
  scheduleFieldFocus: KangurLoginPageState['scheduleFieldFocus'];
  setAuthMode: KangurLoginPageState['setAuthMode'];
  setIdentifier: KangurLoginPageState['setIdentifier'];
  setPassword: KangurLoginPageState['setPassword'];
  translations: KangurLoginTranslations;
}): void => {
  if (isCancelled()) {
    return;
  }

  setAuthMode('sign-in');
  setIdentifier(resolveKangurLoginVerificationEmail(payload));
  setPassword('');
  clearVerificationState();
  formNoticeSetter(
    resolveKangurLoginVerificationMessage({
      payload,
      translations,
    })
  );
  void auth?.checkAppState?.();
  scheduleFieldFocus('password');
};

const runKangurParentEmailVerification = async ({
  effectHelpers,
  formNoticeSetter,
  isCancelled,
  setAuthMode,
  setIdentifier,
  setIsLoading,
  setPassword,
  verificationToken,
}: KangurParentEmailVerificationInput): Promise<void> => {
  const {
    auth,
    clearInlineFeedback,
    clearVerificationState,
    scheduleFieldFocus,
    showFormError,
    translations,
  } = effectHelpers;

  setIsLoading(true);
  clearInlineFeedback({ resetStage: false });
  clearVerificationState();

  try {
    const response = await requestKangurParentEmailVerification(verificationToken);
    const payload = await parseJsonResponse(response);

    if (!response.ok || payload['ok'] !== true) {
      reportKangurParentEmailVerificationFailure({
        isCancelled,
        showFormError,
        translations,
      });
      return;
    }

    applySuccessfulKangurParentEmailVerification({
      auth,
      clearVerificationState,
      formNoticeSetter,
      isCancelled,
      payload,
      scheduleFieldFocus,
      setAuthMode,
      setIdentifier,
      setPassword,
      translations,
    });
  } catch {
    reportKangurParentEmailVerificationFailure({
      isCancelled,
      showFormError,
      translations,
    });
  } finally {
    if (!isCancelled()) {
      setIsLoading(false);
    }
  }
};

function useKangurLoginPagePresentationState(input: {
  authMode: KangurLoginPageState['authMode'];
  formError: KangurLoginPageState['formError'];
  formErrorId: KangurLoginPageState['formErrorId'];
  formNotice: KangurLoginPageState['formNotice'];
  formNoticeId: KangurLoginPageState['formNoticeId'];
  identifier: KangurLoginPageState['identifier'];
  identifierEntry: KangurLoginPageState['identifierEntry'];
  inputErrorTarget: KangurLoginPageState['inputErrorTarget'];
  isLoading: KangurLoginPageState['isLoading'];
  loginKind: KangurLoginPageState['loginKind'];
  password: KangurLoginPageState['password'];
  passwordHintId: KangurLoginPageState['passwordHintId'];
  resendCooldownLabel: KangurLoginPageState['resendCooldownLabel'];
  showParentAuthModeTabs: ReturnType<typeof useKangurLoginPageProps>['showParentAuthModeTabs'];
  submitStage: KangurLoginPageState['submitStage'];
  successMessage: KangurLoginPageState['successMessage'];
  successMessageId: KangurLoginPageState['successMessageId'];
  translations: KangurLoginTranslations;
  verificationCard: KangurLoginPageState['verificationCard'];
}): KangurLoginPresentationState {
  const {
    authMode,
    formError,
    formErrorId,
    formNotice,
    formNoticeId,
    identifier,
    identifierEntry,
    inputErrorTarget,
    isLoading,
    loginKind,
    password,
    passwordHintId,
    resendCooldownLabel,
    showParentAuthModeTabs,
    submitStage,
    successMessage,
    successMessageId,
    translations,
    verificationCard,
  } = input;
  const {
    identifierInputType,
    identifierLabel,
    identifierPlaceholder,
    isEmailIdentifierField,
  } = useMemo(
    () =>
      resolveKangurLoginIdentifierPresentation({
        authMode,
        identifierEntry,
        loginKind,
        translations,
      }),
    [authMode, identifierEntry, loginKind, translations]
  );
  const authModeHint = useMemo(
    () => resolveKangurLoginAuthModeHint({ authMode, loginKind, translations }),
    [authMode, loginKind, translations]
  );
  const passwordHelperText = useMemo(
    () =>
      resolveKangurLoginPasswordHelperText({
        authMode,
        loginKind,
        translations,
      }),
    [authMode, loginKind, translations]
  );
  const submitButtonLabel = useMemo(
    () =>
      resolveKangurLoginSubmitButtonLabel({
        authMode,
        isLoading,
        loginKind,
        submitStage,
        translations,
      }),
    [authMode, isLoading, loginKind, submitStage, translations]
  );
  const activeFormNotice = useMemo(
    () =>
      resolveKangurLoginSubmitStageNotice({
        isLoading,
        submitStage,
        translations,
      }) ?? formNotice,
    [formNotice, isLoading, submitStage, translations]
  );
  const { isIdentifierInvalid, isPasswordInvalid } = useMemo(
    () => resolveKangurLoginFieldValidity(inputErrorTarget),
    [inputErrorTarget]
  );
  const { identifierDescribedBy, passwordDescribedBy } = useMemo(
    () =>
      resolveKangurLoginFeedbackPresentation({
        activeFormNotice,
        formError,
        formErrorId,
        formNoticeId,
        passwordHintId,
        successMessage,
        successMessageId,
      }),
    [
      activeFormNotice,
      formError,
      formErrorId,
      formNoticeId,
      passwordHintId,
      successMessage,
      successMessageId,
    ]
  );
  const {
    continueToSignInLabel,
    resendHelper,
    resendLabel,
    showCaptcha,
    showForm,
    submitDisabled,
  } = useMemo(
    () =>
      resolveKangurLoginAuxiliaryPresentation({
        authMode,
        identifier,
        isLoading,
        password,
        resendCooldownLabel,
        showParentAuthModeTabs,
        translations,
        verificationCard,
      }),
    [
      authMode,
      identifier,
      isLoading,
      password,
      resendCooldownLabel,
      showParentAuthModeTabs,
      translations,
      verificationCard,
    ]
  );

  return {
    activeFormNotice,
    authModeHint,
    continueToSignInLabel,
    identifierDescribedBy,
    identifierInputType,
    identifierLabel,
    identifierPlaceholder,
    isEmailIdentifierField,
    isIdentifierInvalid,
    isPasswordInvalid,
    passwordDescribedBy,
    passwordHelperText,
    resendHelper,
    resendLabel,
    showCaptcha,
    showForm,
    submitButtonLabel,
    submitDisabled,
  };
}

function useKangurLoginPageSideEffects(input: {
  auth: KangurOptionalAuth;
  clearInlineFeedback: KangurLoginPageState['clearInlineFeedback'];
  clearVerificationState: KangurLoginPageState['clearVerificationState'];
  formNoticeSetter: KangurLoginPageState['setFormNotice'];
  identifierInputRef: KangurLoginPageState['identifierInputRef'];
  loginFormEntry: KangurLoginPageState['loginFormEntry'];
  scheduleFieldFocus: KangurLoginPageState['scheduleFieldFocus'];
  searchParams: ReturnType<typeof useSearchParams>;
  setAuthMode: KangurLoginPageState['setAuthMode'];
  setIdentifier: KangurLoginPageState['setIdentifier'];
  setIsLoading: KangurLoginPageState['setIsLoading'];
  setPassword: KangurLoginPageState['setPassword'];
  showFormError: KangurLoginPageState['showFormError'];
  translations: KangurLoginTranslations;
}): {
  formRef: React.RefObject<HTMLFormElement | null>;
} {
  const {
    auth,
    clearInlineFeedback,
    clearVerificationState,
    formNoticeSetter,
    identifierInputRef,
    loginFormEntry,
    scheduleFieldFocus,
    searchParams,
    setAuthMode,
    setIdentifier,
    setIsLoading,
    setPassword,
    showFormError,
    translations,
  } = input;
  const formRef = useRef<HTMLFormElement>(null);
  const handledMagicLinkTokenRef = useRef<string | null>(null);
  const handledVerificationTokenRef = useRef<string | null>(null);
  const effectHelpersRef = useRef<KangurLoginEffectHelpers>({
    auth,
    clearInlineFeedback,
    clearVerificationState,
    scheduleFieldFocus,
    showFormError,
    translations,
  });

  effectHelpersRef.current = {
    auth,
    clearInlineFeedback,
    clearVerificationState,
    scheduleFieldFocus,
    showFormError,
    translations,
  };

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

  const verificationToken = resolveKangurLoginSearchParamToken(
    searchParams,
    'verifyEmailToken'
  );
  const deprecatedMagicLinkToken = resolveKangurLoginSearchParamToken(
    searchParams,
    'magicLinkToken'
  );

  useEffect(() => {
    if (
      !deprecatedMagicLinkToken ||
      handledMagicLinkTokenRef.current === deprecatedMagicLinkToken
    ) {
      return;
    }

    const { clearInlineFeedback, clearVerificationState, translations } =
      effectHelpersRef.current;
    handledMagicLinkTokenRef.current = deprecatedMagicLinkToken;
    clearInlineFeedback();
    clearVerificationState();
    formNoticeSetter(translations('magicLinkDeprecatedNotice'));
  }, [deprecatedMagicLinkToken, formNoticeSetter]);

  useEffect(() => {
    let cancelled = false;
    if (
      !verificationToken ||
      handledVerificationTokenRef.current === verificationToken
    ) {
      return;
    }

    handledVerificationTokenRef.current = verificationToken;
    void runKangurParentEmailVerification({
      effectHelpers: effectHelpersRef.current,
      formNoticeSetter,
      isCancelled: () => cancelled,
      setAuthMode,
      setIdentifier,
      setIsLoading,
      setPassword,
      verificationToken,
    });

    return () => {
      cancelled = true;
    };
  }, [
    formNoticeSetter,
    setAuthMode,
    setIdentifier,
    setIsLoading,
    setPassword,
    verificationToken,
  ]);

  useKangurAiTutorSessionSync({
    learnerId: null,
    sessionContext: {
      surface: 'auth',
      contentId: 'auth:login:sign-in',
      title: loginFormEntry.entry?.title ?? translations('defaultSessionTitle'),
      description:
        loginFormEntry.entry?.summary ?? translations('defaultSessionDescription'),
    },
  });

  return {
    formRef,
  };
}

function useKangurLoginPageActionHandlers(input: {
  authMode: KangurLoginPageState['authMode'];
  callbackValue: KangurLoginPageState['callbackValue'];
  captchaToken: KangurLoginPageState['captchaToken'];
  clearInlineFeedback: KangurLoginPageState['clearInlineFeedback'];
  clearVerificationState: KangurLoginPageState['clearVerificationState'];
  handleLoginSuccess: KangurLoginPageState['handleLoginSuccess'];
  identifier: KangurLoginPageState['identifier'];
  isLoading: KangurLoginPageState['isLoading'];
  loginKind: KangurLoginPageState['loginKind'];
  normalizeLoginCallbackHref: KangurLoginPageState['normalizeLoginCallbackHref'];
  password: KangurLoginPageState['password'];
  scheduleFieldFocus: KangurLoginPageState['scheduleFieldFocus'];
  scheduleResendCooldown: KangurLoginPageState['scheduleResendCooldown'];
  setAuthMode: KangurLoginPageState['setAuthMode'];
  setIdentifier: KangurLoginPageState['setIdentifier'];
  setIsLoading: KangurLoginPageState['setIsLoading'];
  setIsPasswordVisible: KangurLoginPageState['setIsPasswordVisible'];
  setPassword: KangurLoginPageState['setPassword'];
  setFormNotice: KangurLoginPageState['setFormNotice'];
  setSubmitStage: KangurLoginPageState['setSubmitStage'];
  setVerificationCard: KangurLoginPageState['setVerificationCard'];
  showFormError: KangurLoginPageState['showFormError'];
  showInputError: KangurLoginPageState['showInputError'];
  showParentAuthModeTabs: ReturnType<typeof useKangurLoginPageProps>['showParentAuthModeTabs'];
  translations: KangurLoginTranslations;
}) {
  const {
    authMode,
    callbackValue,
    captchaToken,
    clearInlineFeedback,
    clearVerificationState,
    handleLoginSuccess,
    identifier,
    isLoading,
    loginKind,
    normalizeLoginCallbackHref,
    password,
    scheduleFieldFocus,
    scheduleResendCooldown,
    setAuthMode,
    setIdentifier,
    setIsLoading,
    setIsPasswordVisible,
    setPassword,
    setFormNotice,
    setSubmitStage,
    setVerificationCard,
    showFormError,
    showInputError,
    showParentAuthModeTabs,
    translations,
  } = input;

  const handleIdentifierBlur = useCallback(() => {
    const normalizedIdentifier =
      authMode === 'create-account' || loginKind === 'parent'
        ? normalizeParentEmail(identifier)
        : identifier.trim();

    if (normalizedIdentifier !== identifier) {
      setIdentifier(normalizedIdentifier);
    }
  }, [authMode, identifier, loginKind, setIdentifier]);

  const handleCreateAccount = useCallback(async (): Promise<void> => {
    const email = normalizeParentEmail(identifier);
    const validationResult = resolveKangurCreateAccountValidation({
      captchaToken,
      email,
      password,
      translations,
    });

    if (
      applyKangurLoginValidationResult({
        showFormError,
        showInputError,
        validationResult,
      })
    ) {
      return;
    }

    prepareKangurCreateAccountSubmission({
      clearInlineFeedback,
      clearVerificationState,
      email,
      setIdentifier,
      setIsLoading,
      setSubmitStage,
    });

    try {
      const response = await requestKangurParentAccountCreate({
        callbackValue,
        captchaToken,
        email,
        password,
      });
      const payload = await parseJsonResponse(response);
      applyKangurCreateAccountResponse({
        email,
        payload,
        response,
        scheduleFieldFocus,
        scheduleResendCooldown,
        setAuthMode,
        setFormNotice,
        setPassword,
        setVerificationCard,
        showFormError,
        translations,
      });
    } catch {
      showFormError(translations('createParentAccountUnexpected'));
    } finally {
      setIsLoading(false);
    }
  }, [
    callbackValue,
    captchaToken,
    clearInlineFeedback,
    clearVerificationState,
    identifier,
    password,
    scheduleFieldFocus,
    scheduleResendCooldown,
    setAuthMode,
    setFormNotice,
    setIdentifier,
    setIsLoading,
    setPassword,
    setSubmitStage,
    setVerificationCard,
    showFormError,
    showInputError,
    translations,
  ]);

  const handleParentLogin = useCallback(async (): Promise<void> => {
    const email = normalizeParentEmail(identifier);
    const validationResult = resolveKangurParentLoginValidation({
      email,
      password,
      translations,
    });

    if (validationResult) {
      showInputError(validationResult.message, validationResult.target);
      return;
    }

    setIsLoading(true);
    setIdentifier(email);
    clearInlineFeedback({ resetStage: false });
    setSubmitStage('clearing-session');

    try {
      await resetSessionsBeforeParentLogin();
      setSubmitStage('verifying-credentials');
      const verifyResponse = await requestKangurParentCredentialVerification({
        email,
        password,
      });
      const verifyPayload = await parseJsonResponse(verifyResponse);

      if (
        applyKangurParentCredentialFailure({
          clearInlineFeedback,
          email,
          scheduleFieldFocus,
          setAuthMode,
          setFormNotice,
          setPassword,
          setVerificationCard,
          showFormError,
          translations,
          verifyPayload,
        })
      ) {
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
        callbackUrl: normalizeLoginCallbackHref(signInResult.url) ?? callbackValue,
        onStageChange: setSubmitStage,
      });
    } catch {
      showFormError(translations('parentLoginUnexpected'));
    } finally {
      setIsLoading(false);
    }
  }, [
    callbackValue,
    clearInlineFeedback,
    handleLoginSuccess,
    identifier,
    normalizeLoginCallbackHref,
    password,
    scheduleFieldFocus,
    setAuthMode,
    setFormNotice,
    setIdentifier,
    setIsLoading,
    setPassword,
    setSubmitStage,
    setVerificationCard,
    showFormError,
    showInputError,
    translations,
  ]);

  const handleStudentLogin = useCallback(async (): Promise<void> => {
    const loginName = identifier.trim();
    const validationResult = resolveKangurStudentLoginValidation({
      loginName,
      password,
      translations,
    });

    if (validationResult) {
      showInputError(validationResult.message, validationResult.target);
      return;
    }

    setIsLoading(true);
    clearInlineFeedback({ resetStage: false });
    setSubmitStage('clearing-session');

    try {
      await resetSessionsBeforeStudentLogin();
      setSubmitStage('signing-in-student');
      const response = await requestKangurStudentLogin({
        loginName,
        password,
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
        learnerId:
          typeof payload['learnerId'] === 'string' ? payload['learnerId'] : null,
        onStageChange: setSubmitStage,
      });
    } catch {
      showFormError(translations('studentLoginUnexpected'));
    } finally {
      setIsLoading(false);
    }
  }, [
    clearInlineFeedback,
    handleLoginSuccess,
    identifier,
    password,
    setIsLoading,
    setSubmitStage,
    showFormError,
    showInputError,
    translations,
  ]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
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
    },
    [
      authMode,
      handleCreateAccount,
      handleParentLogin,
      handleStudentLogin,
      isLoading,
      loginKind,
    ]
  );

  const handleChangeEmail = useCallback(() => {
    clearVerificationState();
    setPassword('');
    clearInlineFeedback();
    setAuthMode('create-account');
    scheduleFieldFocus('identifier');
  }, [
    clearInlineFeedback,
    clearVerificationState,
    scheduleFieldFocus,
    setAuthMode,
    setPassword,
  ]);

  const handleContinueToSignIn = useMemo(() => {
    if (showParentAuthModeTabs !== false) {
      return null;
    }

    return () => {
      clearVerificationState();
      setPassword('');
      clearInlineFeedback();
      setAuthMode('sign-in');
      setIsPasswordVisible(false);
      scheduleFieldFocus('password');
    };
  }, [
    clearInlineFeedback,
    clearVerificationState,
    scheduleFieldFocus,
    setAuthMode,
    setIsPasswordVisible,
    setPassword,
    showParentAuthModeTabs,
  ]);

  return {
    handleChangeEmail,
    handleContinueToSignIn,
    handleCreateAccount,
    handleIdentifierBlur,
    handleParentLogin,
    handleStudentLogin,
    handleSubmit,
  };
}

function KangurLoginHero(props: {
  loginFormEntry: KangurLoginPageState['loginFormEntry'];
  translations: KangurLoginTranslations;
}): React.JSX.Element {
  const { loginFormEntry, translations } = props;

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div
        className='flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700'
        data-testid='kangur-login-hero-logo'
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
          {loginFormEntry.entry?.title ?? translations('defaultLoginTitle')}
        </KangurHeadline>
        {loginFormEntry.entry?.summary ? (
          <p className='text-sm text-slate-600'>{loginFormEntry.entry.summary}</p>
        ) : null}
      </div>
    </div>
  );
}

function KangurLoginModeTabs(props: {
  authMode: KangurLoginPageState['authMode'];
  handleModeSwitch: KangurLoginPageState['handleModeSwitch'];
  showParentAuthModeTabs: ReturnType<typeof useKangurLoginPageProps>['showParentAuthModeTabs'];
  translations: KangurLoginTranslations;
}): React.JSX.Element | null {
  const { authMode, handleModeSwitch, showParentAuthModeTabs, translations } = props;

  if (showParentAuthModeTabs === false) {
    return null;
  }

  return (
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
  );
}

function KangurLoginModeHint(props: { authModeHint: string }): React.JSX.Element {
  return (
    <div
      data-testid='kangur-login-mode-hint'
      className='mt-4 rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-600'
    >
      {props.authModeHint}
    </div>
  );
}

function KangurLoginIdentifierField(props: {
  clearInlineFeedback: KangurLoginPageState['clearInlineFeedback'];
  disabled: boolean;
  identifier: string;
  identifierDescribedBy: string;
  identifierInputRef: KangurLoginPageState['identifierInputRef'];
  identifierInputType: 'email' | 'text';
  identifierLabel: string;
  identifierPlaceholder: string;
  isEmailIdentifierField: boolean;
  isIdentifierInvalid: boolean;
  onBlur: () => void;
  setIdentifier: KangurLoginPageState['setIdentifier'];
}): React.JSX.Element {
  const {
    clearInlineFeedback,
    disabled,
    identifier,
    identifierDescribedBy,
    identifierInputRef,
    identifierInputType,
    identifierLabel,
    identifierPlaceholder,
    isEmailIdentifierField,
    isIdentifierInvalid,
    onBlur,
    setIdentifier,
  } = props;

  return (
    <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
      <label htmlFor='identifier' className='text-sm font-medium text-slate-700'>
        {identifierLabel}
      </label>
      <input
        ref={identifierInputRef}
        data-testid='kangur-login-identifier-input'
        data-tutor-anchor='login_identifier_field'
        id='identifier'
        name='identifier'
        type={identifierInputType}
        value={identifier}
        onChange={(event) => {
          setIdentifier(event.target.value);
          clearInlineFeedback();
        }}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={isIdentifierInvalid}
        aria-describedby={identifierDescribedBy || undefined}
        aria-label={identifierLabel}
        autoComplete={isEmailIdentifierField ? 'email' : 'username'}
        inputMode={isEmailIdentifierField ? 'email' : 'text'}
        className='rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
        placeholder={identifierPlaceholder}
      />
    </div>
  );
}

function KangurLoginPasswordField(props: {
  clearInlineFeedback: KangurLoginPageState['clearInlineFeedback'];
  disabled: boolean;
  isPasswordInvalid: boolean;
  isPasswordVisible: boolean;
  password: string;
  passwordDescribedBy: string;
  passwordHintId: string;
  passwordHelperText: string;
  passwordInputRef: KangurLoginPageState['passwordInputRef'];
  setIsPasswordVisible: KangurLoginPageState['setIsPasswordVisible'];
  setPassword: KangurLoginPageState['setPassword'];
  translations: KangurLoginTranslations;
}): React.JSX.Element {
  const {
    clearInlineFeedback,
    disabled,
    isPasswordInvalid,
    isPasswordVisible,
    password,
    passwordDescribedBy,
    passwordHintId,
    passwordHelperText,
    passwordInputRef,
    setIsPasswordVisible,
    setPassword,
    translations,
  } = props;

  return (
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
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            clearInlineFeedback();
          }}
          disabled={disabled}
          aria-invalid={isPasswordInvalid}
          aria-describedby={passwordDescribedBy || undefined}
          aria-label={translations('passwordLabel')}
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
          {isPasswordVisible ? (
            <EyeOff className='h-4 w-4' />
          ) : (
            <Eye className='h-4 w-4' />
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
  );
}

function KangurLoginFormStatus(props: KangurLoginFormStatusProps): React.JSX.Element {
  const {
    activeFormNotice,
    formError,
    formErrorId,
    formNoticeId,
    successMessage,
    successMessageId,
  } = props;

  return (
    <>
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
          className='rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-600'
        >
          {activeFormNotice}
        </div>
      ) : null}
      {successMessage ? (
        <div
          id={successMessageId}
          role='status'
          className='rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700'
        >
          {successMessage}
        </div>
      ) : null}
    </>
  );
}

function KangurLoginFormPanel(props: {
  activeFormNotice: string | null;
  authMode: KangurLoginPageState['authMode'];
  captchaContainerRef: KangurLoginPageState['captchaContainerRef'];
  clearInlineFeedback: KangurLoginPageState['clearInlineFeedback'];
  formError: string | null;
  formErrorId: string;
  formNoticeId: string;
  formRef: React.RefObject<HTMLFormElement | null>;
  handleIdentifierBlur: () => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  identifier: string;
  identifierDescribedBy: string;
  identifierInputRef: KangurLoginPageState['identifierInputRef'];
  identifierInputType: 'email' | 'text';
  identifierLabel: string;
  identifierPlaceholder: string;
  isEmailIdentifierField: boolean;
  isIdentifierInvalid: boolean;
  isLoading: boolean;
  isPasswordInvalid: boolean;
  isPasswordVisible: boolean;
  loginKind: KangurLoginPageState['loginKind'];
  password: string;
  passwordDescribedBy: string;
  passwordHintId: string;
  passwordHelperText: string;
  passwordInputRef: KangurLoginPageState['passwordInputRef'];
  setIdentifier: KangurLoginPageState['setIdentifier'];
  setIsPasswordVisible: KangurLoginPageState['setIsPasswordVisible'];
  setPassword: KangurLoginPageState['setPassword'];
  showCaptcha: boolean;
  submitButtonLabel: string;
  submitDisabled: boolean;
  successMessage: string | null;
  successMessageId: string;
  translations: KangurLoginTranslations;
}): React.JSX.Element {
  const {
    activeFormNotice,
    authMode,
    captchaContainerRef,
    clearInlineFeedback,
    formError,
    formErrorId,
    formNoticeId,
    formRef,
    handleIdentifierBlur,
    handleSubmit,
    identifier,
    identifierDescribedBy,
    identifierInputRef,
    identifierInputType,
    identifierLabel,
    identifierPlaceholder,
    isEmailIdentifierField,
    isIdentifierInvalid,
    isLoading,
    isPasswordInvalid,
    isPasswordVisible,
    loginKind,
    password,
    passwordDescribedBy,
    passwordHintId,
    passwordHelperText,
    passwordInputRef,
    setIdentifier,
    setIsPasswordVisible,
    setPassword,
    showCaptcha,
    submitButtonLabel,
    submitDisabled,
    successMessage,
    successMessageId,
    translations,
  } = props;

  return (
    <form
      ref={formRef}
      data-testid='kangur-login-form'
      data-hydrated='true'
      data-login-kind={loginKind}
      data-tutor-anchor='login_form'
      noValidate
      onSubmit={handleSubmit}
      className={`mt-6 ${KANGUR_STACK_RELAXED_CLASSNAME}`}
      aria-busy={isLoading}
    >
      <KangurLoginIdentifierField
        clearInlineFeedback={clearInlineFeedback}
        disabled={isLoading}
        identifier={identifier}
        identifierDescribedBy={identifierDescribedBy}
        identifierInputRef={identifierInputRef}
        identifierInputType={identifierInputType}
        identifierLabel={identifierLabel}
        identifierPlaceholder={identifierPlaceholder}
        isEmailIdentifierField={isEmailIdentifierField}
        isIdentifierInvalid={isIdentifierInvalid}
        onBlur={handleIdentifierBlur}
        setIdentifier={setIdentifier}
      />
      <KangurLoginPasswordField
        clearInlineFeedback={clearInlineFeedback}
        disabled={isLoading}
        isPasswordInvalid={isPasswordInvalid}
        isPasswordVisible={isPasswordVisible}
        password={password}
        passwordDescribedBy={passwordDescribedBy}
        passwordHintId={passwordHintId}
        passwordHelperText={passwordHelperText}
        passwordInputRef={passwordInputRef}
        setIsPasswordVisible={setIsPasswordVisible}
        setPassword={setPassword}
        translations={translations}
      />
      {showCaptcha && authMode === 'create-account' ? (
        <div ref={captchaContainerRef} className='min-h-[65px] self-center' />
      ) : null}
      <KangurLoginFormStatus
        activeFormNotice={activeFormNotice}
        formError={formError}
        formErrorId={formErrorId}
        formNoticeId={formNoticeId}
        successMessage={successMessage}
        successMessageId={successMessageId}
      />
      <KangurButton
        type='submit'
        variant='primary'
        size='lg'
        fullWidth
        disabled={submitDisabled}
        className='justify-center rounded-xl'
      >
        {submitButtonLabel}
      </KangurButton>
    </form>
  );
}

function KangurLoginVerificationSection(props: {
  clearVerificationState: KangurLoginPageState['clearVerificationState'];
  continueToSignInLabel: string | null;
  handleChangeEmail: () => void;
  handleContinueToSignIn: (() => void) | null;
  handleResendVerification: KangurLoginPageState['handleResendVerification'];
  isLoading: boolean;
  resendCooldownLabel: KangurLoginPageState['resendCooldownLabel'];
  resendHelper: string | null;
  resendLabel: string;
  showParentAuthModeTabs: ReturnType<typeof useKangurLoginPageProps>['showParentAuthModeTabs'];
  translations: KangurLoginTranslations;
  verificationCard: KangurLoginPageState['verificationCard'];
}): React.JSX.Element | null {
  const {
    continueToSignInLabel,
    handleChangeEmail,
    handleContinueToSignIn,
    handleResendVerification,
    isLoading,
    resendCooldownLabel,
    resendHelper,
    resendLabel,
    showParentAuthModeTabs,
    translations,
    verificationCard,
  } = props;

  if (!verificationCard) {
    return null;
  }

  return (
    <ParentVerificationCard
      {...verificationCard}
      resendLabel={resendLabel}
      resendDisabled={Boolean(resendCooldownLabel) || isLoading}
      resendHelper={resendHelper}
      changeEmailLabel={translations('changeEmailAction')}
      onChangeEmail={handleChangeEmail}
      continueToSignInLabel={
        showParentAuthModeTabs === false ? continueToSignInLabel : null
      }
      onContinueToSignIn={
        showParentAuthModeTabs === false ? handleContinueToSignIn : null
      }
      onResend={() => void handleResendVerification()}
    />
  );
}

function KangurLoginPageLayout(props: {
  activeFormNotice: string | null;
  authMode: KangurLoginPageState['authMode'];
  authModeHint: string;
  captchaContainerRef: KangurLoginPageState['captchaContainerRef'];
  clearInlineFeedback: KangurLoginPageState['clearInlineFeedback'];
  clearVerificationState: KangurLoginPageState['clearVerificationState'];
  continueToSignInLabel: string | null;
  formError: string | null;
  formErrorId: string;
  formNoticeId: string;
  formRef: React.RefObject<HTMLFormElement | null>;
  handleChangeEmail: () => void;
  handleContinueToSignIn: (() => void) | null;
  handleIdentifierBlur: () => void;
  handleModeSwitch: KangurLoginPageState['handleModeSwitch'];
  handleResendVerification: KangurLoginPageState['handleResendVerification'];
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  identifier: string;
  identifierDescribedBy: string;
  identifierInputRef: KangurLoginPageState['identifierInputRef'];
  identifierInputType: 'email' | 'text';
  identifierLabel: string;
  identifierPlaceholder: string;
  isEmailIdentifierField: boolean;
  isIdentifierInvalid: boolean;
  isLoading: boolean;
  isPasswordInvalid: boolean;
  isPasswordVisible: boolean;
  loginFormEntry: KangurLoginPageState['loginFormEntry'];
  loginKind: KangurLoginPageState['loginKind'];
  password: string;
  passwordDescribedBy: string;
  passwordHintId: string;
  passwordHelperText: string;
  passwordInputRef: KangurLoginPageState['passwordInputRef'];
  resendCooldownLabel: KangurLoginPageState['resendCooldownLabel'];
  resendHelper: string | null;
  resendLabel: string;
  setIdentifier: KangurLoginPageState['setIdentifier'];
  setIsPasswordVisible: KangurLoginPageState['setIsPasswordVisible'];
  setPassword: KangurLoginPageState['setPassword'];
  showCaptcha: boolean;
  showForm: boolean;
  showParentAuthModeTabs: ReturnType<typeof useKangurLoginPageProps>['showParentAuthModeTabs'];
  submitButtonLabel: string;
  submitDisabled: boolean;
  successMessage: string | null;
  successMessageId: string;
  translations: KangurLoginTranslations;
  verificationCard: KangurLoginPageState['verificationCard'];
}): React.JSX.Element {
  const {
    activeFormNotice,
    authMode,
    authModeHint,
    captchaContainerRef,
    clearInlineFeedback,
    clearVerificationState,
    continueToSignInLabel,
    formError,
    formErrorId,
    formNoticeId,
    formRef,
    handleChangeEmail,
    handleContinueToSignIn,
    handleIdentifierBlur,
    handleModeSwitch,
    handleResendVerification,
    handleSubmit,
    identifier,
    identifierDescribedBy,
    identifierInputRef,
    identifierInputType,
    identifierLabel,
    identifierPlaceholder,
    isEmailIdentifierField,
    isIdentifierInvalid,
    isLoading,
    isPasswordInvalid,
    isPasswordVisible,
    loginFormEntry,
    loginKind,
    password,
    passwordDescribedBy,
    passwordHintId,
    passwordHelperText,
    passwordInputRef,
    resendCooldownLabel,
    resendHelper,
    resendLabel,
    setIdentifier,
    setIsPasswordVisible,
    setPassword,
    showCaptcha,
    showForm,
    showParentAuthModeTabs,
    submitButtonLabel,
    submitDisabled,
    successMessage,
    successMessageId,
    translations,
    verificationCard,
  } = props;

  return (
    <div className='flex w-full justify-center py-12'>
      <KangurGlassPanel
        variant='soft'
        padding='xl'
        className='w-full max-w-4xl overflow-hidden'
        data-testid='kangur-login-shell'
      >
        <div className={`${KANGUR_PANEL_GAP_CLASSNAME} flex flex-col lg:flex-row`}>
          <KangurLoginHero
            loginFormEntry={loginFormEntry}
            translations={translations}
          />

          <div className='flex-1'>
            <KangurLoginModeTabs
              authMode={authMode}
              handleModeSwitch={handleModeSwitch}
              showParentAuthModeTabs={showParentAuthModeTabs}
              translations={translations}
            />
            <KangurLoginModeHint authModeHint={authModeHint} />
            {showForm ? (
              <KangurLoginFormPanel
                activeFormNotice={activeFormNotice}
                authMode={authMode}
                captchaContainerRef={captchaContainerRef}
                clearInlineFeedback={clearInlineFeedback}
                formError={formError}
                formErrorId={formErrorId}
                formNoticeId={formNoticeId}
                formRef={formRef}
                handleIdentifierBlur={handleIdentifierBlur}
                handleSubmit={handleSubmit}
                identifier={identifier}
                identifierDescribedBy={identifierDescribedBy}
                identifierInputRef={identifierInputRef}
                identifierInputType={identifierInputType}
                identifierLabel={identifierLabel}
                identifierPlaceholder={identifierPlaceholder}
                isEmailIdentifierField={isEmailIdentifierField}
                isIdentifierInvalid={isIdentifierInvalid}
                isLoading={isLoading}
                isPasswordInvalid={isPasswordInvalid}
                isPasswordVisible={isPasswordVisible}
                loginKind={loginKind}
                password={password}
                passwordDescribedBy={passwordDescribedBy}
                passwordHintId={passwordHintId}
                passwordHelperText={passwordHelperText}
                passwordInputRef={passwordInputRef}
                setIdentifier={setIdentifier}
                setIsPasswordVisible={setIsPasswordVisible}
                setPassword={setPassword}
                showCaptcha={showCaptcha}
                submitButtonLabel={submitButtonLabel}
                submitDisabled={submitDisabled}
                successMessage={successMessage}
                successMessageId={successMessageId}
                translations={translations}
              />
            ) : null}
            <KangurLoginVerificationSection
              clearVerificationState={clearVerificationState}
              continueToSignInLabel={continueToSignInLabel}
              handleChangeEmail={handleChangeEmail}
              handleContinueToSignIn={handleContinueToSignIn}
              handleResendVerification={handleResendVerification}
              isLoading={isLoading}
              resendCooldownLabel={resendCooldownLabel}
              resendHelper={resendHelper}
              resendLabel={resendLabel}
              showParentAuthModeTabs={showParentAuthModeTabs}
              translations={translations}
              verificationCard={verificationCard}
            />
          </div>
        </div>
      </KangurGlassPanel>
    </div>
  );
}

export function KangurLoginPageContent(): React.JSX.Element {
  const state = useKangurLoginPageState();
  const { showParentAuthModeTabs } = useKangurLoginPageProps();
  const searchParams = useSearchParams();
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
  const auth = useOptionalKangurAuth();
  const { formRef } = useKangurLoginPageSideEffects({
    auth,
    clearInlineFeedback,
    clearVerificationState,
    formNoticeSetter: setFormNotice,
    identifierInputRef,
    loginFormEntry,
    scheduleFieldFocus,
    searchParams,
    setAuthMode,
    setIdentifier,
    setIsLoading,
    setPassword,
    showFormError,
    translations,
  });
  const presentation = useKangurLoginPagePresentationState({
    authMode,
    formError,
    formErrorId,
    formNotice,
    formNoticeId,
    identifier,
    identifierEntry,
    inputErrorTarget,
    isLoading,
    loginKind,
    password,
    passwordHintId,
    resendCooldownLabel,
    showParentAuthModeTabs,
    submitStage,
    successMessage,
    successMessageId,
    translations,
    verificationCard,
  });
  const actions = useKangurLoginPageActionHandlers({
    authMode,
    callbackValue,
    captchaToken,
    clearInlineFeedback,
    clearVerificationState,
    handleLoginSuccess,
    identifier,
    isLoading,
    loginKind,
    normalizeLoginCallbackHref,
    password,
    scheduleFieldFocus,
    scheduleResendCooldown,
    setAuthMode,
    setIdentifier,
    setIsLoading,
    setIsPasswordVisible,
    setPassword,
    setFormNotice,
    setSubmitStage,
    setVerificationCard,
    showFormError,
    showInputError,
    showParentAuthModeTabs,
    translations,
  });

  return (
    <KangurLoginPageLayout
      activeFormNotice={presentation.activeFormNotice}
      authMode={authMode}
      authModeHint={presentation.authModeHint}
      captchaContainerRef={captchaContainerRef}
      clearInlineFeedback={clearInlineFeedback}
      clearVerificationState={clearVerificationState}
      continueToSignInLabel={presentation.continueToSignInLabel}
      formError={formError}
      formErrorId={formErrorId}
      formNoticeId={formNoticeId}
      formRef={formRef}
      handleChangeEmail={actions.handleChangeEmail}
      handleContinueToSignIn={actions.handleContinueToSignIn}
      handleIdentifierBlur={actions.handleIdentifierBlur}
      handleModeSwitch={handleModeSwitch}
      handleResendVerification={handleResendVerification}
      handleSubmit={actions.handleSubmit}
      identifier={identifier}
      identifierDescribedBy={presentation.identifierDescribedBy}
      identifierInputRef={identifierInputRef}
      identifierInputType={presentation.identifierInputType}
      identifierLabel={presentation.identifierLabel}
      identifierPlaceholder={presentation.identifierPlaceholder}
      isEmailIdentifierField={presentation.isEmailIdentifierField}
      isIdentifierInvalid={presentation.isIdentifierInvalid}
      isLoading={isLoading}
      isPasswordInvalid={presentation.isPasswordInvalid}
      isPasswordVisible={isPasswordVisible}
      loginFormEntry={loginFormEntry}
      loginKind={loginKind}
      password={password}
      passwordDescribedBy={presentation.passwordDescribedBy}
      passwordHintId={passwordHintId}
      passwordHelperText={presentation.passwordHelperText}
      passwordInputRef={passwordInputRef}
      resendCooldownLabel={resendCooldownLabel}
      resendHelper={presentation.resendHelper}
      resendLabel={presentation.resendLabel}
      setIdentifier={setIdentifier}
      setIsPasswordVisible={setIsPasswordVisible}
      setPassword={setPassword}
      showCaptcha={presentation.showCaptcha}
      showForm={presentation.showForm}
      showParentAuthModeTabs={showParentAuthModeTabs}
      submitButtonLabel={presentation.submitButtonLabel}
      submitDisabled={presentation.submitDisabled}
      successMessage={successMessage}
      successMessageId={successMessageId}
      translations={translations}
      verificationCard={verificationCard}
    />
  );
}

const resolveKangurLoginPageCurrentOrigin = (): string | null =>
  typeof window === 'undefined' ? null : window.location.origin;

const resolveKangurLoginPageRouteAwareDefaultCallbackUrl = ({
  canonicalizePublicAlias,
  pathname,
  routing,
}: {
  canonicalizePublicAlias: boolean;
  pathname: string | null;
  routing: ReturnType<typeof useOptionalKangurRouting>;
}): string =>
  resolveRouteAwareManagedKangurHref({
    href: getKangurHomeHref(routing?.basePath),
    pathname,
    currentOrigin: resolveKangurLoginPageCurrentOrigin(),
    canonicalizePublicAlias,
  }) ?? getKangurHomeHref(routing?.basePath);

const resolveKangurLoginPageDefaultCallbackUrl = ({
  pathname,
  props,
  routeAwareDefaultCallbackUrl,
  routing,
  sanitizeManagedHref,
}: {
  pathname: string | null;
  props: Omit<KangurLoginPageProps, 'defaultCallbackUrl'> & {
    defaultCallbackUrl?: string;
  };
  routeAwareDefaultCallbackUrl: string;
  routing: ReturnType<typeof useOptionalKangurRouting>;
  sanitizeManagedHref: ReturnType<typeof useKangurRouteAccess>['sanitizeManagedHref'];
}): string =>
  sanitizeManagedHref({
    href: props.defaultCallbackUrl ?? routeAwareDefaultCallbackUrl,
    pathname,
    currentOrigin: null,
    basePath: routing?.basePath,
    fallbackHref: routeAwareDefaultCallbackUrl,
  }) ?? routeAwareDefaultCallbackUrl;

const resolveKangurLoginPageCallbackUrl = ({
  props,
  searchParams,
}: {
  props: Omit<KangurLoginPageProps, 'defaultCallbackUrl'> & {
    defaultCallbackUrl?: string;
  };
  searchParams: ReturnType<typeof useSearchParams>;
}): string | undefined => props.callbackUrl ?? searchParams?.get('callbackUrl') ?? undefined;

const resolveKangurLoginPageParentAuthMode = ({
  props,
  searchParams,
}: {
  props: Omit<KangurLoginPageProps, 'defaultCallbackUrl'> & {
    defaultCallbackUrl?: string;
  };
  searchParams: ReturnType<typeof useSearchParams>;
}): KangurLoginPageProps['parentAuthMode'] =>
  props.parentAuthMode ??
  parseKangurAuthMode(searchParams?.get(KANGUR_PARENT_AUTH_MODE_PARAM), 'sign-in');

const resolveKangurLoginPageContextValue = ({
  pathname,
  props,
  routeAwareDefaultCallbackUrl,
  routing,
  sanitizeManagedHref,
  searchParams,
}: {
  pathname: string | null;
  props: Omit<KangurLoginPageProps, 'defaultCallbackUrl'> & {
    defaultCallbackUrl?: string;
  };
  routeAwareDefaultCallbackUrl: string;
  routing: ReturnType<typeof useOptionalKangurRouting>;
  sanitizeManagedHref: ReturnType<typeof useKangurRouteAccess>['sanitizeManagedHref'];
  searchParams: ReturnType<typeof useSearchParams>;
}) => {
  const defaultCallbackUrl = resolveKangurLoginPageDefaultCallbackUrl({
    pathname,
    props,
    routeAwareDefaultCallbackUrl,
    routing,
    sanitizeManagedHref,
  });
  const callbackUrl = resolveKangurLoginPageCallbackUrl({ props, searchParams });
  const parentAuthMode = resolveKangurLoginPageParentAuthMode({
    props,
    searchParams,
  });

  return {
    defaultCallbackUrl,
    callbackUrl,
    onClose: props.onClose,
    parentAuthMode,
    showParentAuthModeTabs: props.showParentAuthModeTabs,
  };
};

export function KangurLoginPage(props: Omit<KangurLoginPageProps, 'defaultCallbackUrl'> & { defaultCallbackUrl?: string }): React.JSX.Element {
  const translations = useTranslations('KangurLogin');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routing = useOptionalKangurRouting();
  const frontendPublicOwner = useOptionalFrontendPublicOwner();
  const { sanitizeManagedHref } = useKangurRouteAccess();

  const routeAwareDefaultCallbackUrl = resolveKangurLoginPageRouteAwareDefaultCallbackUrl({
    canonicalizePublicAlias: frontendPublicOwner?.publicOwner === 'kangur',
    pathname,
    routing,
  });

  const contextValue = useMemo(
    () =>
      resolveKangurLoginPageContextValue({
        pathname,
        props,
        routeAwareDefaultCallbackUrl,
        routing,
        sanitizeManagedHref,
        searchParams,
      }),
    [props, pathname, routeAwareDefaultCallbackUrl, routing, sanitizeManagedHref, searchParams]
  );

  return (
    <KangurLoginPagePropsContext.Provider value={contextValue}>
      <Suspense fallback={<LoadingState className='h-64' message={translations('loading')} />}>
        <KangurLoginPageContent />
      </Suspense>
    </KangurLoginPagePropsContext.Provider>
  );
}

export default KangurLoginPage;
