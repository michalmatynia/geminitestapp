import type { ArchPageContent, Service } from '@/lib/types';
import { renderEmphasis } from '@/lib/renderEmphasis';

const servicesMeta: Record<string, { num: string; meta: string; value: string }> = {
  'S-01': { num: 'i.', meta: 'Jurisdictions', value: '38 active' },
  'S-02': { num: 'ii.', meta: 'Avg. options gen.', value: '3,400 / brief' },
  'S-03': { num: 'iii.', meta: 'Time saved', value: '72% median' },
  'S-04': { num: 'iv.', meta: 'Tracked', value: '340+ projects' },
};

const fallbackServices: Service[] = [
  {
    code: 'S-01',
    title: 'Code compliance',
    emphasis: 'compliance',
    description:
      'Planning rules, building regulations, access standards, and project constraints are checked before drawings leave review.',
    order: 0,
  },
  {
    code: 'S-02',
    title: 'Brief to massing',
    emphasis: 'massing',
    description:
      'Natural language briefs become tested spatial options with area schedules, circulation logic, and daylight constraints attached.',
    order: 1,
  },
  {
    code: 'S-03',
    title: 'Drawing documentation',
    emphasis: 'documentation',
    description:
      'Plans, elevations, and schedules are coordinated against studio standards so issue sets stay consistent.',
    order: 2,
  },
  {
    code: 'S-04',
    title: 'Practice intelligence',
    emphasis: 'intelligence',
    description:
      'Project data becomes searchable memory, linking precedents, decisions, risks, and consultant responses.',
    order: 3,
  },
];

export default function Services({
  content,
  services,
}: {
  content: ArchPageContent['services'];
  services: Service[];
}) {
  const displayServices = services.length > 0 ? services : fallbackServices;

  return (
    <section id="practice" className="services-dark">
      <div className="wrap">
        <div className="sec-head">
          <div className="sec-head-meta">
            <span className="num rev">{content.eyebrow}</span>
            <span className="label rev" data-delay="1" style={{ color: 'var(--ink-3)' }}>{content.label}</span>
          </div>
          <h2 className="rev" data-delay="1">
            {renderEmphasis(content.title, content.emphasis)}
          </h2>
        </div>

        <div className="practice-list">
          {displayServices.map((svc) => {
            const meta = servicesMeta[svc.code] ?? { num: '—', meta: '', value: '' };
            return (
              <div className="practice-row" key={svc.code}>
                <span className="practice-num">{meta.num}</span>
                <h3 className="practice-title">
                  {svc.emphasis ? renderEmphasis(svc.title, svc.emphasis) : svc.title}
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
