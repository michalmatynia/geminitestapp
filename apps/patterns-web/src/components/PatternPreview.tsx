import type { JSX } from 'react';
import type { PatternPreview as PatternPreviewData } from '@/lib/types';

type PatternPreviewProps = {
  preview: PatternPreviewData;
  label: string;
};

const range = (count: number): number[] =>
  Array.from({ length: count }, (_, index) => index);

function GridMotif({ ink, accent, density }: PatternPreviewData): JSX.Element {
  const step = 240 / density;
  return (
    <>
      {range(density + 1).map((index) => {
        const pos = Math.round(index * step);
        return (
          <g key={pos}>
            <line x1={pos} y1="0" x2={pos} y2="240" stroke={ink} strokeWidth="0.8" opacity="0.5" />
            <line x1="0" y1={pos} x2="240" y2={pos} stroke={ink} strokeWidth="0.8" opacity="0.5" />
          </g>
        );
      })}
      {range(density).map((index) => {
        const x = 18 + ((index * 43) % 196);
        const y = 24 + ((index * 67) % 182);
        return <circle key={`dot-${index}`} cx={x} cy={y} r="2.4" fill={accent} />;
      })}
    </>
  );
}

function ArchesMotif({ ink, accent, density }: PatternPreviewData): JSX.Element {
  const cols = Math.max(3, Math.min(6, density));
  const width = 240 / cols;
  return (
    <>
      {range(cols * 2).map((index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * width + 8;
        const y = row * 104 + 116;
        return (
          <path
            key={`arch-${index}`}
            d={`M ${x} ${y} V ${y - 44} C ${x} ${y - 76}, ${x + width - 16} ${y - 76}, ${x + width - 16} ${y - 44} V ${y}`}
            fill="none"
            stroke={index % 2 === 0 ? ink : accent}
            strokeWidth="1.8"
          />
        );
      })}
      <line x1="0" y1="120" x2="240" y2="120" stroke={ink} strokeWidth="0.8" opacity="0.22" />
    </>
  );
}

function CutStoneMotif({ ink, accent, density }: PatternPreviewData): JSX.Element {
  const rows = Math.max(4, density);
  return (
    <>
      {range(rows).map((row) => {
        const y = row * (240 / rows);
        return (
          <path
            key={`stone-row-${row}`}
            d={`M 0 ${y + 4} H 240`}
            fill="none"
            stroke={ink}
            strokeWidth="1"
            opacity="0.5"
          />
        );
      })}
      {range(rows * 3).map((index) => {
        const row = Math.floor(index / 3);
        const rowHeight = 240 / rows;
        const x = ((index * 73) % 210) + 12;
        const y1 = row * rowHeight + 4;
        const y2 = Math.min(240, y1 + rowHeight - 8);
        return (
          <line
            key={`stone-joint-${index}`}
            x1={x}
            y1={y1}
            x2={x + ((index % 2) * 14 - 7)}
            y2={y2}
            stroke={index % 4 === 0 ? accent : ink}
            strokeWidth="1"
            opacity="0.58"
          />
        );
      })}
    </>
  );
}

function BotanicalMotif({ ink, accent, density }: PatternPreviewData): JSX.Element {
  return (
    <>
      {range(density).map((index) => {
        const x = 28 + ((index * 41) % 184);
        const y = 26 + ((index * 59) % 184);
        const flip = index % 2 === 0 ? 1 : -1;
        return (
          <g key={`stem-${index}`} transform={`translate(${x} ${y})`}>
            <path
              d={`M 0 34 C ${10 * flip} 18, ${-12 * flip} 7, ${4 * flip} -28`}
              fill="none"
              stroke={ink}
              strokeWidth="1.1"
            />
            <path
              d={`M ${3 * flip} 4 C ${24 * flip} -5, ${24 * flip} 16, ${4 * flip} 17 C ${18 * flip} 11, ${17 * flip} 4, ${3 * flip} 4 Z`}
              fill="none"
              stroke={accent}
              strokeWidth="1"
            />
            <circle cx={-5 * flip} cy="25" r="1.8" fill={accent} />
          </g>
        );
      })}
    </>
  );
}

function FoldMotif({ ink, accent, density }: PatternPreviewData): JSX.Element {
  return (
    <>
      {range(density + 2).map((index) => {
        const offset = -120 + index * 56;
        return (
          <g key={`fold-${index}`}>
            <line x1={offset} y1="0" x2={offset + 220} y2="240" stroke={ink} strokeWidth="0.9" opacity="0.35" />
            <line x1={offset + 24} y1="0" x2={offset + 244} y2="240" stroke={accent} strokeWidth="1.2" opacity="0.5" />
          </g>
        );
      })}
      <rect x="18" y="18" width="204" height="204" fill="none" stroke={ink} strokeWidth="0.8" opacity="0.28" />
    </>
  );
}

