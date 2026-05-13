'use client';

import { useEffect } from 'react';

export default function Nav() {
  useEffect(() => {
    const nav = document.getElementById('topnav');
    if (!nav) return;
    const onScroll = () => {
      if (window.scrollY > 30) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => document.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className="top" id="topnav">
      <div className="nav-row">
        <a href="#" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Milk Bar Designers</span>
          <span className="brand-sub">/ est. Amsterdam</span>
        </a>
        <div className="nav-links">
          <a href="#practice">practice</a>
          <a href="#projects">projects</a>
          <a href="#process">process</a>
          <a href="#studio">studio</a>
        </div>
        <a href="#contact" className="nav-cta">
          <span>enquire</span>
          <span className="arrow" aria-hidden="true" />
        </a>
      </div>
    </nav>
  );
}
