'use client';

import { useState } from 'react';

export default function CtaSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (res.ok) {
        setStatus('done');
        setMessage(data.message ?? 'received');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error ?? 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setMessage('Failed to submit. Please try again.');
    }
  };

  return (
    <section className="cta" id="contact">
      <div className="wrap">
        <div className="cta-inner">
          <h2 className="rev">
            Ready to <em>eliminate</em><br />the unnecessary?
          </h2>
          <div className="cta-side rev" data-delay="1">
            <p>Pilot programme places are limited to twelve practices per quarter. Enquiries are reviewed weekly.</p>
            {status === 'done' ? (
              <p className="cta-success">received ↗ — we&apos;ll be in touch within five working days.</p>
            ) : (
              <form className="cta-form" onSubmit={handleSubmit}>
                <input
                  className="cta-input"
                  type="email"
                  placeholder="your practice email"
                  aria-label="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="cta-submit" disabled={status === 'loading'}>
                  <span>{status === 'loading' ? 'sending…' : 'send enquiry'}</span>
                  <span style={{ position: 'relative', width: '18px', height: '1px', background: 'currentColor', display: 'inline-block' }}>
                    <span style={{ position: 'absolute', right: 0, top: '-3px', width: '6px', height: '6px', borderTop: '1px solid currentColor', borderRight: '1px solid currentColor', transform: 'rotate(45deg)', display: 'block' }} />
                  </span>
                </button>
              </form>
            )}
            {status === 'error' && (
              <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--accent)' }}>{message}</p>
            )}
            <p className="cta-note">No obligation. Reviewed weekly · response within five working days.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
