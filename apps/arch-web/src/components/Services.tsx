import type { ArchPageContent, Service } from '@/lib/types';

const servicesMeta: Record<string, { num: string; meta: string; value: string }> = {
  'S-01': { num: 'i.', meta: 'Jurisdictions', value: '38 active' },
  'S-02': { num: 'ii.', meta: 'Avg. options gen.', value: '3,400 / brief' },
  'S-03': { num: 'iii.', meta: 'Time saved', value: '72% median' },
  'S-04': { num: 'iv.', meta: 'Tracked', value: '340+ projects' },
};

const titleMap: Record<string, { main: string; em: string }> = {
  'S-01': { main: 'Compliance', em: 'Intelligence' },
  'S-02': { main: 'Generative', em: 'Massing' },
  'S-03': { main: 'Document', em: 'Automation' },
  'S-04': { main: 'Project', em: 'Intelligence' },
};

const descMap: Record<string, string> = {
  'S-01': 'Automated cross-referencing against regulations in any European or international jurisdiction. Upload drawings; receive a full compliance report in minutes, with cited clause references.',
  'S-02': 'Input site, programme, and constraint. Receive a curated set of optimised massing options, ranked by buildability, daylight, and cost. We deliver the three you would have chosen yourself, faster.',
  'S-03': 'Concept sketches transform into production drawing sets. Plans, sections, and elevations rendered with correct line weights, annotations, and your office\'s drafting conventions.',
  'S-04': 'Real-time budget forecasting and risk identification. An assistant project manager that surfaces the questions worth asking — and the deadlines worth defending.',
};

export default function Services({
  content,
  services,
}: {
  content: ArchPageContent['services'];
  services: Service[];
}) {
  const displayServices = services.length > 0 ? services : [
    { code: 'S-01', title: 'Compliance Intelligence', description: descMap['S-01'], order: 0 },
    { code: 'S-02', title: 'Generative Massing', description: descMap['S-02'], order: 1 },
    { code: 'S-03', title: 'Document Automation', description: descMap['S-03'], order: 2 },
    { code: 'S-04', title: 'Project Intelligence', description: descMap['S-04'], order: 3 },
  ];

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
          {displayServices.map((svc) => {
            const meta = servicesMeta[svc.code] ?? { num: '—', meta: '', value: '' };
            const titles = titleMap[svc.code];
            const desc = descMap[svc.code] ?? svc.description;
            return (
              <div className="practice-row" key={svc.code}>
                <span className="practice-num">{meta.num}</span>
                <h3 className="practice-title">
                  {titles ? <>{titles.main} <em>{titles.em}</em></> : svc.title}
                </h3>
                <p className="practice-desc">{desc}</p>
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
