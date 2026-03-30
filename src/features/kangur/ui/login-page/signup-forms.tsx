'use client';

import { type FormEvent, type JSX, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff } from 'lucide-react';
import { kangurButtonVariants } from '@/features/kangur/ui/design/primitives/KangurButton';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { cn } from '@/features/kangur/shared/utils';
import { useTurnstile } from './use-turnstile';
import { KANGUR_PARENT_CAPTCHA_SITE_KEY } from './login-constants';
import {
  KANGUR_STACK_RELAXED_CLASSNAME,
  KANGUR_STACK_COMPACT_CLASSNAME,
  KANGUR_STACK_ROOMY_CLASSNAME,
  KANGUR_STACK_SPACED_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

type SignupFormProps = {
  email: string;
  onSubmit: (password: string, captchaToken?: string) => void;
  isLoading: boolean;
  error?: string | null;
  notice?: string | null;
  captchaError?: string | null;
  isCaptchaRequired?: boolean;
};

type SignupFormFeedbackProps = Pick<SignupFormProps, 'error' | 'notice'>;

const resolveKangurSignupSubmitDisabled = ({
  captchaToken,
  isCaptchaRequired,
  isLoading,
  password,
}: {
  captchaToken: string | null;
  isCaptchaRequired: boolean;
  isLoading: boolean;
  password: string;
}): boolean =>
  isLoading || !password.trim() || (isCaptchaRequired && !captchaToken);

function SignupPasswordField(props: {
  isLoading: boolean;
  password: string;
  setPassword: (value: string) => void;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showPassword: boolean;
  translations: ReturnType<typeof useTranslations>;
}): JSX.Element {
  const {
    isLoading,
    password,
    setPassword,
    setShowPassword,
    showPassword,
    translations,
  } = props;

  return (
    <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
      <label htmlFor='new-password' className='text-sm font-medium text-slate-700'>
        {translations('setPasswordLabel')}
      </label>
      <div className='relative'>
        <input
          id='new-password'
          type={showPassword ? 'text' : 'password'}
          aria-label={translations('setPasswordLabel')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
          className='w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
          placeholder={translations('setPasswordPlaceholder')}
          autoComplete='new-password'
        />
        <button
          type='button'
          onClick={() => setShowPassword((visible) => !visible)}
          className='absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600'
          aria-label={
            showPassword
              ? translations('hidePassword')
              : translations('showPassword')
          }
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className='h-4 w-4' aria-hidden='true' />
          ) : (
            <Eye className='h-4 w-4' aria-hidden='true' />
          )}
        </button>
      </div>
      <p className='text-xs text-slate-500'>{translations('passwordRequirement')}</p>
    </div>
  );
}

function SignupCaptchaSection(props: {
  captchaContainerRef: React.RefObject<HTMLDivElement | null>;
  captchaError?: string | null;
  isCaptchaRequired: boolean;
  translations: ReturnType<typeof useTranslations>;
}): JSX.Element | null {
  const {
    captchaContainerRef,
    captchaError,
    isCaptchaRequired,
    translations,
  } = props;

  if (!isCaptchaRequired || !KANGUR_PARENT_CAPTCHA_SITE_KEY) {
    return null;
  }

  return (
    <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
      <div
        ref={captchaContainerRef}
        className='min-h-[65px] self-center'
        aria-label={translations('securityVerificationLabel')}
      />
      {captchaError ? (
        <p className='text-center text-xs font-medium text-rose-600' role='alert'>
          {captchaError}
        </p>
      ) : null}
    </div>
  );
}

function SignupFormFeedback({
  error,
  notice,
}: SignupFormFeedbackProps): JSX.Element | null {
  if (error) {
    return (
      <div className='rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600' role='alert'>
        {error}
      </div>
    );
  }

  if (notice) {
    return (
      <div className='rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-600' role='status'>
        {notice}
      </div>
    );
  }

  return null;
}

