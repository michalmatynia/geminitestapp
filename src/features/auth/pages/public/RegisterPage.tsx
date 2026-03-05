'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

import { useAuth } from '@/features/auth/context/AuthContext';
import { useRegisterUser } from '@/features/auth/hooks/useAuthQueries';
import { DEFAULT_AUTH_SECURITY_POLICY } from '@/features/auth/utils/auth-security';
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
  Hint,
} from '@/shared/ui';

export default function RegisterPage(): React.JSX.Element {
  return <RegisterForm />;
}

function RegisterForm(): React.JSX.Element {
  const { userPageSettings } = useAuth();
  const allowSignup = Boolean(userPageSettings.allowSignup);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registerUserMutation = useRegisterUser();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const registerInput: { email: string; password: string; name?: string } = {
        email,
        password,
      };
      const trimmedName: string = name.trim();
      if (trimmedName) {
        registerInput.name = trimmedName;
      }
      const response = await registerUserMutation.mutateAsync(registerInput);

      if (!response.ok) {
        const payload = response.payload as {
          error?: string;
          details?: { issues?: string[] };
        } | null;
        const details = payload?.details?.issues?.join(' ') ?? '';
        const message = payload?.error
          ? `${payload.error}${details ? ` ${details}` : ''}`
          : 'Failed to create account.';
        logClientError(new Error(message), {
          context: { source: 'RegisterPage', action: 'registerUser', email },
        });
        setError(message);
        return;
      }

      try {
        await signIn('credentials', {
          email,
          password,
          callbackUrl: '/admin',
        });
      } catch (signInErr) {
        logClientError(signInErr, { context: { source: 'RegisterPage', action: 'signIn', email } });
        const message =
          signInErr instanceof Error ? signInErr.message : 'Sign-in failed. Please try again.';
        setError(message);
      }
    } catch (err) {
      logClientError(err, { context: { source: 'RegisterPage', action: 'handleSubmit', email } });
      const message = err instanceof Error ? err.message : 'Failed to create account.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-950 px-4'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]' />
      <Card className='w-full max-w-md border-border/60 bg-card/40 backdrop-blur-xl shadow-2xl relative z-10'>
        <CardHeader className='space-y-1 pb-6'>
          <CardTitle className='text-2xl font-bold tracking-tight'>Create account</CardTitle>
          <CardDescription className='text-gray-400'>
            Enter your details to register for the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className='space-y-5'
            onSubmit={(e: React.FormEvent<HTMLFormElement>) => void handleSubmit(e)}
            aria-busy={isSubmitting}
          >
            {error && (
              <Alert variant='error' className='text-xs'>
                {error}
              </Alert>
            )}
            {!allowSignup && (
              <Alert variant='warning' className='text-xs'>
                Self-service registration is disabled. Please contact an administrator.
              </Alert>
            )}

            <FormField
              id='name'
              label='Full Name'
              description='Display name for your profile (optional).'
            >
              <Input
                id='name'
                placeholder='John Doe'
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!allowSignup}
                autoComplete='name'
                className='h-10 bg-gray-900/50'
              />
            </FormField>

            <FormField id='email' label='Email Address' required>
              <Input
                id='email'
                type='email'
                placeholder='name@example.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!allowSignup}
                autoComplete='email'
                className='h-10 bg-gray-900/50'
              />
            </FormField>

            <FormField id='password' label='Password' required>
              <Input
                id='password'
                type='password'
                placeholder='••••••••'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength}
                disabled={!allowSignup}
                autoComplete='new-password'
                className='h-10 bg-gray-900/50'
              />
              <div className='mt-2 flex justify-between items-center px-1'>
                <Hint>Minimum {DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength} characters.</Hint>
              </div>
            </FormField>

            <Button
              className='w-full h-11 text-base font-semibold shadow-lg shadow-primary/20'
              type='submit'
              disabled={isSubmitting || !allowSignup}
              loading={isSubmitting}
            >
              Create Account
            </Button>
          </form>
        </CardContent>
        <CardFooter className='flex flex-col gap-4 border-t border-white/5 pt-6'>
          <p className='text-sm text-gray-400'>
            Already have an account?{' '}
            <Link href='/auth/signin' className='text-primary font-medium hover:underline'>
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
