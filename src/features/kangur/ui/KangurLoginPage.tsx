'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { Suspense, useMemo } from 'react';

import { useOptionalFrontendPublicOwner } from '@/features/kangur/ui/FrontendPublicOwnerContext';
import { useOptionalKangurAuthActions } from '@/features/kangur/ui/context/KangurAuthContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';
import {
  KangurLoginPagePropsContext,
  useKangurLoginPageProps,
} from '@/features/kangur/ui/login-page/login-context';
import { LoadingState } from '@/features/kangur/shared/ui';
import { useKangurLoginPageActionHandlers } from './KangurLoginPage.actions';
import { KangurLoginPageLayout } from './KangurLoginPage.components';
import { useKangurLoginPageState } from './KangurLoginPage.hooks';
import {
  resolveKangurLoginPageContextValue,
  resolveKangurLoginPageRouteAwareDefaultCallbackUrl,
  type KangurLoginPageComponentProps,
} from './KangurLoginPage.routing';
import {
  useKangurLoginPagePresentationState,
  useKangurLoginPageSideEffects,
} from './KangurLoginPage.runtime';

export { resolveKangurLoginCallbackNavigation } from '@/features/kangur/ui/login-page/use-login-logic';

type KangurLoginPageLayoutProps = React.ComponentProps<typeof KangurLoginPageLayout>;
type KangurLoginPageSideEffectsOptions = Parameters<typeof useKangurLoginPageSideEffects>[0];
type KangurLoginPagePresentationOptions = Parameters<
  typeof useKangurLoginPagePresentationState
>[0];
type KangurLoginPageActionOptions = Parameters<typeof useKangurLoginPageActionHandlers>[0];
type KangurLoginPageStateValue = ReturnType<typeof useKangurLoginPageState>;

type KangurLoginPageContentRuntime = {
  actions: ReturnType<typeof useKangurLoginPageActionHandlers>;
  formRef: ReturnType<typeof useKangurLoginPageSideEffects>['formRef'];
  presentation: ReturnType<typeof useKangurLoginPagePresentationState>;
  showParentAuthModeTabs: ReturnType<typeof useKangurLoginPageProps>['showParentAuthModeTabs'];
  state: KangurLoginPageStateValue;
};

function buildKangurLoginPageSideEffectsOptions(args: {
  authActions: ReturnType<typeof useOptionalKangurAuthActions>;
  searchParams: ReturnType<typeof useSearchParams>;
  state: KangurLoginPageStateValue;
}): KangurLoginPageSideEffectsOptions {
  const { authActions, searchParams, state } = args;

  return {
    authActions,
    clearInlineFeedback: state.clearInlineFeedback,
    clearVerificationState: state.clearVerificationState,
    formNoticeSetter: state.setFormNotice,
    identifierInputRef: state.identifierInputRef,
    loginFormEntry: state.loginFormEntry,
    scheduleFieldFocus: state.scheduleFieldFocus,
    searchParams,
    setAuthMode: state.setAuthMode,
    setIdentifier: state.setIdentifier,
    setIsLoading: state.setIsLoading,
    setPassword: state.setPassword,
    showFormError: state.showFormError,
    translations: state.translations,
  };
}

function buildKangurLoginPagePresentationOptions(args: {
  showParentAuthModeTabs: ReturnType<typeof useKangurLoginPageProps>['showParentAuthModeTabs'];
  state: KangurLoginPageStateValue;
}): KangurLoginPagePresentationOptions {
  const { showParentAuthModeTabs, state } = args;

  return {
    authMode: state.authMode,
    formError: state.formError,
    formErrorId: state.formErrorId,
    formNotice: state.formNotice,
    formNoticeId: state.formNoticeId,
    identifier: state.identifier,
    identifierEntry: state.identifierEntry,
    inputErrorTarget: state.inputErrorTarget,
    isLoading: state.isLoading,
    loginKind: state.loginKind,
    password: state.password,
    passwordHintId: state.passwordHintId,
    resendCooldownLabel: state.resendCooldownLabel,
    showParentAuthModeTabs,
    submitStage: state.submitStage,
    successMessage: state.successMessage,
    successMessageId: state.successMessageId,
    translations: state.translations,
    verificationCard: state.verificationCard,
  };
}

