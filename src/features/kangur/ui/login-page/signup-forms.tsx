import { type FormEvent, type JSX, useState, useRef } from 'react';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { useTurnstile } from './use-turnstile';
import { KANGUR_PARENT_CAPTCHA_SITE_KEY } from './login-constants';
import {
  KANGUR_STACK_RELAXED_CLASSNAME,
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

export function SignupForm({
  email,
  onSubmit,
  isLoading,
  error,
  notice,
  captchaError,
  isCaptchaRequired = false,
}: SignupFormProps): JSX.Element {
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const { containerRef: captchaContainerRef } = useTurnstile({
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

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={`${KANGUR_STACK_RELAXED_CLASSNAME} w-full`}
      aria-label='Formularz rejestracji rodzica'
    >
      <div className='flex flex-col gap-1'>
        <label className='text-sm font-medium text-slate-700'>Email rodzica</label>
        <div className='rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500'>
          {email}
        </div>
      </div>

      <div className='flex flex-col gap-1'>
        <label htmlFor='new-password' className='text-sm font-medium text-slate-700'>
          Ustaw hasło
        </label>
        <input
          id='new-password'
          type='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className='rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
          placeholder='Minimum 8 znaków'
          autoComplete='new-password'
        />
        <p className='text-xs text-slate-500'>
          Hasło musi mieć co najmniej 8 znaków.
        </p>
      </div>

      {isCaptchaRequired && KANGUR_PARENT_CAPTCHA_SITE_KEY && (
        <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
          <div
            ref={captchaContainerRef}
            className='min-h-[65px] self-center'
            aria-label='Weryfikacja bezpieczeństwa'
          />
          {captchaError && (
            <p className='text-center text-xs font-medium text-rose-600' role='alert'>
              {captchaError}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className='rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600' role='alert'>
          {error}
        </div>
      )}

      {notice && (
        <div className='rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-600' role='status'>
          {notice}
        </div>
      )}

      <KangurButton
        type='submit'
        variant='primary'
        size='lg'
        disabled={isLoading || !password.trim() || (isCaptchaRequired && !captchaToken)}
        className='mt-2 w-full justify-center rounded-xl font-bold'
      >
        {isLoading ? 'Tworzenie konta...' : 'Utwórz konto'}
      </KangurButton>
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
  return (
    <div className='flex w-full flex-col gap-6 text-center'>
      <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
        <h3 className='text-xl font-bold text-slate-900'>Sprawdź skrzynkę</h3>
        <p className='text-sm text-slate-600'>
          Wysłaliśmy link potwierdzający na adres:
          <br />
          <span className='font-semibold text-slate-900'>{email}</span>
        </p>
      </div>

      <div className='rounded-xl bg-indigo-50 px-6 py-4'>
        <p className='text-sm font-medium text-indigo-900'>
          Kliknij link w e-mailu, aby aktywować konto.
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
        
        {debugUrl && process.env.NODE_ENV !== 'production' && (
          <div className='mt-4 flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left'>
            <p className='text-xs font-bold text-slate-500 uppercase tracking-wider'>Debug Link (Dev Only)</p>
            <a 
              href={debugUrl} 
              className='break-all text-xs font-mono text-indigo-600 underline'
              target='_blank'
              rel='noopener noreferrer'
            >
              {debugUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
