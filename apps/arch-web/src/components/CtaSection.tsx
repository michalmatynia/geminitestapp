'use client';

import { useState } from 'react';
import type { ArchPageContent } from '@/lib/types';
import { renderEmphasis } from '@/lib/renderEmphasis';

export default function CtaSection({ content, locale }: { content: ArchPageContent['cta']; locale?: string }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message, locale }),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (res.ok) {
        setStatus('done');
        setEmail('');
        setMessage('');
      } else {
        setStatus('error');
        setErrorMsg(data.error ?? 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Failed to submit. Please try again.');
    }
  };

  return (
    <section className="cta" id="contact">
      <div className="wrap">
        <div className="cta-inner">
          <h2 className="rev">
            {renderEmphasis(content.title, content.emphasis)}
          </h2>
          <div className="cta-side rev" data-delay="1">
            <p>{content.description}</p>
            {status === 'done' ? (
              <p className="cta-success">{content.successMessage}</p>
            ) : (
              <form className="cta-form" onSubmit={handleSubmit}>
                <div className="cta-field">
                  <input
                    className="cta-input"
                    type="email"
                    placeholder={content.emailPlaceholder}
                    aria-label="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="cta-field">
                  <textarea
                    className="cta-input cta-textarea"
                    placeholder={content.messagePlaceholder}
                    aria-label="message"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                    rows={4}
                  />
                </div>
                {status === 'error' && (
                  <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--accent)', margin: '0' }}>{errorMsg}</p>
                )}
                <button type="submit" className="cta-submit" disabled={status === 'loading'}>
                  <span>{status === 'loading' ? content.loadingLabel : content.submitLabel}</span>
                  <span style={{ position: 'relative', width: '18px', height: '1px', background: 'currentColor', display: 'inline-block' }}>
                    <span style={{ position: 'absolute', right: 0, top: '-3px', width: '6px', height: '6px', borderTop: '1px solid currentColor', borderRight: '1px solid currentColor', transform: 'rotate(45deg)', display: 'block' }} />
                  </span>
                </button>
              </form>
            )}
            <p className="cta-note">{content.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
