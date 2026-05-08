'use client';

import { useState, type JSX } from 'react';
import type { ContactContent } from '@/data/contactContent';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { useToast } from '@/context/ToastContext';
import { useLocalizedHref } from '@/context/LocaleContext';

export function ContactPageClient({ content }: { content: ContactContent }): JSX.Element {
  const { toast } = useToast();
  const localizedHref = useLocalizedHref();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: content.form.subjects[0] ?? '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    toast({ type: 'success', title: content.success.toastTitle, message: content.success.toastMessage });
  };

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh' }}>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden px-8 md:px-16 py-20 md:py-28"
          style={{
            background: 'linear-gradient(160deg, #1a1208 0%, #0d0d0b 60%, #0a0908 100%)',
          }}
        >
          {/* Outlined watermark */}
          <div
            className="absolute inset-0 flex items-center justify-end pr-8 md:pr-16 pointer-events-none select-none"
            aria-hidden="true"
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(5rem, 16vw, 16rem)',
                fontWeight: 300,
                color: 'transparent',
                WebkitTextStroke: '1px rgba(255,255,255,0.05)',
                lineHeight: 1,
                letterSpacing: '-0.04em',
              }}
            >
              {content.hero.watermark}
            </span>
          </div>

          <div className="relative z-10 max-w-screen-2xl mx-auto">
            <div
              className="type-label mb-4"
              style={{ color: 'rgba(180,140,80,0.8)', letterSpacing: '0.14em' }}
            >
              {content.hero.eyebrow}
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.5rem, 7vw, 6rem)',
                fontWeight: 300,
                color: '#f5f0eb',
                lineHeight: 1.0,
                letterSpacing: '-0.02em',
                marginBottom: '1.25rem',
              }}
            >
              {content.hero.titleLine1}<br />{content.hero.titleLine2}
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.9rem',
                fontWeight: 300,
                color: 'rgba(255,255,255,0.4)',
                lineHeight: 1.8,
                maxWidth: '360px',
              }}
            >
              {content.hero.body}
            </p>
          </div>
        </div>

        {/* ── Content grid ─────────────────────────────────────────── */}
        <div className="px-8 md:px-16 py-16 md:py-24 max-w-screen-2xl mx-auto">
          <div className="grid md:grid-cols-[1fr_1.5fr] gap-12 md:gap-20">

            {/* ── Brand info ─────────────────────────────────────────── */}
            <div>
              <div className="mb-12">
                <div className="type-label mb-5" style={{ color: 'var(--accent)' }}>
                  {content.info.addressEyebrow}
                </div>
                <address
                  className="not-italic"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    fontWeight: 300,
                    color: 'var(--fg)',
                    lineHeight: 2.1,
                  }}
                >
                  {content.info.addressLines.map((line) => (
                    <span key={line}>
                      {line}<br />
                    </span>
                  ))}
                </address>
              </div>

              <div className="mb-12">
                <div className="type-label mb-5" style={{ color: 'var(--accent)' }}>
                  {content.info.directEyebrow}
                </div>
                <div
                  className="flex flex-col gap-2"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.875rem',
                    fontWeight: 300,
                    color: 'var(--muted)',
                    lineHeight: 1.8,
                  }}
                >
                  {content.info.directLinks.map((link) => (
                    <a key={`${link.label}-${link.href}`} href={localizedHref(link.href)} className="hover:text-[var(--fg)] transition-colors">
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="mb-12">
                <div className="type-label mb-5" style={{ color: 'var(--accent)' }}>
                  {content.info.hoursEyebrow}
                </div>
                <div
                  className="flex flex-col gap-1"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.875rem',
                    fontWeight: 300,
                    color: 'var(--muted)',
                    lineHeight: 2.0,
                  }}
                >
                  {content.info.hours.map((row) => (
                    <div key={`${row.label}-${row.value}`} className="flex justify-between gap-8">
                      <span>{row.label}</span>
                      <span style={{ color: row.muted ? 'var(--muted)' : 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="type-label mb-5" style={{ color: 'var(--accent)' }}>
                  {content.info.followEyebrow}
                </div>
                <div className="flex gap-4">
                  {content.info.socialLinks.map((link) => (
                    <a
                      key={`${link.label}-${link.href}`}
                      href={localizedHref(link.href)}
                      className="type-label px-4 py-2.5 hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-all duration-200"
                      style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Form ───────────────────────────────────────────────── */}
            <div>
              {sent ? (
                <div
                  className="flex flex-col items-start justify-center py-16 gap-6"
                  style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '2rem' }}
                >
                  <div className="type-label" style={{ color: 'var(--accent)' }}>{content.success.eyebrow}</div>
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                      fontWeight: 300,
                      color: 'var(--fg)',
                      lineHeight: 1.1,
                    }}
                  >
                    {content.success.titleLine1}<br />{content.success.titleLine2}
                  </h2>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.875rem',
                      fontWeight: 300,
                      color: 'var(--muted)',
                      lineHeight: 1.85,
                    }}
                  >
                    {content.success.body}
                  </p>
                  <button
                    onClick={() => setSent(false)}
                    className="btn-ghost mt-2"
                  >
                    {content.success.resetLabel}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="type-label block mb-2" style={{ color: 'var(--muted)' }}>
                        {content.form.nameLabel}
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder={content.form.namePlaceholder}
                        className="w-full px-4 py-3.5 transition-colors duration-200"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          color: 'var(--fg)',
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.875rem',
                          fontWeight: 300,
                          outline: 'none',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--fg)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
                      />
                    </div>
                    <div>
                      <label className="type-label block mb-2" style={{ color: 'var(--muted)' }}>
                        {content.form.emailLabel}
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder={content.form.emailPlaceholder}
                        className="w-full px-4 py-3.5 transition-colors duration-200"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          color: 'var(--fg)',
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.875rem',
                          fontWeight: 300,
                          outline: 'none',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--fg)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="type-label block mb-2" style={{ color: 'var(--muted)' }}>
                      {content.form.subjectLabel}
                    </label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-4 py-3.5 appearance-none cursor-pointer"
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--fg)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.875rem',
                        fontWeight: 300,
                        outline: 'none',
                      }}
                    >
                      {content.form.subjects.map((subject) => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="type-label block mb-2" style={{ color: 'var(--muted)' }}>
                      {content.form.messageLabel}
                    </label>
                    <textarea
                      required
                      rows={7}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder={content.form.messagePlaceholder}
                      className="w-full px-4 py-3.5 resize-none transition-colors duration-200"
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--fg)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.875rem',
                        fontWeight: 300,
                        outline: 'none',
                        lineHeight: 1.75,
                      }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--fg)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="type-label" style={{ color: 'var(--muted)' }}>
                      {content.form.footnote}
                    </p>
                    <button type="submit" className="btn-primary">
                      {content.form.submitLabel}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
