'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';
import {
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_STACK_COMPACT_CLASSNAME,
  KANGUR_STACK_RELAXED_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import type { KangurLoginPageProps } from '@/features/kangur/ui/login-page/login-context';
import { useKangurLoginPageState } from './KangurLoginPage.hooks';

type KangurLoginPageState = ReturnType<typeof useKangurLoginPageState>;
type KangurLoginTranslations = ReturnType<typeof useTranslations>;

type KangurLoginPageContextValue = {
  activeFormNotice: string | null;
  authMode: KangurLoginPageState['authMode'];
  authModeHint: string;
  captchaContainerRef: KangurLoginPageState['captchaContainerRef'];
  clearInlineFeedback: KangurLoginPageState['clearInlineFeedback'];
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
  showParentAuthModeTabs: KangurLoginPageProps['showParentAuthModeTabs'];
  submitButtonLabel: string;
  submitDisabled: boolean;
  successMessage: string | null;
  successMessageId: string;
  translations: KangurLoginTranslations;
  verificationCard: KangurLoginPageState['verificationCard'];
};

const KangurLoginPageContext = React.createContext<KangurLoginPageContextValue | null>(null);

function useKangurLoginPage(): KangurLoginPageContextValue {
  const context = React.useContext(KangurLoginPageContext);
  if (!context) {
    throw new Error('useKangurLoginPage must be used within KangurLoginPageLayout.');
  }
  return context;
}

const KANGUR_LOGIN_PRIMARY_TEXT_STYLE: React.CSSProperties = {
  color: 'var(--kangur-page-text, #0f172a)',
};

const KANGUR_LOGIN_MUTED_TEXT_STYLE: React.CSSProperties = {
  color: 'var(--kangur-page-muted-text, #64748b)',
};

const KANGUR_LOGIN_SOFT_SURFACE_STYLE: React.CSSProperties = {
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 92%, transparent) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 84%, var(--kangur-page-background, #f8fafc)) 100%)',
  borderColor: 'var(--kangur-soft-card-border, rgba(148,163,184,0.35))',
  boxShadow: 'var(--kangur-soft-card-shadow, 0 18px 42px rgba(15,23,42,0.12))',
};

const KANGUR_LOGIN_TEXT_FIELD_STYLE: React.CSSProperties = {
  background: 'var(--kangur-text-field-background, #ffffff)',
  borderColor: 'var(--kangur-text-field-border, rgba(148,163,184,0.35))',
  color: 'var(--kangur-text-field-text, #0f172a)',
};

function VerificationCardNotices(): React.JSX.Element {
  const { translations, verificationCard } = useKangurLoginPage();
  if (!verificationCard) return <></>;
  const { email, error, message, verificationUrl } = verificationCard;

  return (
    <>
      <div className='text-sm font-semibold' style={KANGUR_LOGIN_PRIMARY_TEXT_STYLE}>
        {translations('checkInboxLabel', { email })}
      </div>
      {message ? (
        <div
          role='status'
          aria-live='polite'
          className='mt-3 text-sm font-medium'
          style={KANGUR_LOGIN_PRIMARY_TEXT_STYLE}
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
          className='mt-4 inline-flex cursor-pointer text-sm font-semibold text-indigo-600 underline underline-offset-4'
          href={verificationUrl}
          target='_blank'
          rel='noopener noreferrer'
        >
          {translations('verifyEmailNow')}
        </a>
      ) : null}
    </>
  );
}

function VerificationCardActions(): React.JSX.Element {
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
  } = useKangurLoginPage();

  const resendDisabled = Boolean(resendCooldownLabel) || isLoading;
  const changeEmailLabel = translations('changeEmailAction');
  const onResend = () => void handleResendVerification();

  const showContinueToSignIn = showParentAuthModeTabs === false;

  return (
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
        <div className='text-xs' style={KANGUR_LOGIN_MUTED_TEXT_STYLE}>
          {resendHelper}
        </div>
      ) : null}
      {changeEmailLabel && handleChangeEmail ? (
        <KangurButton
          type='button'
          variant='ghost'
          size='sm'
          onClick={handleChangeEmail}
          className='justify-start px-0'
        >
          {changeEmailLabel}
        </KangurButton>
      ) : null}
      {showContinueToSignIn && continueToSignInLabel && handleContinueToSignIn ? (
        <KangurButton
          type='button'
          variant='ghost'
          size='sm'
          onClick={handleContinueToSignIn}
          className='justify-start px-0'
        >
          {continueToSignInLabel}
        </KangurButton>
      ) : null}
    </div>
  );
}

export const ParentVerificationCard = (): React.JSX.Element => {
  return (
    <div className='mt-6 rounded-2xl border p-5' style={KANGUR_LOGIN_SOFT_SURFACE_STYLE}>
      <VerificationCardNotices />
      <VerificationCardActions />
    </div>
  );
};

