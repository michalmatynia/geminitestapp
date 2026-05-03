'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState, Suspense, startTransition, useCallback } from 'react';

import { useAuth } from '@/features/auth/context/AuthContext';
import { Link } from '@/i18n/navigation';
import { Button, Input, Alert, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/ui/primitives.public';
import { PasswordInput, FormField } from '@/shared/ui/forms-and-actions.public';
import { UI_STACK_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { focusOnMount } from '@/shared/utils/focus-on-mount';
import { logClientCatch, logClientError } from '@/shared/utils/observability/client-error-logger';

export const resolveSignInCallbackNavigation = (
  callbackUrl: string,
  currentOrigin: string
): { kind: 'router' | 'location'; href: string } | null => {
  const trimmed = callbackUrl.trim();
  if (trimmed === '') return null;
  if (trimmed.startsWith('/')) {
    return { kind: 'router', href: trimmed };
  }

  try {
    const parsed = new URL(trimmed, currentOrigin);
    if (parsed.origin === currentOrigin) {
      return { kind: 'router', href: `${parsed.pathname}${parsed.search}${parsed.hash}` };
    }
  } catch (error) {
    logClientError(error);
    return { kind: 'location', href: trimmed };
  }

  return { kind: 'location', href: trimmed };
};

const useSignInFormLogic = () => {
  const translations = useTranslations('AuthSignIn');
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin';
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    urlError !== null ? translations('invalidCredentials') : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await signIn('credentials', { email, password, callbackUrl, redirect: false });
      if (result?.error !== undefined && result.error !== null) {
        setError(translations('invalidEmailOrPassword'));
      } else if (result?.ok === true) {
        const navigationTarget = resolveSignInCallbackNavigation(callbackUrl, window.location.origin);
        if (navigationTarget?.kind === 'router') {
          startTransition(() => { router.push(navigationTarget.href); });
        } else {
          window.location.assign(navigationTarget?.href ?? callbackUrl);
        }
      }
    } catch (err) {
      logClientCatch(err, { source: 'SignInPage', action: 'handleSubmit', email });
      setError(translations('unexpectedError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, callbackUrl, router, translations]);

  return { email, setEmail, password, setPassword, error, isSubmitting, handleSubmit, translations };
};

function SignInPageLoader(): React.JSX.Element {
  const { email, setEmail, password, setPassword, error, isSubmitting, handleSubmit, translations } = useSignInFormLogic();
  const { userPageSettings } = useAuth();
  const allowSignup = userPageSettings.allowSignup === true;

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
            {error !== null && <Alert id='signin-error' variant='error' className='text-xs' role='alert'>{error}</Alert>}
            <FormField id='email' label={translations('emailLabel')}>
              <Input id='email' type='email' placeholder={translations('emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} required ref={focusOnMount} autoComplete='email' aria-describedby={error !== null ? 'signin-error' : undefined} className='h-10 bg-gray-900/50' />
            </FormField>
            <FormField id='password' label={translations('passwordLabel')}>
              <PasswordInput id='password' placeholder={translations('passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete='current-password' aria-describedby={error !== null ? 'signin-error' : undefined} className='h-10 bg-gray-900/50' />
            </FormField>
            <Button className='w-full h-11 text-base font-semibold shadow-lg shadow-primary/20' type='submit' disabled={isSubmitting} loading={isSubmitting}>{translations('submit')}</Button>
          </form>
        </CardContent>
        <CardFooter className={`${UI_STACK_RELAXED_CLASSNAME} border-t border-white/5 pt-6`}>
          {allowSignup && <p className='text-sm text-gray-400'>{translations('noAccount')}{' '}<Link href='/auth/register' className='text-primary font-medium hover:underline'>{translations('createOne')}</Link></p>}
          <Link href='/' className='text-xs text-gray-500 hover:text-gray-300 transition-colors'>&larr; {translations('backToStorefront')}</Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function SignInPageView(): React.JSX.Element {
  const translations = useTranslations('AuthSignIn');
  return <Suspense fallback={<div role='status' aria-live='polite' className='sr-only'>{translations('loading')}</div>}><SignInPageLoader /></Suspense>;
}
