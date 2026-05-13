'use client';

import dynamic from 'next/dynamic';

const HeroCanvas = dynamic(() => import('./HeroCanvas'), { ssr: false });

export default function Hero() {
  return (
    <header className="hero">
      <HeroCanvas />
      <div className="wrap hero-inner">
        <div className="hero-meta rev">
          <span><span className="dot" />&thinsp;Amsterdam · London · Zurich</span>
          <span>Index — MMXXV</span>
        </div>

        <h1 className="hero-h" id="heroH">
          <span className="word" style={{ animationDelay: '.20s' }}>Architecture</span>{' '}
          <span className="word" style={{ animationDelay: '.32s' }}>drawn</span>
          <br />
          <span className="word" style={{ animationDelay: '.44s' }}>with</span>{' '}
          <span className="word" style={{ animationDelay: '.56s' }}><em>quiet</em></span>
          <br />
          <span className="word" style={{ animationDelay: '.70s' }}><em>intelligence.</em></span>
        </h1>

        <div className="hero-foot rev" data-delay="3">
          <p className="hero-lede">
            A small studio working at the seam between architecture and machine learning —
            automating the administrative so practice returns to the <em>considered drawing</em>.
          </p>
          <div className="hero-actions">
            <a href="#practice" className="btn-ink">
              <span>see the practice</span>
              <span style={{ position: 'relative', width: '28px', height: '1px', background: 'currentColor', display: 'inline-block' }}>
                <span style={{ position: 'absolute', right: 0, top: '-3px', width: '7px', height: '7px', borderTop: '1px solid currentColor', borderRight: '1px solid currentColor', transform: 'rotate(45deg)', display: 'block' }} />
              </span>
            </a>
            <a href="#projects" className="btn-quiet">selected projects ↘</a>
          </div>
        </div>
      </div>
    </header>
  );
}
