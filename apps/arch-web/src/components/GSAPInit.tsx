'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const EASE = 'power3.out';

/* Elements with dedicated section animations — excluded from the generic fade-up batch */
const CUSTOM = ['.meta-rev', '.project-card', '.proc-cell', '.metric-cell', '.phil-figure', '.case-fig', '.prin-row', 'h2'];
const BATCH_SEL = CUSTOM.reduce((s, c) => `${s}:not(${c})`, '.rev');

/* ── Word-split utility ──────────────────────────────────────────────────── */
function splitIntoWordSpans(el: HTMLElement): HTMLSpanElement[] {
  const words: HTMLSpanElement[] = [];
  const nodes = Array.from(el.childNodes);
  el.innerHTML = '';

  nodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const tokens = (node.textContent ?? '').split(/(\s+)/);
      tokens.forEach((token) => {
        if (/\S/.test(token)) {
          const span = document.createElement('span');
          span.style.cssText = 'display:inline-block;will-change:transform,opacity;';
          span.textContent = token;
          el.appendChild(span);
          words.push(span);
        } else if (token) {
          el.appendChild(document.createTextNode(token));
        }
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const wrapper = document.createElement('span');
      wrapper.style.cssText = 'display:inline-block;will-change:transform,opacity;';
      wrapper.appendChild((node as Element).cloneNode(true));
      if (el.hasChildNodes()) el.appendChild(document.createTextNode(' '));
      el.appendChild(wrapper);
      words.push(wrapper);
    }
  });

  return words;
}

