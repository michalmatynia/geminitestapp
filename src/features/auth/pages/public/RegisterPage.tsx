'use client';

import { useTranslations } from 'next-intl';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

import { useAuth } from '@/features/auth/context/AuthContext';
import { useRegisterUser } from '@/features/auth/hooks/useAuthQueries';
import { DEFAULT_AUTH_SECURITY_POLICY } from '@/features/auth/utils/auth-security';
import { Link } from '@/i18n/navigation';
import {
  Button,
  Input,
  PasswordInput,
  Alert,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  FormField,
  Hint,
  UI_STACK_RELAXED_CLASSNAME,
} from '@/shared/ui';
import { logClientCatch, logClientError } from '@/shared/utils/observability/client-error-logger';

export default function RegisterPage(): React.JSX.Element {
  return <RegisterForm />;
}

function RegisterForm(): React.JSX.Element {
  const translations = useTranslations('AuthRegister');
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
          : translations('createAccountFailed');
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
        logClientCatch(signInErr, { source: 'RegisterPage', action: 'signIn', email });
        const message =
          signInErr instanceof Error ? signInErr.message : translations('signInFailed');
        setError(message);
      }
    } catch (err) {
      logClientCatch(err, { source: 'RegisterPage', action: 'handleSubmit', email });
      const message = err instanceof Error ? err.message : translations('createAccountFailed');
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
          <CardTitle className='text-2xl font-bold tracking-tight'>
            {translations('title')}
          </CardTitle>
          <CardDescription className='text-gray-400'>
            {translations('description')}
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
                {translations('signupDisabled')}
              </Alert>
            )}

            <FormField
              id='name'
              label={translations('nameLabel')}
              description={translations('nameDescription')}
            >
              <Input
                id='name'
                placeholder={translations('namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!allowSignup}
                autoComplete='name'
                className='h-10 bg-gray-900/50'
              />
            </FormField>

            <FormField id='email' label={translations('emailLabel')} required>
              <Input
                id='email'
                type='email'
                placeholder={translations('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!allowSignup}
                autoComplete='email'
                className='h-10 bg-gray-900/50'
              />
            </FormField>

            <FormField id='password' label={translations('passwordLabel')} required>
              <PasswordInput
                id='password'
                placeholder={translations('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength}
                disabled={!allowSignup}
                autoComplete='new-password'
                className='h-10 bg-gray-900/50'
              />
              <div className='mt-2 flex justify-between items-center px-1'>
                <Hint>
                  {translations('passwordHint', {
                    count: DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength,
                  })}
                </Hint>
              </div>
            </FormField>

            <Button
              className='w-full h-11 text-base font-semibold shadow-lg shadow-primary/20'
              type='submit'
              disabled={isSubmitting || !allowSignup}
              loading={isSubmitting}
            >
              {translations('submit')}
            </Button>
          </form>
        </CardContent>
        <CardFooter
          className={`${UI_STACK_RELAXED_CLASSNAME} border-t border-white/5 pt-6`}
        >
          <p className='text-sm text-gray-400'>
            {translations('alreadyHaveAccount')}{' '}
            <Link href='/auth/signin' className='text-primary font-medium hover:underline'>
              {translations('signIn')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
