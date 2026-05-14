import type { ArchPageContent } from '@/lib/types';

export default function Philosophy({ content }: { content: ArchPageContent['philosophy'] }) {
  return (
    <section className="philosophy" id="studio">
      <div className="wrap">
        <div className="phil-grid">
          <div className="phil-text">
            <span className="label rev">{content.eyebrow}</span>
            <h2 className="rev" data-delay="1" style={{ marginTop: '18px' }}>
              {content.title}<br /><em>{content.emphasis}</em>
            </h2>
            <p className="rev" data-delay="2">
              {content.body}
            </p>
            <p className="rev" data-delay="3">{content.closing}</p>
          </div>

          <div className="phil-figure rev" data-delay="2">
            <span className="phil-caption">{content.caption}</span>
          </div>
        </div>

        <div className="principles">
          {content.principles.map((principle, index) => (
            <div className="prin-row rev" data-delay={index > 0 ? String(index) : undefined} key={`${principle.number}-${principle.title}`}>
              <span className="prin-num">{principle.number}</span>
              <div className="prin-title">
                {principle.title}<em>{principle.emphasis}</em>
              </div>
              <p className="prin-desc">{principle.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
