'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { Suspense, useMemo } from 'react';

import { useOptionalFrontendPublicOwner } from '@/features/kangur/ui/FrontendPublicOwnerContext';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';
import {
  KangurLoginPagePropsContext,
  type KangurLoginPageProps,
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
