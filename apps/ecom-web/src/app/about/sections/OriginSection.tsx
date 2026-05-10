import type { JSX } from 'react';
import type { AboutContent } from '@/data/aboutContent';

interface OriginSectionProps {
  content: AboutContent;
}

export function OriginSection({ content }: OriginSectionProps): JSX.Element {
  return (
    <div className='grid md:grid-cols-2' style={{ borderBottom: '1px solid var(--border)' }}>
      <div className='px-8 md:px-16 py-16 md:py-24' style={{ borderRight: '1px solid var(--border)' }}>
        <div className='type-label mb-6' style={{ color: 'var(--accent)' }}>
          {content.origin.eyebrow}
        </div>
        <h2 className='type-display-md mb-8' style={{ color: 'var(--fg)' }}>
          {content.origin.title}
        </h2>
        <div className='space-y-5'>
          {content.origin.paragraphs.map((para: string, i: number) => (
            <p
              key={i}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.95rem',
                fontWeight: 300,
                color: 'var(--muted)',
                lineHeight: 1.85,
              }}
            >
              {para}
            </p>
          ))}
        </div>
      </div>

      <div className='px-8 md:px-16 py-16 md:py-24 flex flex-col justify-between gap-12' style={{ background: 'var(--surface)' }}>
        <div className='type-label mb-4' style={{ color: 'var(--muted)' }}>{content.statsEyebrow}</div>
        {content.stats.map(({ value, label, sub }: { value: string, label: string, sub: string }) => (
          <div key={label} className='flex items-start gap-6' style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                fontWeight: 300,
                color: 'var(--fg)',
                lineHeight: 1,
                minWidth: '4rem',
              }}
            >
              {value}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 400, color: 'var(--fg)', marginBottom: '0.2rem' }}>
                {label}
              </div>
              <div className='type-label' style={{ color: 'var(--muted)' }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
