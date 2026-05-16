'use client';

import type { ArchPageContent } from '@/lib/types';
import HeroCanvas from './HeroCanvas';

export default function Hero({
  content,
  modelUrl,
}: {
  content: ArchPageContent['hero'];
  modelUrl?: string;
}) {
  return (
    <header className="hero">
      <HeroCanvas modelUrl={modelUrl} />
      <div className="wrap hero-inner">
        <div className="hero-meta rev">
          <span><span className="dot" />&thinsp;{content.location}</span>
          <span>{content.indexLabel}</span>
        </div>

        <h1 className="hero-h" id="heroH">
          {content.titleLines.map((line, index) => (
            <span key={`${line}-${index}`}>
              <span className="word" style={{ animationDelay: `${0.2 + index * 0.14}s` }}>
                {index >= content.titleLines.length - 2 ? <em>{line}</em> : line}
              </span>
              {index < content.titleLines.length - 1 ? <br /> : null}
            </span>
          ))}
        </h1>

        <div className="hero-foot rev" data-delay="3">
          <p className="hero-lede">
            {content.lede}
          </p>
          <div className="hero-actions">
            <a href="#practice" className="btn-ink">
              <span>{content.primaryCtaLabel}</span>
              <span style={{ position: 'relative', width: '28px', height: '1px', background: 'currentColor', display: 'inline-block' }}>
                <span style={{ position: 'absolute', right: 0, top: '-3px', width: '7px', height: '7px', borderTop: '1px solid currentColor', borderRight: '1px solid currentColor', transform: 'rotate(45deg)', display: 'block' }} />
              </span>
            </a>
            <a href="#projects" className="btn-quiet">{content.secondaryCtaLabel} ↘</a>
          </div>
        </div>
      </div>
    </header>
  );
}
