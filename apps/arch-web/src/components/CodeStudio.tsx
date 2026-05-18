'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeState = 'inactive' | 'active' | 'done';
type ParamKey = 'iterations' | 'floorHeight' | 'gridX';
type Params = Record<ParamKey, number>;

// ─── Pipeline nodes ───────────────────────────────────────────────────────────

const NODES = [
  { id: 'IFC',      label: 'ifc model',   sub: 'parseSiteFromIFC()' },
  { id: 'MASSING',  label: 'massing gen', sub: 'generateMassing()'  },
  { id: 'DAYLIGHT', label: 'daylighting', sub: 'objectives[0]'      },
  { id: 'CHECK',    label: 'compliance',  sub: 'checkCompliance()'  },
  { id: 'OUTPUT',   label: 'output',      sub: 'valid[0]'           },
] as const;

// ─── Parameter definitions ────────────────────────────────────────────────────

type ParamDef = { key: ParamKey; label: string; unit: string; min: number; max: number; step: number };

const PARAM_DEFS: ParamDef[] = [
  { key: 'iterations',  label: 'Massing options', unit: '',    min: 1000, max: 8000, step: 100 },
  { key: 'floorHeight', label: 'Floor-to-floor',  unit: ' m', min: 2.8,  max: 4.5,  step: 0.1 },
  { key: 'gridX',       label: 'Structural bay',  unit: ' m', min: 3.0,  max: 9.0,  step: 0.3 },
];

const DEFAULT_PARAMS: Params = { iterations: 3400, floorHeight: 3.2, gridX: 6.0 };

const SPEED = 44;
const LOOP_PAUSE_MS = 3400;

// ─── Code generation ──────────────────────────────────────────────────────────

function fmtIter(n: number): string {
  const s = String(n);
  return s.length > 3 ? `${s.slice(0, -3)}_${s.slice(-3)}` : s;
}

function buildBlocks(p: Params): [string, string, string, string] {
  const gridY = (p.gridX * 1.4).toFixed(1);
  return [
    `// extract site constraints from IFC model\nconst site = await parseSiteFromIFC({\n  source: project.ifc,\n  include: ["topoSurface", "buildingEnvelope"],\n  crs: "EPSG:27700",\n});`,
    `\n\n// parametric massing from structural grid\nconst massing = await generateMassing({\n  site, brief,\n  iterations: ${fmtIter(p.iterations)},\n  grid: { x: ${p.gridX.toFixed(1)}, y: ${gridY} },\n  floorHeight: ${p.floorHeight.toFixed(1)},\n  objectives: ["daylight", "gfa"],\n});`,
    `\n\n// filter against planning requirements\nconst valid = massing.filter((opt) =>\n  checkCompliance(opt, {\n    lpa: site.jurisdiction,\n    daylight: { avgVSF: 0.27 },\n  })\n);`,
    `\n\nexport default valid[0];`,
  ];
}

function getBlockEnds(blocks: readonly string[]): number[] {
  return (blocks as string[]).reduce<number[]>((acc, t) => {
    acc.push((acc[acc.length - 1] ?? 0) + t.length);
    return acc;
  }, []);
}

function getParamLineMap(code: string): Record<ParamKey, number> {
  const map: Record<ParamKey, number> = { iterations: -1, floorHeight: -1, gridX: -1 };
  code.split('\n').forEach((line, i) => {
    if (line.includes('iterations:'))  map.iterations  = i;
    if (line.includes('grid:'))        map.gridX       = i;
    if (line.includes('floorHeight:')) map.floorHeight = i;
  });
  return map;
}

function getBlockLineStarts(blocks: readonly string[]): number[] {
  const starts: number[] = [];
  let offset = 0;
  for (const t of blocks) { starts.push(offset); offset += t.split('\n').length; }
  return starts;
}

function getActiveBlockIdx(shown: number, blockEnds: number[]): number {
  for (let i = blockEnds.length - 1; i >= 0; i--) {
    const start = i === 0 ? 0 : blockEnds[i - 1];
    if (shown > start) return i;
  }
  return 0;
}

function getNodeStates(shown: number, blockEnds: number[], totalChars: number): NodeState[] {
  const states = Array(NODES.length).fill('inactive') as NodeState[];
  for (let i = 0; i < 4; i++) {
    const start = i === 0 ? 0 : blockEnds[i - 1];
    const end = blockEnds[i];
    if (shown >= end)       states[i] = 'done';
    else if (shown > start) states[i] = 'active';
  }
  if (shown >= totalChars) states[4] = 'active';
  return states;
}

// ─── Syntax highlighter ───────────────────────────────────────────────────────

