import { type FormEvent, type JSX, useState, useRef } from 'react';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { useKangurLoginPageProps } from './login-context';
import {
  KANGUR_LEARNER_LOGIN_PATTERN,
} from './login-constants';

type LoginFormProps = {
  onSubmit: (identifier: string, password?: string) => void;
  isLoading: boolean;
  error?: string | null;
  notice?: string | null;
  defaultIdentifier?: string;
};

export function LoginForm({
  onSubmit,
  isLoading,
  error,
  notice,
  defaultIdentifier = '',
}: LoginFormProps): JSX.Element {
  const { parentAuthMode } = useKangurLoginPageProps();
  const [identifier, setIdentifier] = useState(defaultIdentifier);
  const [password, setPassword] = useState('');
  const loginFormRef = useRef<HTMLFormElement>(null);
  const identifierInputRef = useRef<HTMLInputElement>(null);
  
  useKangurTutorAnchor({
    id: 'kangur-auth-login-form',
    kind: 'login_form',
    ref: loginFormRef,
    surface: 'auth',
    enabled: true,
    priority: 100,
    metadata: {
      label: 'Sekcja logowania',
    },
  });

  useKangurTutorAnchor({
    id: 'kangur-auth-login-identifier-field',
    kind: 'login_identifier_field',
    ref: identifierInputRef,
    surface: 'auth',
    enabled: true,
    priority: 120,
    metadata: {
      label: 'Pole identyfikatora',
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    onSubmit(identifier, password);
  };

  const isParentMode = parentAuthMode === 'sign-in' || parentAuthMode === 'create-account';
  const showPassword = isParentMode || (identifier.trim().length > 0 && !KANGUR_LEARNER_LOGIN_PATTERN.test(identifier));

  return (
    <form
      ref={loginFormRef}
      onSubmit={handleSubmit}
      className='flex w-full flex-col gap-4'
      aria-label='Formularz logowania'
    >
      <div className='flex flex-col gap-1'>
        <label htmlFor='identifier' className='text-sm font-medium text-slate-700'>
          Email lub nick ucznia
        </label>
        <input
          ref={identifierInputRef}
          id='identifier'
          type='text'
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          disabled={isLoading}
          className='rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
          placeholder='Wpisz email lub nick'
          autoComplete='username'
          autoCapitalize='off'
          autoCorrect='off'
        />
      </div>

      {showPassword && (
        <div className='flex flex-col gap-1'>
          <label htmlFor='password' className='text-sm font-medium text-slate-700'>
            Hasło
          </label>
          <input
            id='password'
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className='rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
            placeholder='Wpisz hasło'
            autoComplete='current-password'
          />
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
        disabled={isLoading || !identifier.trim() || (showPassword && !password)}
        className='mt-2 w-full justify-center rounded-xl font-bold'
      >
        {isLoading ? 'Logowanie...' : 'Zaloguj się'}
      </KangurButton>
    </form>
  );
}

export function SocialLogins({
  onGoogleSignIn,
  isLoading,
}: {
  onGoogleSignIn: () => void;
  isLoading: boolean;
}): JSX.Element {
  return (
    <div className='mt-6 flex flex-col gap-4'>
      <div className='relative flex items-center justify-center'>
        <div className='absolute inset-0 flex items-center'>
          <div className='w-full border-t border-slate-200' />
        </div>
        <span className='relative bg-white px-4 text-xs font-medium uppercase text-slate-500'>
          Lub kontynuuj przez
        </span>
      </div>

      <button
        type='button'
        onClick={onGoogleSignIn}
        disabled={isLoading}
        className='flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70'
      >
        <svg className='h-5 w-5' viewBox='0 0 24 24' aria-hidden='true'>
          <path
            d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
            fill='#4285F4'
          />
          <path
            d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
            fill='#34A853'
          />
          <path
            d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z'
            fill='#FBBC05'
          />
          <path
            d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
            fill='#EA4335'
          />
        </svg>
        Google
      </button>
    </div>
  );
}
