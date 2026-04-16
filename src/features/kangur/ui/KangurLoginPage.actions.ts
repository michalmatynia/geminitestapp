'use client';

import { signIn } from 'next-auth/react';
import { type useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import {
  KANGUR_LEARNER_LOGIN_PATTERN,
  KANGUR_PARENT_CAPTCHA_SITE_KEY,
} from '@/features/kangur/ui/login-page/login-constants';
import type { KangurLoginPageProps } from '@/features/kangur/ui/login-page/login-context';
import { type useKangurLoginPageState } from './KangurLoginPage.hooks';
import {
  isValidParentEmail,
  normalizeParentEmail,
  parseJsonResponse,
  resetSessionsBeforeParentLogin,
  resetSessionsBeforeStudentLogin,
  resolveCredentialErrorTarget,
} from './KangurLoginPage.utils';

type KangurLoginPageState = ReturnType<typeof useKangurLoginPageState>;
type KangurLoginTranslations = ReturnType<typeof useTranslations>;

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

export function useKangurLoginPageActionHandlers(input: {
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
  showParentAuthModeTabs: KangurLoginPageProps['showParentAuthModeTabs'];
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
