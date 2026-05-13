'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useFloorPlanSlots } from '@/lib/floorPlanContext';
import InteriorViewer from './InteriorViewer';

const VW = 480, VH = 360;
const OX = 40, OY = 40, OW = 400, OH = 280;
const SVG_TO_M = 18 / OW;

interface Programme { id: string; name: string; weight: number; }
interface Room       { id: string; name: string; x: number; y: number; w: number; h: number; }
interface Wall       { x1: number; y1: number; x2: number; y2: number; }

const PROGRAMMES: Record<string, Programme> = {
  living:  { id: 'living',  name: 'Living',  weight: 1.0 },
  bedroom: { id: 'bedroom', name: 'Bedroom', weight: 1.6 },
  studio:  { id: 'studio',  name: 'Studio',  weight: 2.4 },
  amenity: { id: 'amenity', name: 'Amenity', weight: 1.3 },
};

type Slots = [string, string, string, string];
const INITIAL_SLOTS: Slots = ['living', 'bedroom', 'studio', 'amenity'];

function computeRooms(slots: Slots): Room[] {
  const p = (id: string) => PROGRAMMES[id];
  const w0 = p(slots[0]).weight + p(slots[1]).weight;
  const w1 = p(slots[2]).weight + p(slots[3]).weight;
  const wT = w0 + w1;
  const cw0 = OW * w0 / wT;
  const cw1 = OW - cw0;
  const h00 = OH * p(slots[0]).weight / w0;
  const h10 = OH * p(slots[2]).weight / w1;
  return [
    { id: slots[0], name: p(slots[0]).name, x: OX,       y: OY,       w: cw0, h: h00     },
    { id: slots[1], name: p(slots[1]).name, x: OX,       y: OY+h00,   w: cw0, h: OH-h00  },
    { id: slots[2], name: p(slots[2]).name, x: OX+cw0,   y: OY,       w: cw1, h: h10     },
    { id: slots[3], name: p(slots[3]).name, x: OX+cw0,   y: OY+h10,   w: cw1, h: OH-h10  },
  ];
}