export default function GSAPInit() {
  useEffect(() => {
    let navScrollHandler: (() => void) | null = null;
    const injectedEls: HTMLElement[] = [];
    const splitH2s: Array<{ el: HTMLElement; original: string }> = [];

    const ctx = gsap.context(() => {
      const metaTexts = gsap.utils.toArray<HTMLElement>(
        '.sec-head-meta .num.rev, .sec-head-meta .label.rev, .phil-text > .label.rev'
      );
      metaTexts.forEach((el) => el.classList.add('meta-rev'));

      // ── 1. NAV ENTRANCE ──────────────────────────────────────────────
      const nav = document.getElementById('topnav');
      if (nav) {
        gsap.from(nav, {
          y: -72, opacity: 0, duration: 0.95, ease: EASE, delay: 0.1,
          clearProps: 'transform,opacity',
        });
        navScrollHandler = () => nav.classList.toggle('scrolled', window.scrollY > 30);
        document.addEventListener('scroll', navScrollHandler, { passive: true });
        navScrollHandler();
      }

      // ── 2. GENERIC BATCH FADE-UP ─────────────────────────────────────
      // Handles all .rev elements not covered by dedicated section animations
      ScrollTrigger.batch(BATCH_SEL, {
        onEnter: (batch) =>
          gsap.fromTo(
            batch,
            { opacity: 0, y: 22 },
            { opacity: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.07 }
          ),
        start: 'top 91%',
        once: true,
      });

      // ── 3. SECTION HEADINGS — WORD-SPLIT 3D REVEAL ───────────────────
      document.querySelectorAll<HTMLElement>('h2.rev').forEach((h2) => {
        if (h2.dataset.split) return;
        h2.dataset.split = '1';
        const original = h2.innerHTML;
        splitH2s.push({ el: h2, original });

        gsap.set(h2, { perspective: 500 });
        const words = splitIntoWordSpans(h2);
        if (!words.length) return;

        // Words start hidden via CSS opacity:0 on h2 — set word initial transform state
        gsap.set(words, { opacity: 0, y: 40, rotateX: -16 });

        ScrollTrigger.create({
          trigger: h2,
          start: 'top 88%',
          once: true,
          onEnter: () => {
            gsap.set(h2, { opacity: 1 }); // reveal h2 shell instantly
            gsap.to(words, {
              opacity: 1, y: 0, rotateX: 0,
              duration: 1.05, ease: 'power3.out', stagger: 0.055,
            });
          },
        });
      });

      // ── 4. SECTION META — QUIET STAGGER ──────────────────────────────
      // Section numbers and labels should read cleanly, without competing effects.
      gsap.set(metaTexts, { opacity: 0, y: 12 });
      gsap.utils.toArray<HTMLElement>('.sec-head-meta, .phil-text').forEach((container) => {
        const items = Array.from(container.querySelectorAll<HTMLElement>('.meta-rev'));
        if (!items.length) return;
        gsap.to(items, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: EASE,
          stagger: 0.08,
          scrollTrigger: {
            trigger: container.closest('section') ?? container,
            start: 'top 84%',
            once: true,
          },
        });
      });

      // ── 5. SECTION ACCENT RULE ───────────────────────────────────────
      // Thin accent line draws in from left before each section header
      document.querySelectorAll<HTMLElement>('.sec-head-meta').forEach((meta) => {
        const rule = document.createElement('span');
        rule.style.cssText = [
          'display:block', 'height:1px', 'width:28px',
          'background:var(--accent)', 'transform-origin:left center',
          'margin-bottom:12px', 'flex-shrink:0',
        ].join(';');
        gsap.set(rule, { scaleX: 0 });
        meta.prepend(rule);
        injectedEls.push(rule);

        ScrollTrigger.create({
          trigger: meta, start: 'top 90%', once: true,
          onEnter: () => gsap.to(rule, { scaleX: 1, duration: 0.62, ease: 'power3.inOut' }),
        });
      });

      // ── 6. HERO PARALLAX ─────────────────────────────────────────────
      const heroCanvas = document.getElementById('hero-canvas');
      if (heroCanvas) {
        gsap.to(heroCanvas, {
          y: '-22%', ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.4 },
        });
      }
      const heroInner = document.querySelector('.hero-inner');
      if (heroInner) {
        gsap.to(heroInner, {
          y: '8%', ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 2 },
        });
      }

      // ── 7. PHILOSOPHY FIGURE — SLOW SCAN REVEAL ──────────────────────
      // Top-down wipe (inset from bottom recedes) with gentle inOut ease —
      // avoids the abrupt "zoom" impression of a fast upward wipe.
      const philFig = document.querySelector('.phil-figure.rev');
      if (philFig) {
        gsap.fromTo(
          philFig,
          { clipPath: 'inset(0 0 100% 0)' },
          {
            clipPath: 'inset(0 0 0% 0)', opacity: 1,
            duration: 1.9, ease: 'power2.inOut',
            scrollTrigger: { trigger: philFig, start: 'top 82%', once: true },
          }
        );
      }

      // ── 8. PRINCIPLE ROWS — CASCADED SUB-ELEMENT STAGGER ─────────────
      // num slides from left → title rises → desc rises, row-by-row
      const prinRows = gsap.utils.toArray<HTMLElement>('.prin-row');
      if (prinRows.length) {
        prinRows.forEach((row) => {
          gsap.set(row.querySelectorAll('.prin-num, .prin-title, .prin-desc'), { opacity: 0 });
        });
        ScrollTrigger.create({
          trigger: '.principles', start: 'top 82%', once: true,
          onEnter: () => {
            prinRows.forEach((row, i) => {
              const delay = i * 0.14;
              gsap.to(row, { opacity: 1, duration: 0.01, delay });
              const num = row.querySelector('.prin-num');
              const title = row.querySelector('.prin-title');
              const desc = row.querySelector('.prin-desc');
              if (num) gsap.fromTo(num, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.5, ease: EASE, delay });
              if (title) gsap.fromTo(title, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.68, ease: EASE, delay: delay + 0.1 });
              if (desc) gsap.fromTo(desc, { opacity: 0, y: 13 }, { opacity: 1, y: 0, duration: 0.62, ease: EASE, delay: delay + 0.18 });
            });
          },
        });
      }

      // ── 9. SERVICES ROWS — HORIZONTAL STAGGER ────────────────────────
      const practiceRows = gsap.utils.toArray<HTMLElement>('.practice-row');
      if (practiceRows.length) {
        gsap.fromTo(
          practiceRows,
          { x: -20, opacity: 0 },
          {
            x: 0, opacity: 1, duration: 0.78, ease: EASE, stagger: 0.09,
            scrollTrigger: { trigger: '.practice-list', start: 'top 82%', once: true },
          }
        );
      }

      // ── 10. PROJECT CARDS — RISE + DARK CURTAIN REVEAL ───────────────
      const projectCards = gsap.utils.toArray<HTMLElement>('.project-card.rev');
      if (projectCards.length) {
        const curtains: HTMLElement[] = [];
        const metas: Element[] = [];
        projectCards.forEach((card) => {
          const frame = card.querySelector<HTMLElement>('.project-frame, .project-frame-3d');
          const meta = card.querySelector('.project-meta');
          if (meta) metas.push(meta);
          if (frame) {
            const curtain = document.createElement('span');
            curtain.className = 'project-reveal-curtain';
            curtain.style.cssText = [
              'position:absolute', 'inset:0', 'background:var(--ink)',
              'z-index:3', 'transform-origin:right center', 'pointer-events:none',
            ].join(';');
            frame.appendChild(curtain);
            curtains.push(curtain);
            injectedEls.push(curtain);
          }
        });
        gsap.set(curtains, { scaleX: 1 });
        gsap.set(metas, { opacity: 0, y: 16 });

        const projectsTimeline = gsap.timeline({
          scrollTrigger: { trigger: '.projects-grid', start: 'top 82%', once: true },
        });
        projectsTimeline
          .fromTo(
            projectCards,
            { opacity: 0, y: 54, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 1.05, ease: EASE, stagger: 0.13 }
          )
          .to(
            curtains,
            { scaleX: 0, duration: 0.84, ease: 'power3.inOut', stagger: 0.13 },
            '<0.34'
          )
          .to(
            metas,
            { opacity: 1, y: 0, duration: 0.7, ease: EASE, stagger: 0.13 },
            '<0.22'
          );
      }

      // ── 11. PROCESS CELLS + SVG GLYPH DRAW ───────────────────────────
      const procCells = gsap.utils.toArray<HTMLElement>('.proc-cell.rev');
      if (procCells.length) {
        gsap.fromTo(
          procCells,
          { opacity: 0, y: 32 },
          {
            opacity: 1, y: 0, duration: 0.85, ease: EASE, stagger: 0.1,
            scrollTrigger: { trigger: '.proc-grid', start: 'top 82%', once: true },
          }
        );

        // Architectural glyphs draw in via stroke-dashoffset
        document.querySelectorAll<SVGGeometryElement>('.proc-glyph .g').forEach((shape, i) => {
          try {
            const len = shape.getTotalLength();
            gsap.set(shape, { strokeDasharray: len, strokeDashoffset: len });
            gsap.to(shape, {
              strokeDashoffset: 0,
              duration: 0.74, ease: 'power2.out',
              delay: Math.floor(i / 2) * 0.1 + 0.42,
              scrollTrigger: { trigger: '.proc-grid', start: 'top 82%', once: true },
            });
          } catch { /* non-geometry element */ }
        });
      }

      // ── 12. METRICS — CENTER-OUT STAGGER + COUNTERS ───────────────────
      const metricCells = gsap.utils.toArray<HTMLElement>('.metric-cell.rev');
      if (metricCells.length) {
        gsap.fromTo(
          metricCells,
          { opacity: 0, y: 22 },
          {
            opacity: 1, y: 0, duration: 0.8, ease: EASE,
            stagger: { each: 0.1, from: 'center' },
            scrollTrigger: { trigger: '.metric-grid', start: 'top 82%', once: true },
          }
        );
      }

      document.querySelectorAll<HTMLElement>('.counter').forEach((el) => {
        const target = +(el.dataset.target ?? 0);
        const proxy = { val: 0 };
        gsap.to(proxy, {
          val: target, duration: 2.2, ease: 'power3.out', roundProps: 'val',
          onUpdate: () => { el.textContent = String(proxy.val); },
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        });
      });

      // ── 13. CASE STUDY FIGURE — WIPE UP REVEAL ───────────────────────
      const caseFig = document.querySelector('.case-fig.rev');
      if (caseFig) {
        gsap.fromTo(
          caseFig,
          { clipPath: 'inset(100% 0 0 0)' },
          {
            clipPath: 'inset(0% 0 0 0)', opacity: 1,
            duration: 1.25, ease: 'power4.out',
            scrollTrigger: { trigger: caseFig, start: 'top 85%', once: true },
          }
        );
      }

      // ── 14. QUOTE — PARALLAX SCRUB ───────────────────────────────────
      const quoteBlock = document.querySelector('.quote-sec blockquote');
      if (quoteBlock) {
        gsap.fromTo(
          quoteBlock,
          { y: 48 },
          {
            y: -40, ease: 'none',
            scrollTrigger: {
              trigger: '.quote-sec',
              start: 'top bottom', end: 'bottom top',
              scrub: 2.2,
            },
          }
        );
      }

      // ── 15. FOOTER COLUMNS — STAGGER RISE ────────────────────────────
      const footItems = gsap.utils.toArray<HTMLElement>('.foot-brand, .foot-col');
      if (footItems.length) {
        gsap.fromTo(
          footItems,
          { opacity: 0, y: 26 },
          {
            opacity: 1, y: 0, duration: 0.82, ease: EASE, stagger: 0.09,
            scrollTrigger: { trigger: 'footer', start: 'top 88%', once: true },
          }
        );
      }

      // ── 16. SMOOTH SCROLL ─────────────────────────────────────────────
      document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
          const href = a.getAttribute('href');
          if (!href || href === '#') return;
          const t = document.querySelector(href);
          if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
        });
      });

      // ── 17. FLOOR PLAN SVG DRAW ───────────────────────────────────────
      const planWrap = document.getElementById('planWrap');
      if (planWrap) {
        ScrollTrigger.create({
          trigger: planWrap, start: 'top 75%', once: true,
          onEnter: () => {
            planWrap.querySelectorAll('.plan-stroke').forEach((s) => s.classList.add('in'));
            setTimeout(() => {
              planWrap.querySelectorAll('.plan-inner-line').forEach((s) => s.classList.add('in'));
            }, 400);
          },
        });
      }

    });

    return () => {
      ctx.revert();
      if (navScrollHandler) document.removeEventListener('scroll', navScrollHandler);
      injectedEls.forEach((el) => el.remove());
      splitH2s.forEach(({ el, original }) => {
        el.innerHTML = original;
        delete el.dataset.split;
      });
    };
  }, []);

  return null;
}