function TileMotif({ ink, accent, density }: PatternPreviewData): JSX.Element {
  const step = 240 / Math.max(4, Math.min(8, density));
  return (
    <>
      {range(Math.ceil(240 / step) + 1).map((index) => {
        const pos = Math.round(index * step);
        return (
          <g key={`tile-${index}`}>
            <line x1={pos} y1="0" x2={pos} y2="240" stroke={ink} strokeWidth="1" opacity="0.48" />
            <line x1="0" y1={pos} x2="240" y2={pos} stroke={ink} strokeWidth="1" opacity="0.48" />
          </g>
        );
      })}
      {range(density).map((index) => (
        <rect
          key={`tile-mark-${index}`}
          x={20 + ((index * 53) % 180)}
          y={24 + ((index * 37) % 172)}
          width="18"
          height="18"
          fill="none"
          stroke={accent}
          strokeWidth="1.2"
        />
      ))}
    </>
  );
}

function WeaveMotif({ ink, accent, density }: PatternPreviewData): JSX.Element {
  const step = 240 / Math.max(6, density + 2);
  return (
    <>
      {range(12).map((index) => {
        const pos = index * step;
        return (
          <g key={`weave-${index}`}>
            <rect x={pos} y="0" width={step / 2} height="240" fill={index % 2 === 0 ? ink : accent} opacity="0.09" />
            <rect x="0" y={pos} width="240" height={step / 2} fill={index % 2 === 0 ? accent : ink} opacity="0.1" />
            <line x1={pos} y1="0" x2={pos} y2="240" stroke={ink} strokeWidth="0.55" opacity="0.26" />
            <line x1="0" y1={pos} x2="240" y2={pos} stroke={ink} strokeWidth="0.55" opacity="0.26" />
          </g>
        );
      })}
    </>
  );
}

function WaveMotif({ ink, accent, density }: PatternPreviewData): JSX.Element {
  return (
    <>
      {range(density + 2).map((index) => {
        const y = 18 + index * (204 / (density + 1));
        return (
          <path
            key={`wave-${index}`}
            d={`M -18 ${y} C 20 ${y - 22}, 58 ${y + 22}, 96 ${y} S 172 ${y - 22}, 258 ${y}`}
            fill="none"
            stroke={index % 2 === 0 ? ink : accent}
            strokeWidth="1.4"
            opacity={index % 2 === 0 ? 0.74 : 0.48}
          />
        );
      })}
    </>
  );
}

function TerrazzoMotif({ ink, accent, density }: PatternPreviewData): JSX.Element {
  return (
    <>
      {range(density * 3).map((index) => {
        const x = 14 + ((index * 47) % 212);
        const y = 16 + ((index * 61) % 208);
        const size = 5 + (index % 4) * 4;
        return (
          <path
            key={`fleck-${index}`}
            d={`M ${x} ${y} l ${size} ${size / 3} l ${-size / 4} ${size} l ${-size} ${-size / 2} Z`}
            fill={index % 3 === 0 ? accent : ink}
            opacity={index % 3 === 0 ? 0.55 : 0.22}
          />
        );
      })}
    </>
  );
}

function ConstellationMotif({ ink, accent, density }: PatternPreviewData): JSX.Element {
  const points = range(density + 6).map((index) => ({
    x: 22 + ((index * 37) % 196),
    y: 24 + ((index * 71) % 190),
  }));

  return (
    <>
      {points.slice(1).map((point, index) => (
        <line
          key={`join-${index}`}
          x1={points[index].x}
          y1={points[index].y}
          x2={point.x}
          y2={point.y}
          stroke={ink}
          strokeWidth="0.8"
          opacity="0.26"
        />
      ))}
      {points.map((point, index) => (
        <circle
          key={`point-${index}`}
          cx={point.x}
          cy={point.y}
          r={index % 3 === 0 ? 3 : 1.8}
          fill={index % 3 === 0 ? accent : ink}
        />
      ))}
    </>
  );
}

function Motif(preview: PatternPreviewData): JSX.Element {
  switch (preview.motif) {
    case 'arches':
      return <ArchesMotif {...preview} />;
    case 'botanical-trace':
      return <BotanicalMotif {...preview} />;
    case 'constellation':
      return <ConstellationMotif {...preview} />;
    case 'cut-stone':
      return <CutStoneMotif {...preview} />;
    case 'paper-fold':
      return <FoldMotif {...preview} />;
    case 'terrazzo':
      return <TerrazzoMotif {...preview} />;
    case 'tile':
      return <TileMotif {...preview} />;
    case 'wave':
      return <WaveMotif {...preview} />;
    case 'weave':
      return <WeaveMotif {...preview} />;
    case 'grid':
    default:
      return <GridMotif {...preview} />;
  }
}

export function PatternPreview({ preview, label }: PatternPreviewProps): JSX.Element {
  return (
    <svg
      className="pattern-preview-svg"
      viewBox="0 0 240 240"
      role="img"
      aria-label={label}
      style={{ background: preview.paper }}
    >
      <rect x="0" y="0" width="240" height="240" fill={preview.paper} />
      <Motif {...preview} />
    </svg>
  );
}
