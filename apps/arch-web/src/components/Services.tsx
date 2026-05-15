import type { ArchPageContent, Service } from '@/lib/types';

const servicesMeta: Record<string, { num: string; meta: string; value: string }> = {
  'S-01': { num: 'i.', meta: 'Jurisdictions', value: '38 active' },
  'S-02': { num: 'ii.', meta: 'Avg. options gen.', value: '3,400 / brief' },
  'S-03': { num: 'iii.', meta: 'Time saved', value: '72% median' },
  'S-04': { num: 'iv.', meta: 'Tracked', value: '340+ projects' },
};

export default function Services({
  content,
  services,
}: {
  content: ArchPageContent['services'];
  services: Service[];
}) {
  return (
    <section id="practice" className="services-dark">
      <div className="wrap">
        <div className="sec-head">
          <div className="sec-head-meta">
            <span className="num rev">{content.eyebrow}</span>
            <span className="label rev" data-delay="1" style={{ color: 'var(--ink-3)' }}>{content.label}</span>
          </div>
          <h2 className="rev" data-delay="1">
            {content.title.replace(content.emphasis, '')}<em>{content.emphasis}</em>
          </h2>
        </div>

        <div className="practice-list">
          {services.map((svc) => {
            const meta = servicesMeta[svc.code] ?? { num: '—', meta: '', value: '' };
            const titleMain = svc.emphasis ? svc.title.replace(svc.emphasis, '').trimEnd() : svc.title;
            return (
              <div className="practice-row" key={svc.code}>
                <span className="practice-num">{meta.num}</span>
                <h3 className="practice-title">
                  {svc.emphasis ? <>{titleMain} <em>{svc.emphasis}</em></> : svc.title}
                </h3>
                <p className="practice-desc">{svc.description}</p>
                <div className="practice-meta">
                  <span>{meta.meta}</span>
                  <strong>{meta.value}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
