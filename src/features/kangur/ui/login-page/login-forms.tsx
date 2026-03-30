'use client';

import { type FormEvent, type JSX, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff } from 'lucide-react';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { useKangurLoginPageProps } from './login-context';
import {
  KANGUR_LEARNER_LOGIN_PATTERN,
} from './login-constants';
import {
  KANGUR_STACK_COMPACT_CLASSNAME,
  KANGUR_STACK_RELAXED_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

type LoginFormProps = {
  onSubmit: (identifier: string, password?: string) => void;
  isLoading: boolean;
  error?: string | null;
  notice?: string | null;
  defaultIdentifier?: string;
};

type LoginFormFeedbackProps = Pick<LoginFormProps, 'error' | 'notice'>;

const resolveKangurLoginFormParentMode = (
  parentAuthMode: ReturnType<typeof useKangurLoginPageProps>['parentAuthMode']
): boolean => parentAuthMode === 'sign-in' || parentAuthMode === 'create-account';

const resolveKangurLoginShouldShowPasswordField = ({
  identifier,
  isParentMode,
}: {
  identifier: string;
  isParentMode: boolean;
}): boolean =>
  isParentMode ||
  (identifier.trim().length > 0 &&
    !KANGUR_LEARNER_LOGIN_PATTERN.test(identifier));

const resolveKangurLoginSubmitDisabled = ({
  identifier,
  isLoading,
  password,
  shouldShowPasswordField,
}: {
  identifier: string;
  isLoading: boolean;
  password: string;
  shouldShowPasswordField: boolean;
}): boolean =>
  isLoading || !identifier.trim() || (shouldShowPasswordField && !password);

function LoginIdentifierField(props: {
  identifier: string;
  identifierInputRef: React.RefObject<HTMLInputElement | null>;
  isLoading: boolean;
  setIdentifier: (value: string) => void;
  translations: ReturnType<typeof useTranslations>;
}): JSX.Element {
  const {
    identifier,
    identifierInputRef,
    isLoading,
    setIdentifier,
    translations,
  } = props;

  return (
    <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
      <label htmlFor='identifier' className='text-sm font-medium text-slate-700'>
        {translations('identifierLabel')}
      </label>
      <input
        ref={identifierInputRef}
        id='identifier'
        type='text'
        aria-label={translations('identifierLabel')}
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        disabled={isLoading}
        className='rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
        placeholder={translations('identifierPlaceholder')}
        autoComplete='username'
        autoCapitalize='off'
        autoCorrect='off'
      />
    </div>
  );
}

function LoginPasswordField(props: {
  isLoading: boolean;
  isPasswordVisible: boolean;
  password: string;
  setIsPasswordVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setPassword: (value: string) => void;
  translations: ReturnType<typeof useTranslations>;
}): JSX.Element {
  const {
    isLoading,
    isPasswordVisible,
    password,
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
          id='password'
          type={isPasswordVisible ? 'text' : 'password'}
          aria-label={translations('passwordLabel')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
          className='w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
          placeholder={translations('passwordPlaceholder')}
          autoComplete='current-password'
        />
        <button
          type='button'
          onClick={() => setIsPasswordVisible((visible) => !visible)}
          className='absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600'
          aria-label={
            isPasswordVisible
              ? translations('hidePassword')
              : translations('showPassword')
          }
          tabIndex={-1}
        >
          {isPasswordVisible ? (
            <EyeOff className='h-4 w-4' aria-hidden='true' />
          ) : (
            <Eye className='h-4 w-4' aria-hidden='true' />
          )}
        </button>
      </div>
    </div>
  );
}

function LoginFormFeedback({
  error,
  notice,
}: LoginFormFeedbackProps): JSX.Element | null {
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

export function LoginForm({
  onSubmit,
  isLoading,
  error,
  notice,
  defaultIdentifier = '',
}: LoginFormProps): JSX.Element {
  const translations = useTranslations('KangurLogin');
  const { parentAuthMode } = useKangurLoginPageProps();
  const [identifier, setIdentifier] = useState(defaultIdentifier);
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
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

  const isParentMode = resolveKangurLoginFormParentMode(parentAuthMode);
  const shouldShowPasswordField = resolveKangurLoginShouldShowPasswordField({
    identifier,
    isParentMode,
  });
  const submitDisabled = resolveKangurLoginSubmitDisabled({
    identifier,
    isLoading,
    password,
    shouldShowPasswordField,
  });

  return (
    <form
      ref={loginFormRef}
      onSubmit={handleSubmit}
      className={`${KANGUR_STACK_RELAXED_CLASSNAME} w-full`}
      aria-label={translations('loginFormAriaLabel')}
    >
      <LoginIdentifierField
        identifier={identifier}
        identifierInputRef={identifierInputRef}
        isLoading={isLoading}
        setIdentifier={setIdentifier}
        translations={translations}
      />

      {shouldShowPasswordField && (
        <LoginPasswordField
          isLoading={isLoading}
          isPasswordVisible={isPasswordVisible}
          password={password}
          setIsPasswordVisible={setIsPasswordVisible}
          setPassword={setPassword}
          translations={translations}
        />
      )}

      <LoginFormFeedback error={error} notice={notice} />

      <KangurButton
        type='submit'
        variant='primary'
        size='lg'
        disabled={submitDisabled}
        className='mt-2 w-full justify-center rounded-xl font-bold'
      >
        {isLoading ? translations('loginSubmitting') : translations('loginSubmit')}
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
  const translations = useTranslations('KangurLogin');

  return (
    <div className={`mt-6 ${KANGUR_STACK_RELAXED_CLASSNAME}`}>
      <div className='relative flex items-center justify-center'>
        <div className='absolute inset-0 flex items-center'>
          <div className='w-full border-t border-slate-200' />
        </div>
        <span className='relative bg-white px-4 text-xs font-medium uppercase text-slate-500'>
          {translations('continueWith')}
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
