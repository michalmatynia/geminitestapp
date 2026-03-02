'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState, Suspense } from 'react';

import { useAuth } from '@/features/auth/context/AuthContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  Button,
  Input,
  Alert,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  FormField,
} from '@/shared/ui';

function SignInPageLoader(): React.JSX.Element {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin';
  const urlError = searchParams.get('error');

  const { userPageSettings } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(urlError ? 'Invalid credentials.' : null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allowSignup = Boolean(userPageSettings.allowSignup);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password.');
      } else if (result?.ok) {
        window.location.href = callbackUrl;
      }
    } catch (err) {
      logClientError(err, { context: { source: 'SignInPage', action: 'handleSubmit', email } });
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-950 px-4'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]' />
      <Card className='w-full max-w-md border-border/60 bg-card/40 backdrop-blur-xl shadow-2xl relative z-10'>
        <CardHeader className='space-y-1 pb-6'>
          <CardTitle className='text-2xl font-bold tracking-tight'>Sign in</CardTitle>
          <CardDescription className='text-gray-400'>
            Welcome back. Please enter your credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className='space-y-5'
            onSubmit={(e: React.FormEvent<HTMLFormElement>) => void handleSubmit(e)}
          >
            {error && (
              <Alert variant='error' className='text-xs'>
                {error}
              </Alert>
            )}

            <FormField label='Email Address'>
              <Input
                id='email'
                type='email'
                placeholder='name@example.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className='h-10 bg-gray-900/50'
              />
            </FormField>

            <FormField label='Password'>
              <Input
                id='password'
                type='password'
                placeholder='••••••••'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className='h-10 bg-gray-900/50'
              />
            </FormField>

            <Button
              className='w-full h-11 text-base font-semibold shadow-lg shadow-primary/20'
              type='submit'
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className='flex flex-col gap-4 border-t border-white/5 pt-6'>
          {allowSignup && (
            <p className='text-sm text-gray-400'>
              Don&apos;t have an account?{' '}
              <Link href='/auth/register' className='text-primary font-medium hover:underline'>
                Create one
              </Link>
            </p>
          )}
          <Link
            href='/'
            className='text-xs text-gray-500 hover:text-gray-300 transition-colors'
          >
            &larr; Back to storefront
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function SignInPage(): React.JSX.Element {
  return (
    <Suspense fallback={<></>}>
      <SignInPageLoader />
    </Suspense>
  );
}
