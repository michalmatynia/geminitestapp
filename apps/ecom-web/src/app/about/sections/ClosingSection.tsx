import type { JSX } from 'react';
import type { AboutClosingContent } from '@/data/aboutContent';
import { localizeHref } from '@/lib/locales';

interface ClosingSectionProps {
  content: AboutClosingContent;
  locale: string;
}

export function ClosingSection({ content, locale }: ClosingSectionProps): JSX.Element {
  return (
    <div
      className='px-8 md:px-20 py-24 text-center grain relative overflow-hidden'
      style={{ background: 'var(--fg)', color: 'var(--bg)' }}
    >
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.8rem, 4vw, 3.5rem)',
          fontWeight: 300,
          lineHeight: 1.15,
          color: 'var(--bg)',
          maxWidth: '720px',
          margin: '0 auto 2.5rem',
        }}
      >
        &ldquo;{content.quote}&rdquo;
      </p>
      <div className='type-label mb-10' style={{ color: 'rgba(255,255,255,0.35)' }}>
        {content.attribution}
      </div>
      <div className='flex gap-4 justify-center flex-wrap'>
        <a
          href={localizeHref(content.primaryCtaHref, locale)}
          className='btn-primary'
          style={{ background: 'var(--bg)', color: 'var(--fg)' }}
        >
          {content.primaryCtaLabel}
        </a>
        <a
          href={localizeHref(content.secondaryCtaHref, locale)}
          className='btn-ghost'
          style={{ color: 'var(--bg)', borderColor: 'rgba(255,255,255,0.2)' }}
        >
          {content.secondaryCtaLabel}
        </a>
      </div>
    </div>
  );
}
