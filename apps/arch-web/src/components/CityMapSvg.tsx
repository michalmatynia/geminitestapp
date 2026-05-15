'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const W = 800, H = 600;
const MIN_Z = 1, MAX_Z = 6;
const PX = W / 2, PY = H / 2;

// ── RNG ──────────────────────────────────────────────────────────
class Rand {
  private s: number;
  constructor(seed: number) { this.s = seed; }
  n()                       { this.s = (this.s * 16807) % 2147483647; return (this.s - 1) / 2147483646; }
  r(lo: number, hi: number) { return lo + this.n() * (hi - lo); }
}

// ── Geometry ──────────────────────────────────────────────────────
type Pt = [number, number];

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

function distToPoly(px: number, py: number, pts: Pt[]): number {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++)
    d = Math.min(d, distToSeg(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  return d;
}

function inLakeEllipse(px: number, py: number): boolean {
  const lx = (px - 678) / 138, ly = (py - 484) / 118;
  return lx * lx + ly * ly < 1;
}

// ── Road data ─────────────────────────────────────────────────────
interface Road { pts: Pt[]; w: number; }

// Major boulevards — slight organic drift
const MAJOR: Road[] = [
  { pts: [[250,0],[253,85],[247,170],[255,255],[249,340],[257,425],[251,510],[255,600]], w: 10 },
  { pts: [[0,220],[85,217],[200,221],[335,218],[468,223],[600,219],[720,224],[800,221]], w: 9 },
  // Haussmann diagonal NW→SE
  { pts: [[0,158],[65,188],[138,221],[215,270],[308,334],[400,398],[492,462],[578,524],[658,578],[728,600]], w: 7.5 },
];

// Secondary streets
const SECONDARY: Road[] = [
  { pts: [[72,0],[70,158],[74,220],[70,300],[74,462],[70,600]], w: 5 },
  { pts: [[150,0],[148,158],[152,600]], w: 4.5 },
  { pts: [[352,0],[350,158],[354,220],[352,600]], w: 5 },
  { pts: [[458,0],[456,220],[460,384]], w: 4.5 },
  { pts: [[592,0],[590,220],[596,388]], w: 5 },
  { pts: [[702,0],[700,220],[706,382]], w: 4.5 },
  { pts: [[0,78],[252,75],[800,80]], w: 4.5 },
  { pts: [[0,150],[252,147],[800,153]], w: 4 },
  { pts: [[0,298],[252,295],[800,301]], w: 4.5 },
  { pts: [[0,382],[252,379],[565,375]], w: 4 },
  { pts: [[0,465],[252,462],[550,458]], w: 4.5 },
  { pts: [[0,550],[252,547],[538,542]], w: 4 },
];

// Minor organic streets
const MINOR: Road[] = [
  { pts: [[28,78],[70,102],[72,150]], w: 3 },
  { pts: [[150,298],[200,322],[250,342],[252,382]], w: 3 },
  { pts: [[352,298],[395,312],[458,298]], w: 2.5 },
  { pts: [[592,298],[642,292],[702,298]], w: 2.5 },
  { pts: [[150,465],[202,458],[252,465]], w: 3 },
  { pts: [[352,465],[402,458],[458,465]], w: 2.5 },
  { pts: [[72,382],[102,424],[70,465]], w: 2.5 },
  { pts: [[0,424],[42,420],[72,382]], w: 2.5 },
  { pts: [[150,220],[178,242],[202,264],[220,270]], w: 2.5 },
  { pts: [[352,220],[368,232],[384,250],[398,270],[398,298]], w: 2.5 },
  { pts: [[150,150],[150,220]], w: 3 },
  { pts: [[352,150],[458,220]], w: 3 },
  { pts: [[592,150],[592,220]], w: 3 },
  { pts: [[702,78],[702,150]], w: 3 },
];

const ALL_ROADS: Road[] = [...MAJOR, ...SECONDARY, ...MINOR];

// ── Lake ──────────────────────────────────────────────────────────
const LAKE = [
  'M 580 374',
  'C 614 356 658 350 702 365',
  'C 746 378 774 403 792 436',
  'C 802 458 800 494 792 522',
  'C 782 548 764 570 740 582',
  'C 716 594 688 598 662 588',
  'C 632 576 608 554 592 528',
  'C 572 500 558 468 555 442',
  'C 551 416 558 392 570 382 Z',
].join(' ');

// Lake inner highlight path (slightly smaller, offset)
const LAKE_HL = [
  'M 600 395',
  'C 628 382 662 378 696 390',
  'C 730 402 755 424 768 452',
  'C 778 472 776 504 768 526',
  'C 758 548 740 562 720 568 Z',
].join(' ');

// ── Buildings ─────────────────────────────────────────────────────
interface Bldg { x: number; y: number; w: number; h: number; a: number; }

function genBuildings(): Bldg[] {
  const rnd = new Rand(27182);
  const out: Bldg[] = [];
  const STEP = 16;

  for (let gx = 0; gx <= W - STEP; gx += STEP) {
    for (let gy = 0; gy <= H - STEP; gy += STEP) {
      const cx = gx + STEP / 2, cy = gy + STEP / 2;

      // Lake & park exclusion
      if (inLakeEllipse(cx, cy)) continue;
      if (gx >= 350 && gx < 600 && gy >= 0  && gy < 78)  continue; // north park
      if (gx >= 148 && gx < 252 && gy >= 220 && gy < 298) continue; // central square

      // Road clearance
      let onRoad = false;
      for (const road of ALL_ROADS) {
        if (distToPoly(cx, cy, road.pts) < road.w / 2 + 4) { onRoad = true; break; }
      }
      if (onRoad) continue;

      if (rnd.n() > 0.58) continue;

      const bw = STEP * rnd.r(0.30, 0.70);
      const bh = STEP * rnd.r(0.30, 0.70);
      const bx = gx + rnd.r(1, STEP - bw - 1);
      const by = gy + rnd.r(1, STEP - bh - 1);

      const nearMain = MAJOR.some(r => distToPoly(cx, cy, r.pts) < 75);
      const a = rnd.r(nearMain ? 0.28 : 0.18, nearMain ? 0.45 : 0.32);

      out.push({ x: bx, y: by, w: bw, h: bh, a });
    }
  }
  return out;
}

const BLDGS = genBuildings();

function pts2s(pts: Pt[]): string {
  return pts.map(([x, y]) => `${x},${y}`).join(' ');
}

// ── Component ─────────────────────────────────────────────────────
export default function CityMapSvg() {
  const targetRef = useRef(1);
  const [zoom, setZoom]   = useState(1);
  const rafRef  = useRef<number | null>(null);
  const svgRef  = useRef<SVGSVGElement>(null);

  // RAF-based lerp — smooth regardless of wheel event frequency
  const animate = useCallback(() => {
    setZoom(cur => {
      const diff = targetRef.current - cur;
      if (Math.abs(diff) < 0.0006) return targetRef.current;
      rafRef.current = requestAnimationFrame(animate);
      return cur + diff * 0.13;
    });
  }, []);

  const doZoom = useCallback((factor: number) => {
    targetRef.current = Math.max(MIN_Z, Math.min(MAX_Z, targetRef.current * factor));
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
  }, [animate]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      doZoom(e.deltaY < 0 ? 1.18 : 1 / 1.18);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [doZoom]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const tf = `translate(${PX} ${PY}) scale(${zoom}) translate(${-PX} ${-PY})`;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%" height="100%"
        style={{ display: 'block', cursor: 'crosshair' }}
        aria-label="Interactive city map — top view"
      >
        <defs>
          <pattern id="parkDots" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="0.55" fill="rgba(26,25,24,0.22)" />
          </pattern>
        </defs>

        <g transform={tf}>
          {/* Ground */}
          <rect x={0} y={0} width={W} height={H} fill="#EDEBE8" />

          {/* North park */}
          <rect x={350} y={0} width={250} height={78} fill="#E8E6E2" />
          <rect x={350} y={0} width={250} height={78} fill="url(#parkDots)" />
          {/* Central square */}
          <rect x={148} y={220} width={104} height={78} fill="#E8E6E2" />
          <rect x={148} y={220} width={104} height={78} fill="url(#parkDots)" />

          {/* Lake fill */}
          <path d={LAKE} fill="rgba(178,200,218,0.52)" />
          {/* Lake edge */}
          <path d={LAKE} fill="none" stroke="rgba(26,25,24,0.10)" strokeWidth={0.8} />
          {/* Lake shimmer */}
          <path d={LAKE_HL} fill="rgba(255,255,255,0.18)" />

          {/* Building footprints */}
          {BLDGS.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h}
              fill={`rgba(26,25,24,${b.a.toFixed(3)})`}
              stroke="rgba(26,25,24,0.38)" strokeWidth={0.28} />
          ))}

          {/* Minor roads */}
          {MINOR.map((r, i) => (
            <polyline key={i} points={pts2s(r.pts)} fill="none"
              stroke="#F5F3EF" strokeWidth={r.w}
              strokeLinecap="round" strokeLinejoin="round" />
          ))}

          {/* Secondary roads — casing then fill */}
          {SECONDARY.map((r, i) => (
            <polyline key={i} points={pts2s(r.pts)} fill="none"
              stroke="rgba(26,25,24,0.14)" strokeWidth={r.w + 3}
              strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {SECONDARY.map((r, i) => (
            <polyline key={`f${i}`} points={pts2s(r.pts)} fill="none"
              stroke="#F9F8F5" strokeWidth={r.w}
              strokeLinecap="round" strokeLinejoin="round" />
          ))}

          {/* Major roads — casing then fill */}
          {MAJOR.map((r, i) => (
            <polyline key={i} points={pts2s(r.pts)} fill="none"
              stroke="rgba(26,25,24,0.20)" strokeWidth={r.w + 5}
              strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {MAJOR.map((r, i) => (
            <polyline key={`f${i}`} points={pts2s(r.pts)} fill="none"
              stroke="#F9F8F5" strokeWidth={r.w}
              strokeLinecap="round" strokeLinejoin="round" />
          ))}

          {/* Scale bar */}
          <g opacity={0.42} transform={`translate(${W - 90},${H - 22})`}>
            <line x1={0} y1={0} x2={80} y2={0} stroke="rgba(26,25,24,0.6)" strokeWidth={0.5} />
            <line x1={0} y1={-4} x2={0} y2={4} stroke="rgba(26,25,24,0.6)" strokeWidth={0.5} />
            <line x1={40} y1={-2} x2={40} y2={2} stroke="rgba(26,25,24,0.6)" strokeWidth={0.5} />
            <line x1={80} y1={-4} x2={80} y2={4} stroke="rgba(26,25,24,0.6)" strokeWidth={0.5} />
            <text x={40} y={-7} textAnchor="middle" fontFamily="JetBrains Mono,monospace"
              fontSize={6.5} fill="rgba(26,25,24,0.55)" letterSpacing={1.2}>100 m</text>
          </g>

          {/* North indicator */}
          <g transform="translate(18,18)" opacity={0.48}>
            <circle cx={0} cy={0} r={8} fill="none" stroke="rgba(26,25,24,0.35)" strokeWidth={0.5} />
            <path d="M0,-5.5 L2,0.5 L0,-1.8 L-2,0.5Z" fill="rgba(26,25,24,0.62)" />
            <text x={0} y={-11} textAnchor="middle" fontFamily="JetBrains Mono,monospace"
              fontSize={5} fill="rgba(26,25,24,0.45)" letterSpacing={1}>N</text>
          </g>
        </g>
      </svg>

      <div className="city-zoom-btns">
        <button className="city-zoom-btn" onClick={() => doZoom(1.6)}
          disabled={zoom >= MAX_Z - 0.05} aria-label="Zoom in">+</button>
        <button className="city-zoom-btn" onClick={() => doZoom(1 / 1.6)}
          disabled={zoom <= MIN_Z + 0.05} aria-label="Zoom out">−</button>
      </div>
    </div>
  );
}
