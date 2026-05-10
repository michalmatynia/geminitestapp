'use client';

import { useTranslations } from 'next-intl';
import { signIn } from 'next-auth/react';
import { useState, useCallback } from 'react';

import { useAuth } from '@/features/auth/context/AuthContext';
import { useRegisterUser } from '@/features/auth/hooks/useAuthQueries';
import { DEFAULT_AUTH_SECURITY_POLICY } from '@/features/auth/utils/auth-security';
import { Link } from '@/i18n/navigation';
import { Button, Input, Alert, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/ui/primitives.public';
import { PasswordInput, FormField, Hint } from '@/shared/ui/forms-and-actions.public';
import { UI_STACK_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export default function RegisterPage(): React.JSX.Element {
  return <RegisterForm />;
}

type RegisterFormState = {
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  isSubmitting: boolean;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  translations: ReturnType<typeof useTranslations>;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type RegisterFailurePayload = {
  error?: string;
  details?: { issues?: string[] };
} | null;

type RegisterErrorLogger = (
  errorObj: unknown,
  context: Record<string, unknown>
) => void;

const logRegisterError = logClientCatch as RegisterErrorLogger;

const buildRegisterInput = (data: RegisterInput): {
  email: string;
  password: string;
  name?: string;
} => {
  const registerInput = { email: data.email, password: data.password };
  const trimmedName = data.name.trim();
  return trimmedName.length > 0 ? { ...registerInput, name: trimmedName } : registerInput;
};

const resolveRegisterFailureDetails = (payload: RegisterFailurePayload): string => {
  const issues = payload?.details?.issues;
  return Array.isArray(issues) ? issues.join(' ') : '';
};

const resolveRegisterFailureError = (payload: RegisterFailurePayload): string | null => {
  const error = payload?.error;
  return typeof error === 'string' ? error : null;
};

const appendRegisterFailureDetails = (message: string, details: string): string =>
  details.length > 0 ? `${message} ${details}` : message;

const resolveRegisterFailureMessage = (
  payload: RegisterFailurePayload,
  fallbackMessage: string
): string => {
  const details = resolveRegisterFailureDetails(payload);
  const payloadError = resolveRegisterFailureError(payload);
  if (payloadError === null) return fallbackMessage;
  return appendRegisterFailureDetails(payloadError, details);
};

const useRegisterFormLogic = (): RegisterFormState => {
  const translations = useTranslations('AuthRegister');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const registerUserMutation = useRegisterUser();

  const handleRegister = useCallback(async (data: RegisterInput): Promise<void> => {
    const registerInput = buildRegisterInput(data);
    const response = await registerUserMutation.mutateAsync(registerInput);
    if (response.ok) return;
    const message = resolveRegisterFailureMessage(
      response.payload as RegisterFailurePayload,
      translations('createAccountFailed')
    );
    throw new Error(message);
  }, [registerUserMutation, translations]);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await handleRegister({ name, email, password });
      await signIn('credentials', { email, password, callbackUrl: '/admin' });
    } catch (err) {
      logRegisterError(err, { source: 'RegisterPage', action: 'handleSubmit', email });
      setError(err instanceof Error ? err.message : translations('createAccountFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }, [name, email, password, handleRegister, translations]);

  return { name, setName, email, setEmail, password, setPassword, error, setError, isSubmitting, handleSubmit, translations };
};

function RegisterForm(): React.JSX.Element {
  const { name, setName, email, setEmail, password, setPassword, error, isSubmitting, handleSubmit, translations } =
    useRegisterFormLogic();
  const { userPageSettings } = useAuth();
  const allowSignup = Boolean(userPageSettings.allowSignup);

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-950 px-4'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]' />
      <Card className='w-full max-w-md border-border/60 bg-card/40 backdrop-blur-xl shadow-2xl relative z-10'>
        <CardHeader className='space-y-1 pb-6'>
          <CardTitle className='text-2xl font-bold tracking-tight'>{translations('title')}</CardTitle>
          <CardDescription className='text-gray-400'>{translations('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className='space-y-5' onSubmit={(e) => { void handleSubmit(e); }} aria-busy={isSubmitting}>
            {error !== null && <Alert variant='error' className='text-xs'>{error}</Alert>}
            {!allowSignup && <Alert variant='warning' className='text-xs'>{translations('signupDisabled')}</Alert>}
            <FormField id='name' label={translations('nameLabel')} description={translations('nameDescription')}>
              <Input id='name' placeholder={translations('namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} disabled={!allowSignup} autoComplete='name' className='h-10 bg-gray-900/50' />
            </FormField>
            <FormField id='email' label={translations('emailLabel')} required>
              <Input id='email' type='email' placeholder={translations('emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} required disabled={!allowSignup} autoComplete='email' className='h-10 bg-gray-900/50' />
            </FormField>
            <FormField id='password' label={translations('passwordLabel')} required>
              <PasswordInput id='password' placeholder={translations('passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength} disabled={!allowSignup} autoComplete='new-password' className='h-10 bg-gray-900/50' />
              <div className='mt-2 flex justify-between items-center px-1'>
                <Hint>{translations('passwordHint', { count: DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength })}</Hint>
              </div>
            </FormField>
            <Button className='w-full h-11 text-base font-semibold shadow-lg shadow-primary/20' type='submit' disabled={isSubmitting || !allowSignup} loading={isSubmitting}>{translations('submit')}</Button>
          </form>
        </CardContent>
        <CardFooter className={`${UI_STACK_RELAXED_CLASSNAME} border-t border-white/5 pt-6`}>
          <p className='text-sm text-gray-400'>{translations('alreadyHaveAccount')}{' '}<Link href='/auth/signin' className='text-primary font-medium hover:underline'>{translations('signIn')}</Link></p>
        </CardFooter>
      </Card>
    </div>
  );
}