function VerificationDebugLink(props: {
  debugUrl?: string | null;
  translations: ReturnType<typeof useTranslations>;
}): JSX.Element | null {
  const { debugUrl, translations } = props;
  if (!debugUrl || process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div
      className={`mt-4 ${KANGUR_STACK_COMPACT_CLASSNAME} rounded-lg border border-slate-200 bg-slate-50 p-3 text-left`}
    >
      <p className='text-xs font-bold uppercase tracking-wider text-slate-500'>
        {translations('debugLinkLabel')}
      </p>
      <a
        href={debugUrl}
        className='break-all text-xs font-mono text-indigo-600 underline'
        target='_blank'
        rel='noopener noreferrer'
      >
        {debugUrl}
      </a>
    </div>
  );
}

export function SignupForm({
  email,
  onSubmit,
  isLoading,
  error,
  notice,
  captchaError,
  isCaptchaRequired = false,
}: SignupFormProps): JSX.Element {
  const translations = useTranslations('KangurLogin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const { containerRef: captchaContainerRef } = useTurnstile({
    enabled: isCaptchaRequired,
    onVerify: (token) => setCaptchaToken(token),
    onError: () => setCaptchaToken(null),
    onExpire: () => setCaptchaToken(null),
  });

  useKangurTutorAnchor({
    id: 'kangur-auth-signup-form',
    kind: 'login_form',
    ref: formRef,
    surface: 'auth',
    enabled: true,
    priority: 100,
    metadata: {
      label: 'Formularz rejestracji',
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    if (isCaptchaRequired && !captchaToken) return;
    onSubmit(password, captchaToken || undefined);
  };
  const submitDisabled = resolveKangurSignupSubmitDisabled({
    captchaToken,
    isCaptchaRequired,
    isLoading,
    password,
  });

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={`${KANGUR_STACK_RELAXED_CLASSNAME} w-full`}
      aria-label={translations('signupFormAriaLabel')}
    >
      <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
        <div className='text-sm font-medium text-slate-700'>{translations('parentEmailLabel')}</div>
        <div className='rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500'>
          {email}
        </div>
      </div>

      <SignupPasswordField
        isLoading={isLoading}
        password={password}
        setPassword={setPassword}
        setShowPassword={setShowPassword}
        showPassword={showPassword}
        translations={translations}
      />

      <SignupCaptchaSection
        captchaContainerRef={captchaContainerRef}
        captchaError={captchaError}
        isCaptchaRequired={isCaptchaRequired}
        translations={translations}
      />

      <SignupFormFeedback error={error} notice={notice} />

      <button
        type='submit'
        disabled={submitDisabled}
        className={cn(
          kangurButtonVariants({ variant: 'primary', size: 'lg', fullWidth: true }),
          'mt-2 justify-center rounded-xl font-bold'
        )}
      >
        {isLoading ? translations('createAccountSubmitting') : translations('createAccount')}
      </button>
    </form>
  );
}

export function VerificationView({
  email,
  onResend,
  resendButtonLabel,
  isResendDisabled,
  notice,
  debugUrl,
}: {
  email: string;
  onResend: () => void;
  resendButtonLabel: string;
  isResendDisabled: boolean;
  notice?: string | null;
  debugUrl?: string | null;
}): JSX.Element {
  const translations = useTranslations('KangurLogin');

  return (
    <div className={`${KANGUR_STACK_ROOMY_CLASSNAME} w-full text-center`}>
      <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
        <h3 className='text-xl font-bold text-slate-900'>{translations('checkInboxTitle')}</h3>
        <p className='text-sm text-slate-600'>
          {translations('verificationSentTo')}
          <br />
          <span className='font-semibold text-slate-900'>{email}</span>
        </p>
      </div>

      <div className='rounded-xl bg-indigo-50 px-6 py-4'>
        <p className='text-sm font-medium text-indigo-900'>
          {translations('verificationAction')}
        </p>
      </div>

      {notice && (
        <div className='rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-600' role='status'>
          {notice}
        </div>
      )}

      <div className={KANGUR_STACK_SPACED_CLASSNAME}>
        <button
          type='button'
          onClick={onResend}
          disabled={isResendDisabled}
          className='text-sm font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50'
        >
          {resendButtonLabel}
        </button>
        <VerificationDebugLink debugUrl={debugUrl} translations={translations} />
      </div>
    </div>
  );
}
