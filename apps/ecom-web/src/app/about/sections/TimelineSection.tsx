import type { JSX } from 'react';
import type { AboutContent } from '@/data/aboutContent';

interface TimelineSectionProps {
  content: AboutContent;
}

export function TimelineSection({ content }: TimelineSectionProps): JSX.Element {
  return (
    <div className='px-8 md:px-16 py-20 max-w-screen-2xl mx-auto'>
      <div className='type-label mb-12' style={{ color: 'var(--accent)' }}>{content.historyEyebrow}</div>
      <div className='grid md:grid-cols-3 gap-0'>
        {content.milestones.map(({ year, event }: { year: string, event: string }, i: number) => (
          <div
            key={year}
            className='py-8 pr-8'
            style={{
              borderTop: '1px solid var(--border)',
              borderLeft: i % 3 !== 0 ? '1px solid var(--border)' : 'none',
              paddingLeft: i % 3 !== 0 ? '2rem' : 0,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.5rem',
                fontWeight: 300,
                color: 'var(--fg)',
                lineHeight: 1,
                marginBottom: '1rem',
              }}
            >
              {year}
            </div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                fontWeight: 300,
                color: 'var(--muted)',
                lineHeight: 1.75,
              }}
            >
              {event}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
