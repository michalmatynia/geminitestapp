import type { JSX } from 'react';
import type { AboutContent } from '@/data/aboutContent';

interface ValuesSectionProps {
  content: AboutContent;
}

export function ValuesSection({ content }: ValuesSectionProps): JSX.Element {
  return (
    <div className='px-8 md:px-16 py-20 max-w-screen-2xl mx-auto'>
      <div className='type-label mb-12' style={{ color: 'var(--accent)' }}>{content.valuesEyebrow}</div>
      <div className='grid md:grid-cols-2 gap-x-16 gap-y-0'>
        {content.values.map(({ number, title, body }: { number: string, title: string, body: string }) => (
          <div
            key={number}
            className='py-10'
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div className='flex items-start gap-6'>
              <span
                className='type-label flex-shrink-0 mt-1'
                style={{ color: 'rgba(var(--accent-rgb),0.4)' }}
              >
                {number}
              </span>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.5rem',
                    fontWeight: 300,
                    color: 'var(--fg)',
                    marginBottom: '0.75rem',
                    lineHeight: 1.2,
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.875rem',
                    fontWeight: 300,
                    color: 'var(--muted)',
                    lineHeight: 1.8,
                  }}
                >
                  {body}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
