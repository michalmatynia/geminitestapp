import type { Metadata } from 'next';
import type { JSX } from 'react';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Values & Craft — ARCANA',
  description: "ARCANA's commitment to materials, makers, and the objects that endure.",
};

const MATERIALS = [
  {
    name: 'Belgian Linen',
    origin: 'Ghent, Belgium',
    gradient: 'linear-gradient(145deg, #e8ddd0 0%, #c8b8a2 60%, #a89880 100%)',
    text: '#2a1f17',
    desc: 'Stone-washed in small batches. No bleach, no optical brighteners. The flax is retted in river water according to a process unchanged for 400 years.',
  },
  {
    name: 'Vegetable Leather',
    origin: 'Périgord, France',
    gradient: 'linear-gradient(145deg, #8b5530 0%, #5c3318 55%, #3a1e0a 100%)',
    text: '#f5e0c8',
    desc: 'Tanned with oak bark over 12 months. No chrome salts. The leather develops its own character — we consider each bag finished when you do.',
  },
  {
    name: 'Shetland Wool',
    origin: 'Outer Hebrides, Scotland',
    gradient: 'linear-gradient(145deg, #c0b09a 0%, #907b64 55%, #685848 100%)',
    text: '#f5ede5',
    desc: 'Undyed and unwashed beyond a cold-water rinse. The natural lanolin remains. Spun on century-old jacquard looms on the island of Harris.',
  },
  {
    name: 'Stoneware Clay',
    origin: 'Limoges, France',
    gradient: 'linear-gradient(145deg, #c4a882 0%, #9a7c5a 55%, #6a5038 100%)',
    text: '#f0e5d5',
    desc: 'Hand-thrown by three ceramicists working in independent studios. Natural ash glazes only. No two pieces are identical — each carries the maker\'s touch in the clay.',
  },
  {
    name: 'Carrara Marble',
    origin: 'Tuscany, Italy',
    gradient: 'linear-gradient(145deg, #f0efea 0%, #d8d5ce 50%, #bbb8b0 100%)',
    text: '#1a1816',
    desc: 'Quarried by a family in its fourth generation. Carved by hand rather than machine-routed. The veining in every piece is the record of millions of years underground.',
  },
  {
    name: 'Black Walnut',
    origin: 'Danish workshop, American timber',
    gradient: 'linear-gradient(145deg, #5c3d2a 0%, #3e2618 55%, #261510 100%)',
    text: '#f5e8c8',
    desc: 'Sourced from FSC-certified forests. Dried for two years before milling. Finished with food-safe hard oil — three coats, each hand-rubbed before the next is applied.',
  },
];

const COMMITMENTS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'No seasonal collections',
    body: 'We release objects when they are ready, not when the calendar demands it. No fashion weeks, no trend cycles. Each piece is designed to remain relevant indefinitely.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Direct artisan relationships',
    body: 'Every maker we work with is named and paid fairly above market rate. We visit each studio at least once per year. Our margins are lower as a result — we consider this correct.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    title: 'Carbon offset on every shipment',
    body: 'We partner with Pachama to offset the carbon footprint of every delivery. Shipping boxes are recycled paper with water-based inks. We use no plastic in our packaging.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: 'Lifetime repair programme',
    body: 'We will repair any ARCANA object for the lifetime of the owner at cost price. A broken clasp, a worn sole, a chipped glaze — send it back. We will make it right.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: 'No paid advertising',
    body: 'We do not run paid social media or influencer campaigns. Every customer who finds ARCANA does so through editorial coverage, word of mouth, or the objects themselves.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    title: 'B-Corp certification in progress',
    body: 'We began our B-Corp certification process in January 2026. Our current score is 84.2 — the certification threshold is 80. We expect full certification by Q4 2026.',
  },
];

