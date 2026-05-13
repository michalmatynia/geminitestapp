'use client';

import { useEffect } from 'react';

export default function GSAPInit() {
  useEffect(() => {
    /* ── Scroll reveal — robust against iframe IO quirks ── */
    const revs = Array.from(document.querySelectorAll<HTMLElement>('.rev'));
    if (!revs.length) return;

    const vh = () => window.innerHeight || document.documentElement.clientHeight;

    const revealInView = () => {
      revs.forEach(el => {
        if (el.classList.contains('in')) return;
        const r = el.getBoundingClientRect();
        if (r.top < vh() * 0.95) el.classList.add('in');
      });
    };

    revealInView();
    requestAnimationFrame(revealInView);
    setTimeout(revealInView, 80);
    setTimeout(revealInView, 400);

    let io: IntersectionObserver | undefined;
    try {
      io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add('in'); io?.unobserve(e.target); }
        });
      }, { threshold: .12, rootMargin: '0px 0px -60px 0px' });
      revs.forEach(el => { if (!el.classList.contains('in')) io?.observe(el); });
    } catch { /* fall back to scroll handler */ }

    const onScrollReveal = () => revealInView();
    document.addEventListener('scroll', onScrollReveal, { passive: true });
    window.addEventListener('resize', onScrollReveal);

    /* ── Floor plan draw on scroll ── */
    const planWrap = document.getElementById('planWrap');
    if (planWrap) {
      const trigger = () => {
        planWrap.querySelectorAll('.plan-stroke').forEach(s => s.classList.add('in'));
        setTimeout(() => planWrap.querySelectorAll('.plan-inner-line').forEach(s => s.classList.add('in')), 400);
      };
      try {
        const planIo = new IntersectionObserver(entries => {
          entries.forEach(e => { if (e.isIntersecting) { trigger(); planIo.unobserve(planWrap); } });
        }, { threshold: .25 });
        planIo.observe(planWrap);
      } catch { trigger(); }
      setTimeout(() => {
        const r = planWrap.getBoundingClientRect();
        if (r.top < (window.innerHeight || 0) * 0.9) trigger();
      }, 300);
    }

    /* ── Metric counters ── */
    document.querySelectorAll<HTMLElement>('.counter').forEach(el => {
      const target = +(el.dataset.target ?? 0);
      let started = false;
      const runCounter = () => {
        if (started) return;
        started = true;
        const start = performance.now();
        const duration = 1800;
        const step = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          el.textContent = String(Math.round(ease * target));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      try {
        const cIo = new IntersectionObserver(entries => {
          entries.forEach(e => { if (e.isIntersecting) { runCounter(); cIo.unobserve(el); } });
        }, { threshold: .4 });
        cIo.observe(el);
      } catch { runCounter(); }
    });

    /* ── Nav scroll state ── */
    const nav = document.getElementById('topnav');
    if (nav) {
      const onNavScroll = () => {
        if (window.scrollY > 30) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
      };
      document.addEventListener('scroll', onNavScroll, { passive: true });
      onNavScroll();
    }

    /* ── Smooth scroll ── */
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const href = a.getAttribute('href');
        if (!href || href === '#') return;
        const t = document.querySelector(href);
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
      });
    });

    return () => {
      document.removeEventListener('scroll', onScrollReveal);
      window.removeEventListener('resize', onScrollReveal);
    };
  }, []);

  return null;
}
