'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function SignInPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/databases';
  const errorParam = searchParams.get('error');
  const denied = searchParams.get('denied') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    denied ? 'You do not have permission to access Database Engine.' : errorParam ? 'Sign in failed.' : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
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
    if (result?.error) {
      setError('Invalid email or password.');
      return;
    }

    router.push(result?.url || callbackUrl);
    router.refresh();
  };

  return (
    <section className='mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12'>
      <div className='space-y-6'>
        <div className='space-y-2'>
          <h1 className='text-2xl font-semibold tracking-normal text-foreground'>Database Engine</h1>
          <p className='text-sm text-muted-foreground'>Sign in with your local Database Engine account.</p>
        </div>
        <form className='space-y-4' onSubmit={onSubmit}>
          <label className='block space-y-2 text-sm font-medium text-foreground'>
            <span>Email</span>
            <input
              type='email'
              autoComplete='email'
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            />
          </label>
          <label className='block space-y-2 text-sm font-medium text-foreground'>
            <span>Password</span>
            <input
              type='password'
              autoComplete='current-password'
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            />
          </label>
          {error ? <p className='text-sm text-destructive'>{error}</p> : null}
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
