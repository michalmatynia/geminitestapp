'use client';

import { useState } from 'react';
import type { Project } from '@/lib/types';
import SideViewThumbnail from './SideViewThumbnail';

const MODELS = [
  { code: 'MBD-001', name: 'Helios Tower' },
  { code: 'MBD-002', name: 'Kulturhaus' },
  { code: 'MBD-003', name: 'South Quarter' },
];

export default function CaseStudies({ projects }: { projects: Project[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const helios = projects.find(p => p.code === 'MBD-001');

  return (
    <section className="case">
      <div className="wrap">
        <div className="sec-head">
          <div className="sec-head-meta">
            <span className="num rev">— 06 / case study</span>
            <span className="label rev" data-delay="1" style={{ color: 'var(--ink-3)' }}>helios tower</span>
          </div>
          <h2 className="rev" data-delay="1">Compliance <em>at scale.</em></h2>
        </div>

        <div className="case-grid">
          <div className="case-copy">
            <h3 className="rev">
              Six thousand drawings<em>verified in three hours.</em>
            </h3>
            <p className="rev" data-delay="1">
              A thirty-two-storey mixed-use development in Zurich required simultaneous compliance
              with Swiss federal, cantonal, and municipal building codes — three concurrent regulatory frames.
            </p>
            <p className="rev" data-delay="2">
              {helios?.description ?? 'Our compliance system processed 6,400 sheets across the documentation set in three hours. The equivalent peer-review by a five-person team would have taken just over two months.'}
            </p>
            <div className="case-stats rev" data-delay="3">
              <div>
                <div className="case-stat-n">6,400</div>
                <div className="case-stat-l">drawings audited</div>
              </div>
              <div>
                <div className="case-stat-n">3<span style={{ fontFamily: 'var(--mono)', fontSize: '.4em', color: 'var(--ink-3)', letterSpacing: '.04em' }}>&nbsp;hrs</span></div>
                <div className="case-stat-l">processing time</div>
              </div>
              <div>
                <div className="case-stat-n">0</div>
                <div className="case-stat-l">missed clauses</div>
              </div>
              <div>
                <div className="case-stat-n">2.1<span style={{ fontFamily: 'var(--mono)', fontSize: '.4em', color: 'var(--ink-3)', letterSpacing: '.04em' }}>&nbsp;mo</span></div>
                <div className="case-stat-l">manual equivalent</div>
              </div>
            </div>
          </div>

          <div className="case-fig rev" data-delay="2">
            <div className="case-fig-canvas">
              <SideViewThumbnail projectIdx={activeIdx} />
            </div>
            <div className="case-fig-footer">
              <span className="case-fig-label">
                {MODELS[activeIdx].code} · elevation
              </span>
              <div className="csw-btns">
                {MODELS.map((m, i) => (
                  <button
                    key={m.code}
                    className={`csw-btn${activeIdx === i ? ' active' : ''}`}
                    onClick={() => setActiveIdx(i)}
                    aria-label={`View ${m.name}`}
                  >
                    {m.code.replace('-', ' — ')}
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
