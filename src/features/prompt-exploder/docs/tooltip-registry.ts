'use client';

import { PROMPT_EXPLODER_DOC_CATALOG } from './catalog';

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const DOCS_BY_ID = new Map(PROMPT_EXPLODER_DOC_CATALOG.map((doc) => [doc.id, doc]));

const DOCS_BY_ALIAS = new Map<string, (typeof PROMPT_EXPLODER_DOC_CATALOG)[number]>();
for (const doc of PROMPT_EXPLODER_DOC_CATALOG) {
  for (const alias of doc.aliases) {
    DOCS_BY_ALIAS.set(normalize(alias), doc);
  }
}

const findByAlias = (value: string) => {
  const normalized = normalize(value);
  if (!normalized) return null;
  const direct = DOCS_BY_ALIAS.get(normalized);
  if (direct) return direct;
  for (const [alias, doc] of DOCS_BY_ALIAS.entries()) {
    if (normalized.includes(alias) || alias.includes(normalized)) return doc;
  }
  return null;
};

export const resolvePromptExploderTooltipDoc = (element: HTMLElement) => {
  const docId = element.getAttribute('data-doc-id');
  if (docId && DOCS_BY_ID.has(docId)) {
    return DOCS_BY_ID.get(docId) ?? null;
  }

  const candidates = [
    element.getAttribute('aria-label'),
    element.getAttribute('title'),
    element.getAttribute('placeholder'),
    element.getAttribute('name'),
    element.getAttribute('id'),
    element.getAttribute('data-doc-alias'),
    element.textContent,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = findByAlias(candidate);
    if (match) return match;
  }

  return null;
};

export const buildPromptExploderTooltipText = (
  doc: (typeof PROMPT_EXPLODER_DOC_CATALOG)[number]
): string =>
  `${doc.title}: ${doc.summary} [${doc.section}] · Docs: ${doc.docPath}`;

export const promptExploderGenericTooltip = (element: HTMLElement): string => {
  const fallbackDoc =
    DOCS_BY_ID.get('workflow_overview') ?? PROMPT_EXPLODER_DOC_CATALOG[0];
  const elementLabel =
    element.getAttribute('aria-label')?.trim() ||
    element.getAttribute('placeholder')?.trim() ||
    element.textContent?.trim() ||
    element.getAttribute('id')?.trim() ||
    element.tagName.toLowerCase();
  if (!fallbackDoc) {
    return `Prompt Exploder control: ${elementLabel}`;
  }
  return `${buildPromptExploderTooltipText(fallbackDoc)} · Control: ${elementLabel}`;
};
