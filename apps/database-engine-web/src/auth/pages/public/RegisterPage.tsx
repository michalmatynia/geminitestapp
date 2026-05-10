'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { InputField } from './components/InputField';

export default function RegisterPage(): React.JSX.Element {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const body = { name: name.trim().length > 0 ? name.trim() : undefined, email, password };
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      setIsSubmitting(false);
      setError(response.status === 409 ? 'An account with this email already exists.' : 'Registration failed.');
      return;
    }
    const result = await signIn('credentials', { email, password, redirect: false, callbackUrl: '/admin/databases' });
    setIsSubmitting(false);
    router.push(result.url ?? '/admin/databases');
    router.refresh();
  };

  return (
    <section className='mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12'>
      <div className='space-y-6'>
        <div className='space-y-2'>
          <h1 className='text-2xl font-semibold tracking-normal text-foreground'>Create account</h1>
          <p className='text-sm text-muted-foreground'>Create a local Database Engine account.</p>
        </div>
        <form className='space-y-4' onSubmit={(e) => { void onSubmit(e); }}>
          <InputField label='Name' type='text' autoComplete='name' value={name} onChange={setName} />
          <InputField label='Email' type='email' autoComplete='email' required value={email} onChange={setEmail} />
          <InputField label='Password' type='password' autoComplete='new-password' required minLength={8} value={password} onChange={setPassword} />
          {error !== null && error.length > 0 && <p className='text-sm text-destructive'>{error}</p>}
          <button type='submit' disabled={isSubmitting} className='inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60'>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <a className='text-sm font-medium text-primary hover:underline' href='/auth/signin'>Sign in instead</a>
      </div>
    </section>
  );
}
