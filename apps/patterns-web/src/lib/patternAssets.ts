import type { PatternProduct } from './types';

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const range = (count: number): number[] =>
  Array.from({ length: count }, (_, index) => index);

function gridMotif(pattern: PatternProduct): string {
  const { ink, accent, density } = pattern.preview;
  const step = 240 / density;
  const lines = range(density + 1).map((index) => {
    const pos = Math.round(index * step);
    return `<line x1="${pos}" y1="0" x2="${pos}" y2="240" stroke="${ink}" stroke-width="0.8" opacity="0.5"/><line x1="0" y1="${pos}" x2="240" y2="${pos}" stroke="${ink}" stroke-width="0.8" opacity="0.5"/>`;
  });
  const dots = range(density).map((index) => {
    const x = 18 + ((index * 43) % 196);
    const y = 24 + ((index * 67) % 182);
    return `<circle cx="${x}" cy="${y}" r="2.4" fill="${accent}"/>`;
  });
  return [...lines, ...dots].join('');
}

function archMotif(pattern: PatternProduct): string {
  const { ink, accent, density } = pattern.preview;
  const cols = Math.max(3, Math.min(6, density));
  const width = 240 / cols;
  return range(cols * 2).map((index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * width + 8;
    const y = row * 104 + 116;
    const stroke = index % 2 === 0 ? ink : accent;
    return `<path d="M ${x} ${y} V ${y - 44} C ${x} ${y - 76}, ${x + width - 16} ${y - 76}, ${x + width - 16} ${y - 44} V ${y}" fill="none" stroke="${stroke}" stroke-width="1.8"/>`;
  }).join('');
}

function botanicalMotif(pattern: PatternProduct): string {
  const { ink, accent, density } = pattern.preview;
  return range(density).map((index) => {
    const x = 28 + ((index * 41) % 184);
    const y = 26 + ((index * 59) % 184);
    const flip = index % 2 === 0 ? 1 : -1;
    return `<g transform="translate(${x} ${y})"><path d="M 0 34 C ${10 * flip} 18, ${-12 * flip} 7, ${4 * flip} -28" fill="none" stroke="${ink}" stroke-width="1.1"/><path d="M ${3 * flip} 4 C ${24 * flip} -5, ${24 * flip} 16, ${4 * flip} 17 C ${18 * flip} 11, ${17 * flip} 4, ${3 * flip} 4 Z" fill="none" stroke="${accent}" stroke-width="1"/><circle cx="${-5 * flip}" cy="25" r="1.8" fill="${accent}"/></g>`;
  }).join('');
}

function lineMotif(pattern: PatternProduct): string {
  const { ink, accent, density, motif } = pattern.preview;
  if (motif === 'arches') return archMotif(pattern);
  if (motif === 'botanical-trace') return botanicalMotif(pattern);
  if (motif === 'wave') {
    return range(density + 2).map((index) => {
      const y = 18 + index * (204 / (density + 1));
      const stroke = index % 2 === 0 ? ink : accent;
      return `<path d="M -18 ${y} C 20 ${y - 22}, 58 ${y + 22}, 96 ${y} S 172 ${y - 22}, 258 ${y}" fill="none" stroke="${stroke}" stroke-width="1.4" opacity="0.68"/>`;
    }).join('');
  }

  if (motif === 'terrazzo') {
    return range(density * 3).map((index) => {
      const x = 14 + ((index * 47) % 212);
      const y = 16 + ((index * 61) % 208);
      const size = 5 + (index % 4) * 4;
      const fill = index % 3 === 0 ? accent : ink;
      const opacity = index % 3 === 0 ? 0.55 : 0.22;
      return `<path d="M ${x} ${y} l ${size} ${size / 3} l ${-size / 4} ${size} l ${-size} ${-size / 2} Z" fill="${fill}" opacity="${opacity}"/>`;
    }).join('');
  }

  return gridMotif(pattern);
}

export function renderPatternSvg(pattern: PatternProduct): string {
  const { paper } = pattern.preview;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" role="img" aria-label="${escapeXml(pattern.name)}">
  <title>${escapeXml(pattern.name)}</title>
  <desc>${escapeXml(pattern.description)}</desc>
  <rect x="0" y="0" width="240" height="240" fill="${paper}"/>
  ${lineMotif(pattern)}
  <metadata>${escapeXml(JSON.stringify({
    id: pattern.id,
    slug: pattern.slug,
    collection: pattern.collection,
    edition: pattern.edition,
    license: 'Downloaded from Milk Bar Patterns local catalog',
  }))}</metadata>
</svg>`;
}
