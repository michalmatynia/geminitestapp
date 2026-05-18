import { memo } from 'react';
import type { ArchPageContent, Project } from '@/lib/types';
import { renderEmphasis } from '@/lib/renderEmphasis';
import IsometricThumbnail from './IsometricThumbnail';

const FALLBACK_PROJECTS: Pick<Project, 'code' | 'name' | 'projectType' | 'city'>[] = [
  { code: 'MBD-001', name: 'Helios Tower', projectType: 'Mixed-Use Tower', city: 'Zurich' },
  { code: 'MBD-002', name: 'Kulturhaus', projectType: 'Cultural Centre', city: 'Amsterdam' },
  { code: 'MBD-003', name: 'South Quarter', projectType: 'Residential Ensemble', city: 'Berlin' },
];

function BuiltWork({
  content,
  projects,
}: {
  content: ArchPageContent['projects'];
  projects: Project[];
}) {
  const displayProjects = projects.length > 0 ? projects : FALLBACK_PROJECTS;

  return (
    <section id="projects" className="projects-section projects-dark">
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

        <div className="projects-grid">
          {displayProjects.map((project, i) => (
            <a key={project.code} href="#" className="project-card rev" data-delay={i > 0 ? String(i) : undefined}>
              <div className="project-frame">
                <IsometricThumbnail
                  projectIdx={i}
                  modelUrl={'modelUrl' in project ? (project as Project).modelUrl : undefined}
                  viewMode={content.projectsViewMode}
                />
              </div>
              <div className="project-meta">
                <span className="project-num">
                  {project.code.replace('-', ' — ')} / 2024
                </span>
                <div className="project-name">
                  {project.name}
                  <em>{project.projectType.toLowerCase()}</em>
                </div>
                <span className="project-loc">{project.city}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default memo(BuiltWork);
