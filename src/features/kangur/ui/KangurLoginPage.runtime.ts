'use client';

import { type useSearchParams } from 'next/navigation';
import { type useTranslations } from 'next-intl';
import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';

import { useKangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { type useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import {
  KANGUR_PARENT_CAPTCHA_SITE_KEY,
} from '@/features/kangur/ui/login-page/login-constants';
import type { KangurLoginPageProps } from '@/features/kangur/ui/login-page/login-context';
import { type useKangurLoginPageState } from './KangurLoginPage.hooks';
import {
  normalizeParentEmail,
  parseJsonResponse,
  resolveKangurClientEndpoint,
} from './KangurLoginPage.utils';

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
  fetch(resolveKangurClientEndpoint('/api/kangur/auth/parent-email/verify'), {
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
  showParentAuthModeTabs: KangurLoginPageProps['showParentAuthModeTabs'];
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

export function useKangurLoginPagePresentationState(input: {
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
  showParentAuthModeTabs: KangurLoginPageProps['showParentAuthModeTabs'];
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

export function useKangurLoginPageSideEffects(input: {
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