function buildKangurLoginPageActionOptions(args: {
  showParentAuthModeTabs: ReturnType<typeof useKangurLoginPageProps>['showParentAuthModeTabs'];
  state: KangurLoginPageStateValue;
}): KangurLoginPageActionOptions {
  const { showParentAuthModeTabs, state } = args;

  return {
    authMode: state.authMode,
    callbackValue: state.callbackValue,
    captchaToken: state.captchaToken,
    clearInlineFeedback: state.clearInlineFeedback,
    clearVerificationState: state.clearVerificationState,
    handleLoginSuccess: state.handleLoginSuccess,
    identifier: state.identifier,
    isLoading: state.isLoading,
    loginKind: state.loginKind,
    normalizeLoginCallbackHref: state.normalizeLoginCallbackHref,
    password: state.password,
    scheduleFieldFocus: state.scheduleFieldFocus,
    scheduleResendCooldown: state.scheduleResendCooldown,
    setAuthMode: state.setAuthMode,
    setFormNotice: state.setFormNotice,
    setIdentifier: state.setIdentifier,
    setIsLoading: state.setIsLoading,
    setIsPasswordVisible: state.setIsPasswordVisible,
    setPassword: state.setPassword,
    setSubmitStage: state.setSubmitStage,
    setVerificationCard: state.setVerificationCard,
    showFormError: state.showFormError,
    showInputError: state.showInputError,
    showParentAuthModeTabs,
    translations: state.translations,
  };
}

function useKangurLoginPageContentRuntime(): KangurLoginPageContentRuntime {
  const state = useKangurLoginPageState();
  const { showParentAuthModeTabs } = useKangurLoginPageProps();
  const searchParams = useSearchParams();
  const authActions = useOptionalKangurAuthActions();
  const { formRef } = useKangurLoginPageSideEffects(
    buildKangurLoginPageSideEffectsOptions({ authActions, searchParams, state })
  );
  const presentation = useKangurLoginPagePresentationState(
    buildKangurLoginPagePresentationOptions({ showParentAuthModeTabs, state })
  );
  const actions = useKangurLoginPageActionHandlers(
    buildKangurLoginPageActionOptions({ showParentAuthModeTabs, state })
  );

  return { actions, formRef, presentation, showParentAuthModeTabs, state };
}

function buildKangurLoginPageLayoutNoticeProps(
  runtime: KangurLoginPageContentRuntime
): Pick<
  KangurLoginPageLayoutProps,
  | 'activeFormNotice'
  | 'authModeHint'
  | 'continueToSignInLabel'
  | 'formError'
  | 'formErrorId'
  | 'formNoticeId'
  | 'resendHelper'
  | 'resendLabel'
  | 'submitButtonLabel'
  | 'successMessage'
  | 'successMessageId'
> {
  return {
    activeFormNotice: runtime.presentation.activeFormNotice,
    authModeHint: runtime.presentation.authModeHint,
    continueToSignInLabel: runtime.presentation.continueToSignInLabel,
    formError: runtime.state.formError,
    formErrorId: runtime.state.formErrorId,
    formNoticeId: runtime.state.formNoticeId,
    resendHelper: runtime.presentation.resendHelper,
    resendLabel: runtime.presentation.resendLabel,
    submitButtonLabel: runtime.presentation.submitButtonLabel,
    successMessage: runtime.state.successMessage,
    successMessageId: runtime.state.successMessageId,
  };
}

