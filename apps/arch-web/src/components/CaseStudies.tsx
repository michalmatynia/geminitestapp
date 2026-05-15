'use client';

import { useState } from 'react';
import type { ArchPageContent, Project } from '@/lib/types';
import SideViewThumbnail from './SideViewThumbnail';

export default function CaseStudies({
  content,
  projects,
}: {
  content: ArchPageContent['caseStudy'];
  projects: Project[];
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const featuredProject = projects[0];

  return (
    <section className="case">
      <div className="wrap">
        <div className="sec-head">
          <div className="sec-head-meta">
            <span className="num rev">{content.eyebrow}</span>
            <span className="label rev" data-delay="1" style={{ color: 'var(--ink-3)' }}>{content.label}</span>
          </div>
          <h2 className="rev" data-delay="1">
            {content.title.replace(content.titleEmphasis, '').trimEnd()} <em>{content.titleEmphasis}</em>
          </h2>
        </div>

        <div className="case-grid">
          <div className="case-copy">
            <h3 className="rev">
              {content.heading}<em>{content.headingEmphasis}</em>
            </h3>
            <p className="rev" data-delay="1">{content.body}</p>
            {featuredProject?.description ? (
              <p className="rev" data-delay="2">{featuredProject.description}</p>
            ) : null}
            <div className="case-stats rev" data-delay="3">
              {content.stats.map((stat, i) => (
                <div key={`${stat.label}-${i}`}>
                  <div className="case-stat-n">
                    {stat.value}
                    {stat.suffix ? (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '.4em', color: 'var(--ink-3)', letterSpacing: '.04em' }}>
                        &nbsp;{stat.suffix}
                      </span>
                    ) : null}
                  </div>
                  <div className="case-stat-l">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="case-fig rev" data-delay="2">
            <div className="case-fig-canvas">
              <SideViewThumbnail projectIdx={activeIdx} />
            </div>
            <div className="case-fig-footer">
              <span className="case-fig-label">
                {projects[activeIdx]?.code ?? `MBD-00${activeIdx + 1}`} · elevation
              </span>
              <div className="csw-btns">
                {projects.map((p, i) => (
                  <button
                    key={p.code}
                    className={`csw-btn${activeIdx === i ? ' active' : ''}`}
                    onClick={() => setActiveIdx(i)}
                    aria-label={`View ${p.name}`}
                  >
                    {p.code.replace('-', ' — ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