export default function ValuesPage(): JSX.Element {
  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)' }}>

        {/* ── Dark hero ─────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #0d0b08 0%, #141008 60%, #0a0908 100%)', minHeight: '70vh' }}
        >
          {/* Outlined watermark */}
          <div
            className="absolute inset-0 flex items-center justify-end pr-8 md:pr-16 pointer-events-none select-none"
            aria-hidden="true"
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(5rem, 18vw, 18rem)',
                fontWeight: 300,
                color: 'transparent',
                WebkitTextStroke: '1px rgba(255,255,255,0.04)',
                lineHeight: 1,
                letterSpacing: '-0.04em',
              }}
            >
              Values
            </span>
          </div>

          <div className="relative z-10 px-8 md:px-16 py-24 md:py-32 max-w-screen-2xl mx-auto flex flex-col justify-end" style={{ minHeight: '70vh' }}>
            <div
              className="type-label mb-4"
              style={{ color: 'rgba(180,140,80,0.8)', letterSpacing: '0.18em' }}
            >
              How we work
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.5rem, 7vw, 6rem)',
                fontWeight: 300,
                color: '#f5f0eb',
                lineHeight: 1.0,
                letterSpacing: '-0.02em',
                maxWidth: '700px',
                marginBottom: '1.5rem',
              }}
            >
              Objects are not made.<br />They are earned.
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                fontWeight: 300,
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.85,
                maxWidth: '480px',
              }}
            >
              Every material has a provenance. Every maker has a name. Every object
              we sell should outlast the season — and the decade — it was made in.
            </p>
          </div>
        </div>

        {/* ── Stats bar ─────────────────────────────────────────────── */}
        <div
          className="grid grid-cols-2 md:grid-cols-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {[
            { value: '8', label: 'Maker studios' },
            { value: '5', label: 'Countries of origin' },
            { value: '100%', label: 'Natural materials' },
            { value: '∞', label: 'Repair guarantee' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="px-8 md:px-12 py-10 text-center"
              style={{ borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                  fontWeight: 300,
                  color: 'var(--fg)',
                  lineHeight: 1,
                  marginBottom: '0.5rem',
                }}
              >
                {stat.value}
              </div>
              <div className="type-label" style={{ color: 'var(--muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Materials ─────────────────────────────────────────────── */}
        <div className="px-8 md:px-16 py-20">
          <div className="max-w-screen-2xl mx-auto">
            <div className="mb-12">
              <div className="type-label mb-3" style={{ color: 'var(--accent)' }}>What we use</div>
              <h2 className="type-display-lg" style={{ color: 'var(--fg)' }}>
                The materials
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {MATERIALS.map((mat) => (
                <div key={mat.name} className="group">
                  <div
                    className="relative overflow-hidden mb-5 grain"
                    style={{ aspectRatio: '4/3', background: mat.gradient }}
                  >
                    <div className="absolute inset-0 flex flex-col justify-end p-6">
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.5rem',
                          fontWeight: 300,
                          color: mat.text,
                          lineHeight: 1.1,
                          marginBottom: '0.25rem',
                        }}
                      >
                        {mat.name}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.62rem',
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                          color: mat.text,
                          opacity: 0.55,
                        }}
                      >
                        {mat.origin}
                      </div>
                    </div>
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.875rem',
                      fontWeight: 300,
                      color: 'var(--muted)',
                      lineHeight: 1.85,
                    }}
                  >
                    {mat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Commitments ───────────────────────────────────────────── */}
        <div
          className="px-8 md:px-16 py-20"
          style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
        >
          <div className="max-w-screen-2xl mx-auto">
            <div className="mb-12">
              <div className="type-label mb-3" style={{ color: 'var(--accent)' }}>Our commitments</div>
              <h2 className="type-display-lg" style={{ color: 'var(--fg)' }}>
                How we operate
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
              {COMMITMENTS.map((c) => (
                <div key={c.title}>
                  <div
                    className="w-10 h-10 flex items-center justify-center mb-5"
                    style={{ border: '1px solid var(--border)', color: 'var(--accent)' }}
                  >
                    {c.icon}
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.15rem',
                      fontWeight: 300,
                      color: 'var(--fg)',
                      lineHeight: 1.2,
                      marginBottom: '0.75rem',
                    }}
                  >
                    {c.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.875rem',
                      fontWeight: 300,
                      color: 'var(--muted)',
                      lineHeight: 1.85,
                    }}
                  >
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Manifesto closing ─────────────────────────────────────── */}
        <div
          className="relative overflow-hidden px-8 md:px-16 py-24 text-center"
          style={{ background: 'linear-gradient(160deg, #0d0b08 0%, #0a0908 100%)' }}
        >
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 4vw, 3.5rem)',
              fontWeight: 300,
              color: '#f5f0eb',
              lineHeight: 1.2,
              fontStyle: 'italic',
              maxWidth: '700px',
              margin: '0 auto 2.5rem',
            }}
          >
            &ldquo;The best objects are the ones that ask nothing of you —
            they simply endure.&rdquo;
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="/about" className="type-label flex items-center gap-2 transition-all duration-200 hover:gap-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Meet our makers
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <a href="/" className="type-label flex items-center gap-2 transition-all duration-200 hover:gap-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Shop the collection
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>

      </main>
      <SiteFooter />
    </>
  );
}
