import type { Project } from '@/lib/types';
import IsometricThumbnail from './IsometricThumbnail';

export default function BuiltWork({ projects }: { projects: Project[] }) {
  const cards = [
    {
      project: projects[0],
      fallbackCode: 'MBD — 001',
      fallbackName: 'Helios Tower',
      fallbackDesc: 'mixed-use, 32 stories',
      fallbackCity: 'Zurich',
    },
    {
      project: projects[1],
      fallbackCode: 'MBD — 002',
      fallbackName: 'Kulturhaus',
      fallbackDesc: 'cultural pavilion, 4,200 m²',
      fallbackCity: 'Amsterdam',
    },
    {
      project: projects[2],
      fallbackCode: 'MBD — 003',
      fallbackName: 'South Quarter',
      fallbackDesc: 'residential ensemble, 8,600 m²',
      fallbackCity: 'Berlin',
    },
  ];

  return (
    <section id="projects" className="projects-section projects-dark">
      <div className="wrap">
        <div className="sec-head">
          <div className="sec-head-meta">
            <span className="num rev">— 04 / projects</span>
            <span className="label rev" data-delay="1" style={{ color: 'var(--ink-3)' }}>three of recent note</span>
          </div>
          <h2 className="rev" data-delay="1">
            A selection of <em>built work</em> rendered through the studio&apos;s systems.
          </h2>
        </div>

        <div className="projects-grid">
          {cards.map(({ project, fallbackCode, fallbackName, fallbackDesc, fallbackCity }, i) => (
            <a key={i} href="#" className={`project-card rev${i > 0 ? '' : ''}`} data-delay={i > 0 ? String(i) : undefined}>
              <div className="project-frame">
                <IsometricThumbnail projectIdx={i} />
              </div>
              <div className="project-meta">
                <span className="project-num">
                  {project?.code ? project.code.replace('-', ' — ') : fallbackCode} / 2024
                </span>
                <div className="project-name">
                  {project?.name ?? fallbackName}
                  <em>{fallbackDesc}</em>
                </div>
                <span className="project-loc">{project?.city ?? fallbackCity}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
