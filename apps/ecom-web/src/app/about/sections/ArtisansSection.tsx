import type { JSX } from 'react';
import type { AboutContent, AboutArtisanContent } from '@/data/aboutContent';
import { localizeHref, type EcomLocale } from '@/lib/locales';

interface ArtisansSectionProps {
  content: AboutContent;
  locale: EcomLocale;
  gradients: string[];
}

export function ArtisansSection({ content, locale, gradients }: ArtisansSectionProps): JSX.Element {
  return (
    <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div className='px-8 md:px-16 py-16 max-w-screen-2xl mx-auto'>
        <div className='flex items-end justify-between mb-12'>
          <div>
            <div className='type-label mb-3' style={{ color: 'var(--accent)' }}>{content.artisansEyebrow}</div>
            <h2 className='type-display-md' style={{ color: 'var(--fg)' }}>{content.artisansTitle}</h2>
          </div>
          <a href={localizeHref(content.artisansCtaHref, locale)} className='hidden md:flex type-label items-center gap-2 hover:gap-3 transition-all' style={{ color: 'var(--muted)' }}>
            {content.artisansCtaLabel}
            <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
              <path d='M5 12h14M12 5l7 7-7 7' />
            </svg>
          </a>
        </div>
        <ArtisansGrid artisans={content.artisans} gradients={gradients} />
      </div>
    </div>
  );
}

function ArtisansGrid({ artisans, gradients }: { artisans: AboutArtisanContent[], gradients: string[] }): JSX.Element {
  return (
    <div className='grid md:grid-cols-4 gap-6'>
      {artisans.map((artisan, index) => (
        <ArtisanCard key={artisan.name} artisan={artisan} gradient={gradients[index % gradients.length] ?? gradients[0] ?? 'var(--surface)'} />
      ))}
    </div>
  );
}

function ArtisanCard({ artisan, gradient }: { artisan: AboutArtisanContent, gradient: string }): JSX.Element {
  return (
    <div className='group'>
      <div className='relative mb-5 overflow-hidden' style={{ aspectRatio: '3/4', background: gradient }}>
        <div
          className='absolute inset-0 flex items-center justify-center'
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '3.5rem',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.15)',
            letterSpacing: '0.1em',
          }}
        >
          {artisan.name.split(' ').map((n) => n[0]).join('')}
        </div>
        <div
          className='absolute bottom-0 left-0 right-0 p-5 translate-y-full opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100'
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              fontWeight: 300,
              color: 'rgba(255,255,255,0.8)',
              lineHeight: 1.6,
            }}
          >
            {artisan.note}
          </p>
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.15rem',
          fontWeight: 300,
          color: 'var(--fg)',
          marginBottom: '0.25rem',
        }}
      >
        {artisan.name}
      </div>
      <div className='type-label' style={{ color: 'var(--accent)' }}>{artisan.role}</div>
      <div className='type-label mt-0.5' style={{ color: 'var(--muted)' }}>{artisan.location}</div>
    </div>
  );
}
