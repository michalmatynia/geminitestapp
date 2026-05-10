import type { JSX } from 'react';
import type { AboutHeroContent } from '@/data/aboutContent';

interface HeroSectionProps {
  content: AboutHeroContent;
}

export function HeroSection({ content }: HeroSectionProps): JSX.Element {
  return (
    <div
      className='relative min-h-[80vh] flex items-end px-8 md:px-20 py-16 md:py-24 overflow-hidden grain'
      style={{ background: 'linear-gradient(160deg, #18110A 0%, #2C2018 60%, #1A1612 100%)' }}
    >
      <div
        className='absolute inset-0 flex items-center justify-center pointer-events-none select-none'
        aria-hidden='true'
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(8rem, 22vw, 26rem)',
            fontWeight: 300,
            color: 'transparent',
            WebkitTextStroke: '1px rgba(255,255,255,0.06)',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            userSelect: 'none',
          }}
        >
          {content.watermark}
        </span>
      </div>

      <div className='relative z-10 max-w-2xl'>
        <div className='type-label mb-6' style={{ color: 'rgba(255,255,255,0.35)' }}>
          {content.eyebrow}
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 7vw, 6rem)',
            fontWeight: 300,
            lineHeight: 1.02,
            color: '#EDE8E0',
            marginBottom: '1.5rem',
          }}
        >
          {content.title}
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1.05rem',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.85,
          }}
        >
          {content.body}
        </p>
      </div>
    </div>
  );
}