function KangurLoginHero(): React.JSX.Element {
  const { loginFormEntry, translations } = useKangurLoginPage();

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
          <p className='text-sm' style={KANGUR_LOGIN_MUTED_TEXT_STYLE}>
            {loginFormEntry.entry.summary}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function KangurLoginModeTabs(): React.JSX.Element | null {
  const { authMode, handleModeSwitch, showParentAuthModeTabs, translations } = useKangurLoginPage();

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

function KangurLoginModeHint(): React.JSX.Element {
  const { authModeHint } = useKangurLoginPage();
  return (
    <div
      data-testid='kangur-login-mode-hint'
      className='mt-4 rounded-xl border px-4 py-3 text-sm'
      style={{
        ...KANGUR_LOGIN_SOFT_SURFACE_STYLE,
        ...KANGUR_LOGIN_MUTED_TEXT_STYLE,
      }}
    >
      {authModeHint}
    </div>
  );
}

function KangurLoginIdentifierField(): React.JSX.Element {
  const {
    clearInlineFeedback,
    isLoading: disabled,
    identifier,
    identifierDescribedBy,
    identifierInputRef,
    identifierInputType,
    identifierLabel,
    identifierPlaceholder,
    isEmailIdentifierField,
    isIdentifierInvalid,
    handleIdentifierBlur: onBlur,
    setIdentifier,
  } = useKangurLoginPage();

  return (
    <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
      <label htmlFor='identifier' className='text-sm font-medium' style={KANGUR_LOGIN_PRIMARY_TEXT_STYLE}>
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
        className='rounded-xl border px-4 py-3 text-sm outline-none placeholder:[color:var(--kangur-text-field-placeholder,#94a3b8)] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
        style={KANGUR_LOGIN_TEXT_FIELD_STYLE}
        placeholder={identifierPlaceholder}
      />
    </div>
  );
}

function KangurLoginPasswordField(): React.JSX.Element {
  const {
    clearInlineFeedback,
    isLoading: disabled,
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
  } = useKangurLoginPage();

  return (
    <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
      <label htmlFor='password' className='text-sm font-medium' style={KANGUR_LOGIN_PRIMARY_TEXT_STYLE}>
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
          className='w-full rounded-xl border px-4 py-3 pr-11 text-sm outline-none placeholder:[color:var(--kangur-text-field-placeholder,#94a3b8)] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
          style={KANGUR_LOGIN_TEXT_FIELD_STYLE}
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
          className='absolute inset-y-0 right-0 px-3'
          style={KANGUR_LOGIN_MUTED_TEXT_STYLE}
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
        className='text-xs'
        style={KANGUR_LOGIN_MUTED_TEXT_STYLE}
      >
        {passwordHelperText}
      </p>
    </div>
  );
}

function KangurLoginFormStatus(): React.JSX.Element {
  const {
    activeFormNotice,
    formError,
    formErrorId,
    formNoticeId,
    successMessage,
    successMessageId,
  } = useKangurLoginPage();

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

function KangurLoginFormPanel(): React.JSX.Element {
  const {
    authMode,
    captchaContainerRef,
    formRef,
    handleSubmit,
    isLoading,
    loginKind,
    showCaptcha,
    submitButtonLabel,
    submitDisabled,
  } = useKangurLoginPage();

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
      <KangurLoginIdentifierField />
      <KangurLoginPasswordField />
      {showCaptcha && authMode === 'create-account' ? (
        <div ref={captchaContainerRef} className='min-h-[65px] self-center' />
      ) : null}
      <KangurLoginFormStatus />
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

function KangurLoginVerificationSection(): React.JSX.Element | null {
  const { verificationCard } = useKangurLoginPage();

  if (!verificationCard) {
    return null;
  }

  return <ParentVerificationCard />;
}

export function KangurLoginPageLayout(props: {
  activeFormNotice: string | null;
  authMode: KangurLoginPageState['authMode'];
  authModeHint: string;
  captchaContainerRef: KangurLoginPageState['captchaContainerRef'];
  clearInlineFeedback: KangurLoginPageState['clearInlineFeedback'];
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
  showParentAuthModeTabs: KangurLoginPageProps['showParentAuthModeTabs'];
  submitButtonLabel: string;
  submitDisabled: boolean;
  successMessage: string | null;
  successMessageId: string;
  translations: KangurLoginTranslations;
  verificationCard: KangurLoginPageState['verificationCard'];
}): React.JSX.Element {
  return (
    <KangurLoginPageContext.Provider value={props}>
      <div className='flex w-full justify-center py-12'>
        <KangurGlassPanel
          variant='soft'
          padding='xl'
          className='w-full max-w-4xl overflow-hidden'
          data-testid='kangur-login-shell'
        >
          <div className={`${KANGUR_PANEL_GAP_CLASSNAME} flex flex-col lg:flex-row`}>
            <KangurLoginHero />

            <div className='flex-1'>
              <KangurLoginModeTabs />
              <KangurLoginModeHint />
              {props.showForm ? (
                <KangurLoginFormPanel />
              ) : null}
              <KangurLoginVerificationSection />
            </div>
          </div>
        </KangurGlassPanel>
      </div>
    </KangurLoginPageContext.Provider>
  );
}
