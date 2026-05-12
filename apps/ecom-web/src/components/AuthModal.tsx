/* eslint-disable @typescript-eslint/explicit-function-return-type,@typescript-eslint/no-misused-promises,@typescript-eslint/strict-boolean-expressions,complexity,consistent-return,max-lines,max-lines-per-function,no-param-reassign */
'use client';

import { useState, useEffect, useCallback, type JSX } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSiteContent } from '@/context/SiteContentContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: Props): JSX.Element | null {
  const { login, register } = useAuth();
  const { auth } = useSiteContent();
  const [tab, setTab] = useState<'signin' | 'register'>('signin');

  // Sign-in form state
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siShowPw, setSiShowPw] = useState(false);
  const [siLoading, setSiLoading] = useState(false);
  const [siError, setSiError] = useState('');

  // Register form state
  const [rName, setRName] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPassword, setRPassword] = useState('');
  const [rConfirm, setRConfirm] = useState('');
  const [rShowPw, setRShowPw] = useState(false);
  const [rLoading, setRLoading] = useState(false);
  const [rError, setRError] = useState('');

  const resetForms = useCallback(() => {
    setSiEmail(''); setSiPassword(''); setSiShowPw(false); setSiLoading(false); setSiError('');
    setRName(''); setREmail(''); setRPassword(''); setRConfirm(''); setRShowPw(false); setRLoading(false); setRError('');
  }, []);

  useEffect(() => {
    if (!open) return;
    resetForms();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, resetForms]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiError('');
    setSiLoading(true);
    try {
      await login(siEmail, siPassword);
      onClose();
    } catch (err) {
      setSiError(err instanceof Error ? err.message : auth.loginFailedError);
    } finally {
      setSiLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRError('');
    if (rPassword !== rConfirm) {
      setRError(auth.passwordMismatchError);
      return;
    }
    setRLoading(true);
    try {
      await register(rName, rEmail, rPassword);
      onClose();
    } catch (err) {
      setRError(err instanceof Error ? err.message : auth.registrationFailedError);
    } finally {
      setRLoading(false);
    }
  };

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--input-bg)',
    border: '1px solid rgba(var(--accent-rgb),0.2)',
    color: 'var(--fg)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    fontWeight: 300,
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    letterSpacing: '0.14em',
    color: 'var(--muted-teal)',
    marginBottom: '0.4rem',
    textTransform: 'uppercase' as const,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'var(--modal-scrim)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--card-bg)',
          border: '1px solid rgba(var(--accent-rgb),0.18)',
          boxShadow: '0 0 60px rgba(var(--accent-rgb),0.08), 0 24px 60px rgba(0,0,0,0.18)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Scanline decoration */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
            opacity: 0.6,
          }}
        />
        {/* Corner decorations */}
        <div style={{ position: 'absolute', top: 8, right: 8, width: 12, height: 12, borderTop: '1px solid rgba(var(--accent-rgb),0.4)', borderRight: '1px solid rgba(var(--accent-rgb),0.4)' }} />
        <div style={{ position: 'absolute', bottom: 8, left: 8, width: 12, height: 12, borderBottom: '1px solid rgba(var(--accent-rgb),0.4)', borderLeft: '1px solid rgba(var(--accent-rgb),0.4)' }} />

        <div style={{ padding: '2rem 2rem 2.5rem' }}>
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label={auth.closeLabel}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted-teal)',
              padding: '0.25rem',
              lineHeight: 1,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-teal)')}
          >
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>

          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '1.4rem',
              letterSpacing: '0.3em',
              color: 'var(--accent)',
              textShadow: '0 0 20px rgba(var(--accent-rgb),0.4)',
              marginBottom: '0.25rem',
            }}>
              STARGATER
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.2em',
              color: 'rgba(var(--accent-rgb),0.45)',
            }}>
              NEXUS
            </div>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(var(--accent-rgb),0.12)',
            marginBottom: '1.75rem',
          }}>
            {(['signin', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: tab === t ? 'var(--accent)' : 'var(--muted-teal)',
                  borderBottom: tab === t ? '1px solid var(--accent)' : '1px solid transparent',
                  marginBottom: '-1px',
                  transition: 'color 0.2s',
                }}
              >
                {t === 'signin' ? auth.signInTabLabel : auth.registerTabLabel}
              </button>
            ))}
          </div>

          {/* Sign In Form */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div>
                  <label htmlFor='si-email' style={labelStyle}>{auth.emailLabel}</label>
                  <input
                    id='si-email'
                    type='email'
                    autoComplete='email'
                    value={siEmail}
                    onChange={(e) => setSiEmail(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.5)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.2)')}
                  />
                </div>
                <div>
                  <label htmlFor='si-password' style={labelStyle}>{auth.passwordLabel}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id='si-password'
                      type={siShowPw ? 'text' : 'password'}
                      autoComplete='current-password'
                      value={siPassword}
                      onChange={(e) => setSiPassword(e.target.value)}
                      required
                      style={{ ...inputStyle, paddingRight: '2.75rem' }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.5)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.2)')}
                    />
                    <button
                      type='button'
                      onClick={() => setSiShowPw(!siShowPw)}
                      aria-label={siShowPw ? auth.hidePasswordLabel : auth.showPasswordLabel}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--muted-teal)',
                        padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      {siShowPw ? (
                        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                          <path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94' />
                          <path d='M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19' />
                          <line x1='1' y1='1' x2='23' y2='23' />
                        </svg>
                      ) : (
                        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                          <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                          <circle cx='12' cy='12' r='3' />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {siError && <ErrorBox message={siError} />}

                <button
                  type='submit'
                  disabled={siLoading}
                  className='btn-primary'
                  style={{ width: '100%', marginTop: '0.25rem', opacity: siLoading ? 0.7 : 1 }}
                >
                  {siLoading ? <LoadingSpinner label={auth.loadingLabel} /> : auth.signInSubmitLabel}
                </button>
              </div>
            </form>
          )}

          {/* Register Form */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div>
                  <label htmlFor='r-name' style={labelStyle}>{auth.fullNameLabel}</label>
                  <input
                    id='r-name'
                    type='text'
                    autoComplete='name'
                    value={rName}
                    onChange={(e) => setRName(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.5)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.2)')}
                  />
                </div>
                <div>
                  <label htmlFor='r-email' style={labelStyle}>{auth.emailLabel}</label>
                  <input
                    id='r-email'
                    type='email'
                    autoComplete='email'
                    value={rEmail}
                    onChange={(e) => setREmail(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.5)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.2)')}
                  />
                </div>
                <div>
                  <label htmlFor='r-password' style={labelStyle}>{auth.passwordLabel}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id='r-password'
                      type={rShowPw ? 'text' : 'password'}
                      autoComplete='new-password'
                      value={rPassword}
                      onChange={(e) => setRPassword(e.target.value)}
                      required
                      minLength={8}
                      style={{ ...inputStyle, paddingRight: '2.75rem' }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.5)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.2)')}
                    />
                    <button
                      type='button'
                      onClick={() => setRShowPw(!rShowPw)}
                      aria-label={rShowPw ? auth.hidePasswordLabel : auth.showPasswordLabel}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--muted-teal)',
                        padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      {rShowPw ? (
                        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                          <path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94' />
                          <path d='M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19' />
                          <line x1='1' y1='1' x2='23' y2='23' />
                        </svg>
                      ) : (
                        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                          <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                          <circle cx='12' cy='12' r='3' />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor='r-confirm' style={labelStyle}>{auth.confirmPasswordLabel}</label>
                  <input
                    id='r-confirm'
                    type={rShowPw ? 'text' : 'password'}
                    autoComplete='new-password'
                    value={rConfirm}
                    onChange={(e) => setRConfirm(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.5)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.2)')}
                  />
                </div>

                {rError && <ErrorBox message={rError} />}

                <button
                  type='submit'
                  disabled={rLoading}
                  className='btn-primary'
                  style={{ width: '100%', marginTop: '0.25rem', opacity: rLoading ? 0.7 : 1 }}
                >
                  {rLoading ? <LoadingSpinner label={auth.loadingLabel} /> : auth.registerSubmitLabel}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }): JSX.Element {
  return (
    <div style={{
      padding: '0.65rem 1rem',
      background: 'rgba(var(--coral-rgb),0.12)',
      border: '1px solid rgba(var(--coral-rgb),0.35)',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.68rem',
      letterSpacing: '0.06em',
      color: 'var(--coral-red)',
    }}>
      {message}
    </div>
  );
}

function LoadingSpinner({ label }: { label: string }): JSX.Element {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <svg
        width='14'
        height='14'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        style={{ animation: 'spin 0.8s linear infinite' }}
      >
        <path d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' />
      </svg>
      {label}
    </span>
  );
}