function buildKangurLoginPageLayoutFieldProps(
  runtime: KangurLoginPageContentRuntime
): Pick<
  KangurLoginPageLayoutProps,
  | 'identifier'
  | 'identifierDescribedBy'
  | 'identifierInputRef'
  | 'identifierInputType'
  | 'identifierLabel'
  | 'identifierPlaceholder'
  | 'isEmailIdentifierField'
  | 'isIdentifierInvalid'
  | 'isLoading'
  | 'isPasswordInvalid'
  | 'isPasswordVisible'
  | 'password'
  | 'passwordDescribedBy'
  | 'passwordHintId'
  | 'passwordHelperText'
  | 'passwordInputRef'
  | 'setIdentifier'
  | 'setIsPasswordVisible'
  | 'setPassword'
  | 'showCaptcha'
  | 'showForm'
  | 'submitDisabled'
> {
  return {
    identifier: runtime.state.identifier,
    identifierDescribedBy: runtime.presentation.identifierDescribedBy,
    identifierInputRef: runtime.state.identifierInputRef,
    identifierInputType: runtime.presentation.identifierInputType,
    identifierLabel: runtime.presentation.identifierLabel,
    identifierPlaceholder: runtime.presentation.identifierPlaceholder,
    isEmailIdentifierField: runtime.presentation.isEmailIdentifierField,
    isIdentifierInvalid: runtime.presentation.isIdentifierInvalid,
    isLoading: runtime.state.isLoading,
    isPasswordInvalid: runtime.presentation.isPasswordInvalid,
    isPasswordVisible: runtime.state.isPasswordVisible,
    password: runtime.state.password,
    passwordDescribedBy: runtime.presentation.passwordDescribedBy,
    passwordHintId: runtime.state.passwordHintId,
    passwordHelperText: runtime.presentation.passwordHelperText,
    passwordInputRef: runtime.state.passwordInputRef,
    setIdentifier: runtime.state.setIdentifier,
    setIsPasswordVisible: runtime.state.setIsPasswordVisible,
    setPassword: runtime.state.setPassword,
    showCaptcha: runtime.presentation.showCaptcha,
    showForm: runtime.presentation.showForm,
    submitDisabled: runtime.presentation.submitDisabled,
  };
}

function buildKangurLoginPageLayoutActionProps(
  runtime: KangurLoginPageContentRuntime
): Pick<
  KangurLoginPageLayoutProps,
  | 'clearInlineFeedback'
  | 'handleChangeEmail'
  | 'handleContinueToSignIn'
  | 'handleIdentifierBlur'
  | 'handleModeSwitch'
  | 'handleResendVerification'
  | 'handleSubmit'
> {
  return {
    clearInlineFeedback: runtime.state.clearInlineFeedback,
    handleChangeEmail: runtime.actions.handleChangeEmail,
    handleContinueToSignIn: runtime.actions.handleContinueToSignIn,
    handleIdentifierBlur: runtime.actions.handleIdentifierBlur,
    handleModeSwitch: runtime.state.handleModeSwitch,
    handleResendVerification: runtime.state.handleResendVerification,
    handleSubmit: runtime.actions.handleSubmit,
  };
}

function buildKangurLoginPageLayoutProps(
  runtime: KangurLoginPageContentRuntime
): KangurLoginPageLayoutProps {
  return {
    ...buildKangurLoginPageLayoutNoticeProps(runtime),
    ...buildKangurLoginPageLayoutFieldProps(runtime),
    ...buildKangurLoginPageLayoutActionProps(runtime),
    authMode: runtime.state.authMode,
    captchaContainerRef: runtime.state.captchaContainerRef,
    formRef: runtime.formRef,
    loginFormEntry: runtime.state.loginFormEntry,
    loginKind: runtime.state.loginKind,
    resendCooldownLabel: runtime.state.resendCooldownLabel,
    showParentAuthModeTabs: runtime.showParentAuthModeTabs,
    translations: runtime.state.translations,
    verificationCard: runtime.state.verificationCard,
  };
}

export function KangurLoginPageContent(): React.JSX.Element {
  const runtime = useKangurLoginPageContentRuntime();

  return <KangurLoginPageLayout {...buildKangurLoginPageLayoutProps(runtime)} />;
}

export function KangurLoginPage(
  props: KangurLoginPageComponentProps
): React.JSX.Element {
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