function swapSlots(slots: Slots, a: number, b: number): Slots {
  const next = [...slots] as Slots;
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

function wallsFromRooms(rooms: Room[]): Wall[] {
  const byX  = [...rooms].sort((a, b) => a.x - b.x);
  const vx   = byX.find(r => r.x > OX + 2)?.x ?? (OX + OW / 2);
  const left  = rooms.filter(r => r.x < vx - 1).sort((a, b) => a.y - b.y);
  const right = rooms.filter(r => r.x >= vx - 1).sort((a, b) => a.y - b.y);
  const walls: Wall[] = [{ x1: vx, y1: OY, x2: vx, y2: OY + OH }];
  if (left.length  >= 2) walls.push({ x1: OX, y1: left[0].y+left[0].h,   x2: vx,    y2: left[0].y+left[0].h   });
  if (right.length >= 2) walls.push({ x1: vx, y1: right[0].y+right[0].h, x2: OX+OW, y2: right[0].y+right[0].h });
  return walls;
}

// Smoothstep & cubic ease-out
const ss  = (t: number) => t * t * (3 - 2 * t);
const co3 = (t: number) => 1 - Math.pow(1 - t, 3);

export default function FloorPlan() {
  const { setSlots: publishSlots } = useFloorPlanSlots();
  const [slots,      setSlots]      = useState<Slots>(INITIAL_SLOTS);
  const [display,    setDisplay]    = useState<Room[]>(() => computeRooms(INITIAL_SLOTS));
  const [roomAlpha,  setRoomAlpha]  = useState(1);   // 0 = ghosted, 1 = full fill
  const [wallDraw,   setWallDraw]   = useState(1);   // 0 = erased, 1 = fully drawn
  const [dragId,     setDragId]     = useState<string | null>(null);
  const [dragPos,    setDragPos]    = useState<{ x: number; y: number } | null>(null);
  const [hoverId,    setHoverId]    = useState<string | null>(null);
  const [flashSet,   setFlash]      = useState<Set<string>>(new Set());

  const svgRef     = useRef<SVGSVGElement>(null);
  const rafRef     = useRef<number | null>(null);
  const slotsRef   = useRef<Slots>(INITIAL_SLOTS);
  const displayRef = useRef<Room[]>(computeRooms(INITIAL_SLOTS));

  useEffect(() => { slotsRef.current   = slots;   });
  useEffect(() => { displayRef.current = display; });

  const toSVG = useCallback((cx: number, cy: number) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return null;
    return { x: (cx - r.left) * (VW / r.width), y: (cy - r.top) * (VH / r.height) };
  }, []);

  const hitRoom = useCallback((svgX: number, svgY: number, rooms: Room[]) =>
    rooms.find(r => svgX >= r.x && svgX < r.x + r.w && svgY >= r.y && svgY < r.y + r.h) ?? null
  , []);

  const doSwap = useCallback((idA: string, idB: string) => {
    const cur = slotsRef.current;
    const iA  = cur.indexOf(idA);
    const iB  = cur.indexOf(idB);
    if (iA < 0 || iB < 0 || iA === iB) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const newSlots = swapSlots(cur, iA, iB);
    const from     = displayRef.current.map(r => ({ ...r }));
    const to       = computeRooms(newSlots);
    setSlots(newSlots);
    publishSlots(newSlots);

    const t0  = performance.now();
    const dur = 1000;

    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);

      // ── Rooms slide visibly throughout (no fade) ────────────────────────────
      // ── Walls: erase quickly [0.00–0.22], invisible [0.22–0.60], draw [0.60–1.00]

      // Rooms move across the full duration, easing out by 70%
      const moveE = co3(Math.min(p / 0.70, 1));

      // Walls erase fast then redraw with pen-trace
      const wallVal = p < 0.22
        ? 1 - ss(p / 0.22)          // 1 → 0  (quick erase)
        : p < 0.60
          ? 0                        // invisible while rooms settle
          : ss((p - 0.60) / 0.40);  // 0 → 1  (pen draws back in)

      setDisplay(to.map(tgt => {
        const src = from.find(f => f.id === tgt.id)!;
        return {
          ...tgt,
          x: src.x + (tgt.x - src.x) * moveE,
          y: src.y + (tgt.y - src.y) * moveE,
          w: src.w + (tgt.w - src.w) * moveE,
          h: src.h + (tgt.h - src.h) * moveE,
        };
      }));

      setRoomAlpha(1);
      setWallDraw(wallVal);

      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else { setRoomAlpha(1); setWallDraw(1); }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const onDown = useCallback((e: React.PointerEvent, id: string) => {
    e.preventDefault();
    setDragId(id);
    const p = toSVG(e.clientX, e.clientY);
    if (p) setDragPos(p);
  }, [toSVG]);

  const onMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragId) return;
    e.preventDefault();
    const p = toSVG(e.clientX, e.clientY);
    if (!p) return;
    setDragPos(p);
    const h = hitRoom(p.x, p.y, displayRef.current);
    setHoverId(h && h.id !== dragId ? h.id : null);
  }, [dragId, toSVG, hitRoom]);

  const onUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragId) return;
    const p = toSVG(e.clientX, e.clientY);
    if (p) {
      const h = hitRoom(p.x, p.y, displayRef.current);
      if (h && h.id !== dragId) {
        doSwap(dragId, h.id);
        setFlash(new Set([dragId, h.id]));
        setTimeout(() => setFlash(new Set()), 800);
      }
    }
    setDragId(null);
    setDragPos(null);
    setHoverId(null);
  }, [dragId, toSVG, hitRoom, doSwap]);

  const onLeave = useCallback(() => {
    setDragId(null); setDragPos(null); setHoverId(null);
  }, []);

  const walls     = wallsFromRooms(display);
  const dragging  = dragId !== null;
  const dragRoom  = display.find(r => r.id === dragId);
  const animating = wallDraw < 0.98;

  return (
    <section className="drawing-section">
      <div className="wrap">
        <div className="drawing-grid">
          <div className="drawing-copy">
            <span className="label rev">— 01 / drawing</span>
            <h2 className="rev" data-delay="1">Every line carries <em>intent.</em></h2>
            <p className="rev" data-delay="2">
              Our systems parse architectural intent from natural language, existing drawings,
              and site constraint. They produce documentation a peer-reviewing architect would
              accept without amendment.
            </p>
            <a href="#practice" className="btn-quiet rev" data-delay="3">how it works ↘</a>
            <p className="plan-hint rev" data-delay="4">— drag rooms to reassign programme</p>
          </div>

          <div className="plan-col">
          <div className="plan-wrap rev" data-delay="1" id="planWrap">
            <svg
              ref={svgRef}
              className="plan-svg"
              viewBox={`0 0 ${VW} ${VH}`}
              aria-label="Interactive floor plan — drag rooms to rearrange"
              style={{ cursor: dragging ? 'grabbing' : 'default', userSelect: 'none', touchAction: 'none' }}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerLeave={onLeave}
            >
              {/* Outer building envelope */}
              <rect x={OX} y={OY} width={OW} height={OH}
                fill="none" stroke="var(--ink)" strokeWidth=".65" />

              {/* ── Room spaces ── fill animated during redraw */}
              {display.map(room => {
                const isSrc   = dragId   === room.id;
                const isTgt   = hoverId  === room.id;
                const isFlash = flashSet.has(room.id);
                const cx = room.x + room.w / 2;
                const cy = room.y + room.h / 2;
                const areaM2   = Math.round(room.w * SVG_TO_M * room.h * SVG_TO_M);
                const showArea = room.h > 55 && room.w > 70;

                const fillA = isFlash ? 0.16 : isTgt ? 0.11 : isSrc ? 0.07 : 0.5;
                const inkA  = isSrc ? 0.18 : 0.72;

                return (
                  <g key={room.id}>
                    <rect
                      x={room.x} y={room.y} width={room.w} height={room.h}
                      fill={`rgba(236,234,230,${fillA})`}
                      stroke={!animating && isTgt ? 'var(--accent)' : 'none'}
                      strokeWidth=".7"
                      strokeDasharray={!animating && isTgt ? '4 3' : undefined}
                      style={{ cursor: 'grab' }}
                      onPointerDown={(e) => onDown(e, room.id)}
                    />
                    <text
                      x={cx} y={showArea ? cy - 9 : cy}
                      textAnchor="middle" dominantBaseline="middle"
                      pointerEvents="none"
                      style={{
                        fontFamily: 'var(--mono)', fontSize: '11px',
                        letterSpacing: '.14em', textTransform: 'uppercase',
                        fill: isSrc ? 'rgba(26,25,24,.18)' : 'var(--ink-2)',
                      }}
                    >
                      {room.name}
                    </text>
                    {showArea && (
                      <text
                        x={cx} y={cy + 9}
                        textAnchor="middle" dominantBaseline="middle"
                        pointerEvents="none"
                        style={{
                          fontFamily: 'var(--mono)', fontSize: '8px',
                          letterSpacing: '.10em',
                          fill: 'rgba(100,95,90,.4)',
                        }}
                      >
                        {areaM2} m²
                      </text>
                    )}
                  </g>
                );
              })}

              {/* ── Partition walls ── trace in with strokeDashoffset during draw phase */}
              {walls.map((w, i) => {
                const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
                // Vertical wall (i=0) leads; horizontal walls (i=1,2) stagger after
                const localP = i === 0
                  ? Math.min(wallDraw / 0.60, 1)
                  : Math.max(0, (wallDraw - 0.35) / 0.65);
                const localE  = ss(localP);
                const offset  = animating ? len * (1 - localE) : 0;
                return (
                  <line key={i}
                    x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
                    stroke="var(--ink-3)" strokeWidth=".45"
                    strokeDasharray={animating ? `${len}` : undefined}
                    strokeDashoffset={animating ? offset : undefined}
                  />
                );
              })}

              {/* ── Pen-tip dots ── lead each wall stroke during draw phase */}
              {animating && wallDraw > 0.02 && wallDraw < 0.97 && walls.map((w, i) => {
                const len    = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
                const localP = i === 0
                  ? Math.min(wallDraw / 0.60, 1)
                  : Math.max(0, (wallDraw - 0.35) / 0.65);
                const localE = ss(localP);
                if (localE <= 0.01 || localE >= 0.99) return null;
                const tx = w.x1 + (w.x2 - w.x1) * localE;
                const ty = w.y1 + (w.y2 - w.y1) * localE;
                // Pen tip: small bright dot with a faint halo
                return (
                  <g key={`tip-${i}`} pointerEvents="none">
                    <circle cx={tx} cy={ty} r="3.5"
                      fill="var(--paper)" opacity="0.85" />
                    <circle cx={tx} cy={ty} r="1.4"
                      fill="var(--ink)" opacity="0.9" />
                  </g>
                );
              })}

              {/* Dimension string */}
              <line x1="40"  y1="346" x2="440" y2="346" stroke="var(--ink-3)" strokeWidth=".4" opacity=".5" />
              <line x1="40"  y1="342" x2="40"  y2="350" stroke="var(--ink-3)" strokeWidth=".4" opacity=".5" />
              <line x1="440" y1="342" x2="440" y2="350" stroke="var(--ink-3)" strokeWidth=".4" opacity=".5" />
              <text className="plan-label" x="240" y="354" textAnchor="middle">18,000</text>

              {/* Drag ghost badge */}
              {dragging && dragPos && dragRoom && (
                <g transform={`translate(${dragPos.x},${dragPos.y})`} pointerEvents="none">
                  <rect x="-36" y="-13" width="72" height="26" rx="2"
                    fill="var(--ink)" opacity=".93" />
                  <text textAnchor="middle" dominantBaseline="middle" style={{
                    fontFamily: 'var(--mono)', fontSize: '10px',
                    letterSpacing: '.12em', textTransform: 'uppercase',
                    fill: 'var(--paper)',
                  }}>{dragRoom.name}</text>
                </g>
              )}

              {/* North indicator */}
              <g transform="translate(60,330)">
                <circle cx="0" cy="0" r="8" fill="none" stroke="var(--ink-3)" strokeWidth=".5" />
                <path d="M0,-6 L2,0 L0,-1 L-2,0Z" fill="var(--ink)" />
                <text x="0" y="-11" textAnchor="middle" className="plan-label"
                  style={{ fontSize: '5px' }}>N</text>
              </g>
              <text className="plan-title" x="440" y="334" textAnchor="end">A-001 · Ground</text>
            </svg>
          </div>
          <div className="interior-viewer-panel rev" data-delay="2">
            <InteriorViewer />
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
