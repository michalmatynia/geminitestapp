'use client';

import { memo, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeState = 'inactive' | 'active' | 'done';

// ─── Pipeline nodes (5 — 4 code blocks + output) ─────────────────────────────

const NODES = [
  { id: 'BRIEF',   label: 'brief parse',   sub: 'parseBrief()' },
  { id: 'SITE',    label: 'site analysis', sub: 'fetchSiteData()' },
  { id: 'MASSING', label: 'massing gen',   sub: 'generateMassing()' },
  { id: 'CHECK',   label: 'compliance',    sub: 'checkCompliance()' },
  { id: 'OUTPUT',  label: 'output',        sub: 'valid[0]' },
] as const;

// ─── Code blocks (each block activates the next node) ────────────────────────

const BLOCK_TEXTS = [
  `// ingest and structure the client brief\nconst brief = await parseBrief({\n  input: rawText,\n  schema: BriefSchema,\n  locale: "en-GB",\n});`,
  `\n\n// pull geodata and regulatory envelope\nconst site = await fetchSiteData({\n  location: brief.location,\n  include: ["zoning", "setbacks"],\n  radius: 400,\n});`,
  `\n\n// generate spatial massing alternatives\nconst options = await generateMassing({\n  brief, site,\n  iterations: 3_400,\n  objectives: ["daylight", "gfa"],\n  tolerance: 0.02,\n});`,
  `\n\n// validate against local regulations\nconst valid = options.filter((opt) =>\n  checkCompliance(opt, site.jurisdiction)\n);\n\nexport default valid[0];`,
];

const FULL_CODE = BLOCK_TEXTS.join('');
const TOTAL_CHARS = FULL_CODE.length;

const BLOCK_ENDS = BLOCK_TEXTS.reduce<number[]>((acc, text) => {
  acc.push((acc[acc.length - 1] ?? 0) + text.length);
  return acc;
}, []);

const SPEED = 44;          // chars per second
const LOOP_PAUSE_MS = 3400;

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

// ─── Node state derivation ────────────────────────────────────────────────────

function getNodeStates(shown: number): NodeState[] {
  const states = Array(NODES.length).fill('inactive') as NodeState[];
  for (let i = 0; i < BLOCK_TEXTS.length; i++) {
    const start = i === 0 ? 0 : BLOCK_ENDS[i - 1];
    const end = BLOCK_ENDS[i];
    if (shown >= end) states[i] = 'done';
    else if (shown > start) states[i] = 'active';
  }
  if (shown >= TOTAL_CHARS) states[4] = 'active';
  return states;
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

function CodeDisplay({ code, cursor }: { code: string; cursor: boolean }) {
  const lines = code.split('\n');
  return (
    <div className="cs-code-body">
      {lines.map((line, li) => (
        <div key={li} className="cs-line">
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
      ))}
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

function CodeStudio() {
  const [shown, setShown] = useState(0);
  const [cursor, setCursor] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const pauseRef = useRef<number | null>(null);
  const startedRef = useRef(false);

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

      setShown((prev) => {
        const next = prev + (dt * SPEED) / 1000;
        if (next >= TOTAL_CHARS) {
          pauseRef.current = now + LOOP_PAUSE_MS;
          setCursor(false);
          return TOTAL_CHARS;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
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
  }, []);

  const visibleCode = FULL_CODE.slice(0, Math.floor(shown));
  const nodeStates = getNodeStates(Math.floor(shown));

  return (
    <section className="cs-section" ref={sectionRef} id="code-studio">
      <div className="cs-wrap">

        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside className="cs-sidebar">
          <p className="cs-eyebrow">— 04c / code</p>
          <p className="cs-sub-label">computation as medium</p>
          <h2 className="cs-heading">
            The studio writes <em>its own tools.</em>
          </h2>
          <p className="cs-copy">
            Every constraint, brief, and spatial decision can be expressed in code.
            We author the systems that extend our practice — from site analysis
            to compliance checking, end to end.
          </p>
          <div className="cs-stat-row">
            <div className="cs-stat">
              <span className="cs-stat-val">3,400</span>
              <span className="cs-stat-label">options / brief</span>
            </div>
            <div className="cs-stat">
              <span className="cs-stat-val">38</span>
              <span className="cs-stat-label">jurisdictions</span>
            </div>
          </div>
        </aside>

        {/* ── IDE panel ────────────────────────────────────── */}
        <div className="cs-ide">
          <div className="cs-chrome">
            <span className="cs-dot cs-dot--r" />
            <span className="cs-dot cs-dot--y" />
            <span className="cs-dot cs-dot--g" />
            <span className="cs-tab-pill">main.ts</span>
            <span className="cs-tab-pill cs-tab-pill--dim">site.ts</span>
            <span className="cs-tab-pill cs-tab-pill--dim">massing.ts</span>
          </div>
          <CodeDisplay code={visibleCode} cursor={cursor} />
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
