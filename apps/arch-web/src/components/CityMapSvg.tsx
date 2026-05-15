'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const W = 800, H = 600;
const STEP = 16;
const MIN_Z = 1, MAX_Z = 6;
const PX = W / 2, PY = H / 2;

// ── RNG ──────────────────────────────────────────────────────────
class Rand {
  private s: number;
  constructor(seed: number) { this.s = seed; }
  n() { this.s = (this.s * 16807) % 2147483647; return (this.s - 1) / 2147483646; }
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

const MAJOR: Road[] = [
  { pts: [[250,0],[253,85],[247,170],[255,255],[249,340],[257,425],[251,510],[255,600]], w: 10 },
  { pts: [[0,220],[85,217],[200,221],[335,218],[468,223],[600,219],[720,224],[800,221]], w: 9 },
  { pts: [[0,158],[65,188],[138,221],[215,270],[308,334],[400,398],[492,462],[578,524],[658,578],[728,600]], w: 7.5 },
];

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

const LAKE_HL = [
  'M 600 395',
  'C 628 382 662 378 696 390',
  'C 730 402 755 424 768 452',
  'C 778 472 776 504 768 526',
  'C 758 548 740 562 720 568 Z',
].join(' ');

// ── Building generation ───────────────────────────────────────────
interface Bldg { x: number; y: number; w: number; h: number; a: number; }
type Streets = 'open' | 'planned' | 'historic';

function genBuildings(
  density: number,   // 0–100
  spread: number,    // 0–100
  plotSize: number,  // 0–100
  exclusionRoads: Road[]
): Bldg[] {
  const rnd = new Rand(27182);
  const out: Bldg[] = [];

  // density 0→100 maps to keepProb 0.10→0.88
  const keepProb = 0.10 + (density / 100) * 0.78;
  // plotSize 0→100 maps size range: 0=(0.15–0.33) 100=(0.45–0.90)
  const minFrac = 0.15 + (plotSize / 100) * 0.30;
  const maxFrac = 0.33 + (plotSize / 100) * 0.57;
  const jitterAmt = spread / 100;

  for (let gx = 0; gx <= W - STEP; gx += STEP) {
    for (let gy = 0; gy <= H - STEP; gy += STEP) {
      // Always consume 6 RNG values per non-excluded cell so density
      // changes don't reshuffle layout for surviving buildings.
      const r1 = rnd.n(); // density roll
      const r2 = rnd.n(); // width
      const r3 = rnd.n(); // height
      const r4 = rnd.n(); // x jitter (-1..1 via 2*r-1)
      const r5 = rnd.n(); // y jitter
      const r6 = rnd.n(); // opacity

      const cx = gx + STEP / 2, cy = gy + STEP / 2;

      if (inLakeEllipse(cx, cy)) continue;
      if (gx >= 350 && gx < 600 && gy >= 0 && gy < 78) continue;
      if (gx >= 148 && gx < 252 && gy >= 220 && gy < 298) continue;

      let onRoad = false;
      for (const road of exclusionRoads) {
        if (distToPoly(cx, cy, road.pts) < road.w / 2 + 4) { onRoad = true; break; }
      }
      if (onRoad) continue;
      if (r1 > keepProb) continue;

      const bw = STEP * (minFrac + r2 * (maxFrac - minFrac));
      const bh = STEP * (minFrac + r3 * (maxFrac - minFrac));

      const maxJw = Math.max(0, (STEP - bw) / 2 - 1);
      const maxJh = Math.max(0, (STEP - bh) / 2 - 1);
      const bx = gx + STEP / 2 - bw / 2 + (r4 * 2 - 1) * maxJw * jitterAmt;
      const by = gy + STEP / 2 - bh / 2 + (r5 * 2 - 1) * maxJh * jitterAmt;

      const nearMain = MAJOR.some(road => distToPoly(cx, cy, road.pts) < 75);
      const a = nearMain
        ? 0.28 + r6 * (0.45 - 0.28)
        : 0.18 + r6 * (0.32 - 0.18);

      out.push({ x: bx, y: by, w: bw, h: bh, a });
    }
  }
  return out;
}

function pts2s(pts: Pt[]): string {
  return pts.map(([x, y]) => `${x},${y}`).join(' ');
}

// ── Slider control ────────────────────────────────────────────────
function SliderCtrl({
  label, val, min, max, step, display, onChange,
}: {
  label: string; val: number; min: number; max: number; step: number;
  display: string; onChange: (v: number) => void;
}) {
  return (
    <div className="city-ctrl">
      <div className="city-ctrl-header">
        <span className="city-ctrl-label">{label}</span>
        <span className="city-ctrl-val">{display}</span>
      </div>
      <input
        type="range" className="city-ctrl-slider"
        min={min} max={max} step={step} value={val}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  );
}

// ── Segmented control ─────────────────────────────────────────────
function SegCtrl<T extends string>({
  label, options, value, onChange,
}: {
  label: string; options: T[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="city-ctrl">
      <div className="city-ctrl-header">
        <span className="city-ctrl-label">{label}</span>
      </div>
      <div className="city-ctrl-seg">
        {options.map(opt => (
          <button
            key={opt}
            className={`city-ctrl-seg-btn${value === opt ? ' active' : ''}`}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
export default function CityMapSvg() {
  const [density, setDensity]   = useState(60);
  const [spread, setSpread]     = useState(80);
  const [plotSize, setPlotSize] = useState(50);
  const [streets, setStreets]   = useState<Streets>('historic');

  // Zoom runs entirely off React state — direct DOM writes via groupRef
  // so there are zero re-renders during the animation.
  const zoomVal  = useRef(1);   // actual current zoom
  const zoomVel  = useRef(0);   // spring velocity
  const targetRef = useRef(1);  // desired zoom
  const rafRef   = useRef<number | null>(null);
  const svgRef   = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  // Only used for button disabled state — updated once per gesture end
  const [btnState, setBtnState] = useState({ atMin: true, atMax: false });

  const applyTransform = useCallback((z: number) => {
    if (groupRef.current) {
      groupRef.current.setAttribute(
        'transform',
        `translate(${PX} ${PY}) scale(${z}) translate(${-PX} ${-PY})`
      );
    }
  }, []);

  const activeRoads = useMemo<Road[]>(() => {
    if (streets === 'open')    return MAJOR;
    if (streets === 'planned') return [...MAJOR, ...SECONDARY];
    return ALL_ROADS;
  }, [streets]);

  const buildings = useMemo(
    () => genBuildings(density, spread, plotSize, activeRoads),
    [density, spread, plotSize, activeRoads]
  );

  const animate = useCallback(() => {
    // Critically-damped spring: stiffness=0.14, damping=0.78
    const force = (targetRef.current - zoomVal.current) * 0.14;
    zoomVel.current = zoomVel.current * 0.78 + force;
    zoomVal.current += zoomVel.current;
    applyTransform(zoomVal.current);

    const settled =
      Math.abs(zoomVel.current) < 0.00015 &&
      Math.abs(targetRef.current - zoomVal.current) < 0.00015;

    if (settled) {
      zoomVal.current = targetRef.current;
      zoomVel.current = 0;
      applyTransform(zoomVal.current);
      setBtnState({
        atMin: zoomVal.current <= MIN_Z + 0.05,
        atMax: zoomVal.current >= MAX_Z - 0.05,
      });
    } else {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [applyTransform]);

  const doZoom = useCallback((factor: number) => {
    targetRef.current = Math.max(MIN_Z, Math.min(MAX_Z, targetRef.current * factor));
    setBtnState({
      atMin: targetRef.current <= MIN_Z + 0.05,
      atMax: targetRef.current >= MAX_Z - 0.05,
    });
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

  const renderSecondary = streets === 'planned' || streets === 'historic';
  const renderMinor = streets === 'historic';

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>

      {/* ── Parameter controls ── */}
      <div className="city-controls">
        <SliderCtrl
          label="— buildings"
          val={density} min={10} max={100} step={5}
          display={`${density}%`}
          onChange={setDensity}
        />
        <SliderCtrl
          label="— spread"
          val={spread} min={0} max={100} step={5}
          display={`${spread}%`}
          onChange={setSpread}
        />
        <SegCtrl<Streets>
          label="— streets"
          options={['open', 'planned', 'historic']}
          value={streets}
          onChange={setStreets}
        />
        <SliderCtrl
          label="— plot size"
          val={plotSize} min={0} max={100} step={5}
          display={plotSize < 33 ? 'sm' : plotSize < 66 ? 'md' : 'lg'}
          onChange={setPlotSize}
        />
      </div>

      {/* ── Map area ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>

      {/* ── Map SVG ── */}
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

        <g ref={groupRef} transform={`translate(${PX} ${PY}) scale(1) translate(${-PX} ${-PY})`}>
          <rect x={0} y={0} width={W} height={H} fill="#EDEBE8" />

          <rect x={350} y={0} width={250} height={78} fill="#E8E6E2" />
          <rect x={350} y={0} width={250} height={78} fill="url(#parkDots)" />
          <rect x={148} y={220} width={104} height={78} fill="#E8E6E2" />
          <rect x={148} y={220} width={104} height={78} fill="url(#parkDots)" />

          <path d={LAKE} fill="rgba(178,200,218,0.52)" />
          <path d={LAKE} fill="none" stroke="rgba(26,25,24,0.10)" strokeWidth={0.8} />
          <path d={LAKE_HL} fill="rgba(255,255,255,0.18)" />

          {buildings.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h}
              fill={`rgba(26,25,24,${b.a.toFixed(3)})`}
              stroke="rgba(26,25,24,0.38)" strokeWidth={0.28} />
          ))}

          {renderMinor && MINOR.map((r, i) => (
            <polyline key={i} points={pts2s(r.pts)} fill="none"
              stroke="#F5F3EF" strokeWidth={r.w}
              strokeLinecap="round" strokeLinejoin="round" />
          ))}

          {renderSecondary && SECONDARY.map((r, i) => (
            <polyline key={i} points={pts2s(r.pts)} fill="none"
              stroke="rgba(26,25,24,0.14)" strokeWidth={r.w + 3}
              strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {renderSecondary && SECONDARY.map((r, i) => (
            <polyline key={`f${i}`} points={pts2s(r.pts)} fill="none"
              stroke="#F9F8F5" strokeWidth={r.w}
              strokeLinecap="round" strokeLinejoin="round" />
          ))}

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

          <g opacity={0.42} transform={`translate(${W - 90},${H - 22})`}>
            <line x1={0} y1={0} x2={80} y2={0} stroke="rgba(26,25,24,0.6)" strokeWidth={0.5} />
            <line x1={0} y1={-4} x2={0} y2={4} stroke="rgba(26,25,24,0.6)" strokeWidth={0.5} />
            <line x1={40} y1={-2} x2={40} y2={2} stroke="rgba(26,25,24,0.6)" strokeWidth={0.5} />
            <line x1={80} y1={-4} x2={80} y2={4} stroke="rgba(26,25,24,0.6)" strokeWidth={0.5} />
            <text x={40} y={-7} textAnchor="middle" fontFamily="JetBrains Mono,monospace"
              fontSize={6.5} fill="rgba(26,25,24,0.55)" letterSpacing={1.2}>100 m</text>
          </g>

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
          disabled={btnState.atMax} aria-label="Zoom in">+</button>
        <button className="city-zoom-btn" onClick={() => doZoom(1 / 1.6)}
          disabled={btnState.atMin} aria-label="Zoom out">−</button>
      </div>
      </div>{/* end map area */}
    </div>
  );
}
