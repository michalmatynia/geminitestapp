'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

type SubmitFormOptions = {
  email: string;
  password: string;
  callbackUrl: string;
  setError: (value: string | null) => void;
  setIsSubmitting: (value: boolean) => void;
  router: ReturnType<typeof useRouter>;
};

type SignInFormFieldProps = {
  type: 'email' | 'password';
  autoComplete: string;
  value: string;
  label: string;
  onChange: (value: string) => void;
};

type SignInFormProps = {
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

function SignInFormField({
  type,
  autoComplete,
  value,
  label,
  onChange,
}: SignInFormFieldProps): React.JSX.Element {
  return (
    <label className='block space-y-2 text-sm font-medium text-foreground'>
      <span>{label}</span>
      <input
        type={type}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      />
    </label>
  );
}

function getSignInErrorMessage(error: string | null): React.JSX.Element | null {
  return error === null ? null : <p className='text-sm text-destructive'>{error}</p>;
}

function getSignInCallbackUrl(searchParams: ReturnType<typeof useSearchParams>): string {
  const callbackUrl = searchParams.get('callbackUrl');
  return callbackUrl === null || callbackUrl === '' ? '/admin/databases' : callbackUrl;
}

function getSignInInitialError(errorParam: string | null, denied: boolean): string | null {
  if (denied) {
    return 'You do not have permission to access Database Engine.';
  }
  if (errorParam === null || errorParam === '') {
    return null;
  }
  return 'Sign in failed.';
}

async function submitSignIn(
  event: React.FormEvent<HTMLFormElement>,
  { email, password, callbackUrl, router, setError, setIsSubmitting }: SubmitFormOptions,
): Promise<void> {
  event.preventDefault();
  setIsSubmitting(true);
  setError(null);

  const result = await signIn('credentials', {
    email,
    password,
    redirect: false,
    callbackUrl,
  });

  setIsSubmitting(false);
  if (result.error !== undefined) {
    setError('Invalid email or password.');
    return;
  }

  const destinationUrl = result.url ?? callbackUrl;
  router.push(destinationUrl);
  router.refresh();
}

function SignInForm({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  error,
  isSubmitting,
  onSubmit,
}: SignInFormProps): React.JSX.Element {
  return (
    <section className='mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12'>
      <div className='space-y-6'>
        <div className='space-y-2'>
          <h1 className='text-2xl font-semibold tracking-normal text-foreground'>Database Engine</h1>
          <p className='text-sm text-muted-foreground'>Sign in with your local Database Engine account.</p>
        </div>
        <form className='space-y-4' onSubmit={onSubmit}>
          <SignInFormField type='email' autoComplete='email' value={email} label='Email' onChange={onEmailChange} />
          <SignInFormField
            type='password'
            autoComplete='current-password'
            value={password}
            label='Password'
            onChange={onPasswordChange}
          />
          {getSignInErrorMessage(error)}
          <button
            type='submit'
            disabled={isSubmitting}
            className='inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60'
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <a className='text-sm font-medium text-primary hover:underline' href='/auth/register'>
          Create account
        </a>
      </div>
    </section>
  );
}

export default function SignInPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSignInCallbackUrl(searchParams);
  const errorParam = searchParams.get('error');
  const denied = searchParams.get('denied') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(getSignInInitialError(errorParam, denied));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    void submitSignIn(event, {
      email,
      password,
      callbackUrl,
      setError,
      setIsSubmitting,
      router,
    });
  };

  return (
    <SignInForm
      email={email}
      onEmailChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
    />
  );
}