const PATTERNS: [RegExp, string][] = [
  [/^\/\/.*/, 'comment'],
  [/^(const|let|await|export|default|async|return|import|from|of)\b/, 'kw'],
  [/^"[^"]*"/, 'str'],
  [/^\d[\d_]*(\.\d+)?/, 'num'],
  [/^[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\()/, 'fn'],
  [/^[a-zA-Z_$][a-zA-Z0-9_$.]*/, 'plain'],
  [/^\s+/, 'ws'],
  [/^./, 'op'],
];

function tokenizeLine(line: string): { type: string; text: string }[] {
  const tokens: { type: string; text: string }[] = [];
  let i = 0;
  while (i < line.length) {
    let matched = false;
    for (const [pat, type] of PATTERNS) {
      const m = line.slice(i).match(pat);
      if (m) { tokens.push({ type, text: m[0] }); i += m[0].length; matched = true; break; }
    }
    if (!matched) { tokens.push({ type: 'op', text: line[i] }); i++; }
  }
  return tokens;
}

// ─── SVG pipeline graph ───────────────────────────────────────────────────────

const N_H = 52;
const N_GAP = 26;
const N_W = 192;
const N_PAD = 16;
const SVG_W = N_W + N_PAD * 2;
const SVG_H = NODES.length * N_H + (NODES.length - 1) * N_GAP + N_PAD * 2;

function PipelineGraph({ states }: { states: NodeState[] }) {
  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="cs-node-svg" aria-hidden="true">
      {NODES.map((node, i) => {
        const y = N_PAD + i * (N_H + N_GAP);
        const state = states[i];
        const midX = SVG_W / 2;
        return (
          <g key={node.id}>
            {i < NODES.length - 1 && (
              <line
                x1={midX} y1={y + N_H}
                x2={midX} y2={y + N_H + N_GAP}
                className={`cs-nline cs-nline--${state === 'done' ? 'live' : 'idle'}`}
                strokeDasharray={N_GAP}
                strokeDashoffset={state === 'done' ? 0 : N_GAP}
              />
            )}
            <rect
              x={N_PAD} y={y} width={N_W} height={N_H} rx="1.5"
              className={`cs-nrect cs-nrect--${state}`}
            />
            <text x={N_PAD + 14} y={y + 22} className={`cs-nlabel cs-nlabel--${state}`}>
              {node.label}
            </text>
            <text x={N_PAD + 14} y={y + 38} className={`cs-nsub cs-nsub--${state}`}>
              {node.sub}
            </text>
            <circle
              cx={N_PAD + N_W - 18} cy={y + N_H / 2} r="4.5"
              className={`cs-ndot cs-ndot--${state}`}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Code display ─────────────────────────────────────────────────────────────

function CodeDisplay({
  code,
  cursor,
  activeBlock,
  blockLineStarts,
  blockLineCounts,
  flashLine,
}: {
  code: string;
  cursor: boolean;
  activeBlock: number;
  blockLineStarts: number[];
  blockLineCounts: number[];
  flashLine: number;
}) {
  const lines = code.split('\n');
  const blockStart = blockLineStarts[activeBlock] ?? 0;
  const blockEnd = blockStart + (blockLineCounts[activeBlock] ?? 1) - 1;
  return (
    <div className="cs-code-body">
      {lines.map((line, li) => {
        const isActive = li >= blockStart && li <= blockEnd;
        const isFlash = li === flashLine;
        return (
          <div
            key={li}
            className={`cs-line${isActive ? ' cs-line--active' : ''}${isFlash ? ' cs-line--flash' : ''}`}
          >
            <span className="cs-ln">{li + 1}</span>
            <span className="cs-lc">
              {tokenizeLine(line).map((tok, ti) => (
                <span key={ti} className={`cs-t-${tok.type}`}>{tok.text}</span>
              ))}
              {li === lines.length - 1 && cursor && (
                <span className="cs-cursor" aria-hidden="true" />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Parameter slider ─────────────────────────────────────────────────────────

function ParamSlider({
  def,
  value,
  onChange,
}: {
  def: ParamDef;
  value: number;
  onChange: (key: ParamKey, v: number) => void;
}) {
  const pct = ((value - def.min) / (def.max - def.min)) * 100;
  const display = def.key === 'iterations' ? value.toLocaleString('en-GB') : value.toFixed(1);
  return (
    <div className="cs-param">
      <div className="cs-param-top">
        <span className="cs-param-label">{def.label}</span>
        <span className="cs-param-val">{display}{def.unit}</span>
      </div>
      <div className="cs-param-track">
        <div className="cs-param-fill" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={def.min}
          max={def.max}
          step={def.step}
          value={value}
          className="cs-param-input"
          aria-label={def.label}
          onChange={e => onChange(def.key, parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

function CodeStudio() {
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [shown, setShown] = useState(0);
  const [cursor, setCursor] = useState(false);
  const [flashLine, setFlashLine] = useState(-1);
  const [restartKey, setRestartKey] = useState(0);

  const sectionRef = useRef<HTMLElement>(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const pauseRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  const totalCharsRef = useRef(0);
  const paramsRef = useRef(params);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const blocks = useMemo(() => buildBlocks(params), [params]);
  const fullCode = useMemo(() => blocks.join(''), [blocks]);
  const totalChars = fullCode.length;
  const blockEnds = useMemo(() => getBlockEnds(blocks), [blocks]);
  const blockLineStarts = useMemo(() => getBlockLineStarts(blocks), [blocks]);
  const blockLineCounts = useMemo(() => blocks.map(t => t.split('\n').length), [blocks]);

  // keep refs in sync each render
  totalCharsRef.current = totalChars;
  paramsRef.current = params;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    function tick(now: number) {
      const dt = now - lastRef.current;
      lastRef.current = now;

      if (pauseRef.current !== null) {
        if (now >= pauseRef.current) {
          pauseRef.current = null;
          setShown(0);
          setCursor(true);
        }
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      setShown(prev => {
        const total = totalCharsRef.current;
        const next = prev + (dt * SPEED) / 1000;
        if (next >= total) {
          pauseRef.current = now + LOOP_PAUSE_MS;
          setCursor(false);
          return total;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    if (startedRef.current) {
      // param change triggered restart
      setShown(0);
      setCursor(true);
      pauseRef.current = null;
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          setCursor(true);
          lastRef.current = performance.now();
          rafRef.current = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [restartKey]);

  const handleParam = useCallback((key: ParamKey, value: number) => {
    const nextParams = { ...paramsRef.current, [key]: value };
    const nextCode = buildBlocks(nextParams).join('');
    const nextParamLines = getParamLineMap(nextCode);
    const lineToFlash = nextParamLines[key];

    setParams(nextParams);
    cancelAnimationFrame(rafRef.current);
    pauseRef.current = null;
    setShown(99999);
    setCursor(false);

    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    if (lineToFlash >= 0) {
      setFlashLine(lineToFlash);
      flashTimerRef.current = setTimeout(() => setFlashLine(-1), 1300);
    }

    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => setRestartKey(k => k + 1), 1800);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, []);

  const shownInt = Math.min(Math.floor(shown), totalChars);
  const visibleCode = fullCode.slice(0, shownInt);
  const nodeStates = getNodeStates(shownInt, blockEnds, totalChars);
  const activeBlock = getActiveBlockIdx(shownInt, blockEnds);

  return (
    <section className="cs-section" ref={sectionRef} id="code-studio">
      <div className="cs-wrap">

        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside className="cs-sidebar">
          <p className="cs-eyebrow">— 04c / computation</p>
          <p className="cs-sub-label">parametric bim</p>
          <h2 className="cs-heading">
            Code is how we<br /><em>design at scale.</em>
          </h2>
          <p className="cs-copy">
            We parse IFC models, generate thousands of massing alternatives against
            a structural grid, and validate each one for daylight and GFA compliance —
            all in code. Adjust the parameters and watch the solution space change.
          </p>
          <div className="cs-params">
            {PARAM_DEFS.map(def => (
              <ParamSlider
                key={def.key}
                def={def}
                value={params[def.key]}
                onChange={handleParam}
              />
            ))}
          </div>
        </aside>

        {/* ── IDE panel ────────────────────────────────────── */}
        <div className="cs-ide">
          <div className="cs-chrome">
            <span className="cs-dot cs-dot--r" />
            <span className="cs-dot cs-dot--y" />
            <span className="cs-dot cs-dot--g" />
            <span className="cs-tab-pill">site.ts</span>
            <span className="cs-tab-pill cs-tab-pill--dim">massing.ts</span>
            <span className="cs-tab-pill cs-tab-pill--dim">compliance.ts</span>
          </div>
          <CodeDisplay
            code={visibleCode}
            cursor={cursor}
            activeBlock={activeBlock}
            blockLineStarts={blockLineStarts}
            blockLineCounts={blockLineCounts}
            flashLine={flashLine}
          />
        </div>

        {/* ── Node graph ───────────────────────────────────── */}
        <div className="cs-nodes">
          <p className="cs-nodes-label">pipeline</p>
          <PipelineGraph states={nodeStates} />
        </div>

      </div>
    </section>
  );
}

export default memo(CodeStudio);
