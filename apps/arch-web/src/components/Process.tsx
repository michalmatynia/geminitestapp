import type { ArchPageContent } from '@/lib/types';
import { renderEmphasis } from '@/lib/renderEmphasis';

export default function Process({ content }: { content: ArchPageContent['process'] }) {
  return (
    <section className="process" id="process">
      <div className="wrap">
        <div className="sec-head">
          <div className="sec-head-meta">
            <span className="num rev">{content.eyebrow}</span>
            <span className="label rev" data-delay="1" style={{ color: 'var(--ink-3)' }}>{content.label}</span>
          </div>
          <h2 className="rev" data-delay="1">{renderEmphasis(content.title, content.emphasis)}</h2>
        </div>

        <div className="proc-grid">
          {content.steps.map((step, index) => (
          <div className="proc-cell rev" data-delay={index > 0 ? String(index) : undefined} key={`${step.number}-${step.title}`}>
            <div className="proc-glyph">
              <svg viewBox="0 0 36 36">
                <rect className="g" x="6" y="6" width="24" height="24" />
                <line className="g" x1="6" y1="14" x2="30" y2="14" />
              </svg>
            </div>
            <span className="num">{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
          ))}
        </div>
      </div>
    </section>
  );
}
