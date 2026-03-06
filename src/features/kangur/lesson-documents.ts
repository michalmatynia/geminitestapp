import {
  KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
  type KangurLessonComponentId,
  type KangurLessonDocument,
  type KangurLessonDocumentStore,
  type KangurLessonGridBlock,
  type KangurLessonGridItem,
  type KangurLessonInlineBlock,
  type KangurLessonRootBlock,
  type KangurLessonSvgBlock,
  type KangurLessonTextBlock,
} from '@/shared/contracts/kangur';
import { parseJsonSetting, sanitizeHtml, sanitizeSvg } from '@/shared/utils';

export { KANGUR_LESSON_DOCUMENTS_SETTING_KEY };

const DEFAULT_SVG_VIEWBOX = '0 0 100 100';

export const KANGUR_LESSON_GRID_TEMPLATE_IDS = [
  'two-column',
  'three-column',
  'hero-left',
  'hero-right',
  'svg-duo',
  'svg-trio',
  'svg-gallery',
  'svg-mosaic',
] as const;
export type KangurLessonGridTemplateId = (typeof KANGUR_LESSON_GRID_TEMPLATE_IDS)[number];

export const KANGUR_LESSON_DOCUMENT_TEMPLATE_IDS = [
  'article',
  'text-with-figure',
  'svg-gallery-page',
  'svg-mosaic-page',
] as const;
export type KangurLessonDocumentTemplateId =
  (typeof KANGUR_LESSON_DOCUMENT_TEMPLATE_IDS)[number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeText = (value: unknown, fallback: string, maxLength: number): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
};

const stripHtmlToText = (value: string): string =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapeHtmlText = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;');

const normalizeInteger = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.trunc(value);
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clampGridColumnStart = (
  columnStart: number | null,
  colSpan: number,
  columns: number
): number | null => {
  if (columnStart === null) {
    return null;
  }

  const maxColumnStart = Math.max(1, columns - colSpan + 1);
  return clamp(columnStart, 1, maxColumnStart);
};

const createRandomId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createKangurLessonBlockId = (prefix: string): string => createRandomId(prefix);

export const createKangurLessonTextBlock = (): KangurLessonTextBlock => ({
  id: createKangurLessonBlockId('lesson-text'),
  type: 'text',
  html: '<p>Start writing your lesson content here.</p>',
  ttsText: '',
  align: 'left',
});

export const createKangurLessonSvgBlock = (): KangurLessonSvgBlock => ({
  id: createKangurLessonBlockId('lesson-svg'),
  type: 'svg',
  title: 'Vector illustration',
  ttsDescription: '',
  markup:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect x="16" y="16" width="168" height="88" rx="18" fill="#dbeafe" stroke="#2563eb" stroke-width="6"/><circle cx="64" cy="60" r="18" fill="#60a5fa"/><path d="M98 76 L126 44 L154 76" fill="none" stroke="#1d4ed8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  viewBox: '0 0 200 120',
  align: 'center',
  fit: 'contain',
  maxWidth: 420,
});

export const createKangurLessonGridItem = (
  block: KangurLessonInlineBlock = createKangurLessonTextBlock()
): KangurLessonGridItem => ({
  id: createKangurLessonBlockId('lesson-grid-item'),
  colSpan: 1,
  rowSpan: 1,
  columnStart: null,
  rowStart: null,
  block,
});

export const createKangurLessonGridBlockFromTemplate = (
  templateId: KangurLessonGridTemplateId = 'two-column'
): KangurLessonGridBlock => {
  switch (templateId) {
    case 'three-column':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 16,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonTextBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonTextBlock()),
        ],
      };
    case 'hero-left':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 20,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          {
            ...createKangurLessonGridItem(createKangurLessonTextBlock()),
            colSpan: 2,
          },
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
        ],
      };
    case 'hero-right':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 20,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          {
            ...createKangurLessonGridItem(createKangurLessonTextBlock()),
            colSpan: 2,
          },
        ],
      };
    case 'svg-duo':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 2,
        gap: 16,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
        ],
      };
    case 'svg-trio':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 16,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
        ],
      };
    case 'svg-gallery':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 2,
        gap: 18,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
        ],
      };
    case 'svg-mosaic':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 18,
        rowHeight: 180,
        denseFill: true,
        stackOnMobile: true,
        items: [
          {
            ...createKangurLessonGridItem(createKangurLessonSvgBlock()),
            colSpan: 2,
            rowSpan: 2,
            columnStart: 1,
            rowStart: 1,
          },
          {
            ...createKangurLessonGridItem(createKangurLessonSvgBlock()),
            columnStart: 3,
            rowStart: 1,
          },
          {
            ...createKangurLessonGridItem(createKangurLessonSvgBlock()),
            columnStart: 3,
            rowStart: 2,
          },
          {
            ...createKangurLessonGridItem(createKangurLessonSvgBlock()),
            columnStart: 1,
            rowStart: 3,
          },
        ],
      };
    case 'two-column':
    default:
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 2,
        gap: 16,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonTextBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
        ],
      };
  }
};

export const createKangurLessonGridBlock = (): KangurLessonGridBlock =>
  createKangurLessonGridBlockFromTemplate('two-column');

export const convertKangurLessonInlineBlockType = (
  block: KangurLessonInlineBlock,
  nextType: KangurLessonInlineBlock['type']
): KangurLessonInlineBlock => {
  if (block.type === nextType) {
    return block;
  }

  if (nextType === 'svg') {
    const nextBlock = createKangurLessonSvgBlock();
    const derivedTitle =
      block.type === 'text'
        ? normalizeText(stripHtmlToText(block.html), nextBlock.title, 120)
        : nextBlock.title;
    const derivedDescription =
      block.type === 'text'
        ? normalizeText(block.ttsText ?? stripHtmlToText(block.html), '', 2_000)
        : nextBlock.ttsDescription;

    return {
      ...nextBlock,
      id: block.id,
      align: block.align,
      title: derivedTitle,
      ttsDescription: derivedDescription,
    };
  }

  const nextBlock = createKangurLessonTextBlock();
  const derivedHtml =
    block.type === 'svg' && block.title.trim().length > 0
      ? `<p>${escapeHtmlText(block.title.trim())}</p>`
      : nextBlock.html;
  const derivedTtsText =
    block.type === 'svg'
      ? normalizeText(block.ttsDescription ?? block.title, '', 10_000)
      : nextBlock.ttsText;

  return {
    ...nextBlock,
    id: block.id,
    align: block.align,
    html: derivedHtml,
    ttsText: derivedTtsText,
  };
};

export const cloneKangurLessonInlineBlock = (
  block: KangurLessonInlineBlock
): KangurLessonInlineBlock => {
  if (block.type === 'svg') {
    return {
      ...block,
      id: createKangurLessonBlockId('lesson-svg'),
    };
  }

  return {
    ...block,
    id: createKangurLessonBlockId('lesson-text'),
  };
};

export const cloneKangurLessonGridItem = (item: KangurLessonGridItem): KangurLessonGridItem => ({
  ...item,
  id: createKangurLessonBlockId('lesson-grid-item'),
  block: cloneKangurLessonInlineBlock(item.block),
});

export const cloneKangurLessonRootBlock = (
  block: KangurLessonRootBlock
): KangurLessonRootBlock => {
  if (block.type === 'grid') {
    return {
      ...block,
      id: createKangurLessonBlockId('lesson-grid'),
      items: block.items.map(cloneKangurLessonGridItem),
    };
  }

  return cloneKangurLessonInlineBlock(block);
};

export const createDefaultKangurLessonDocument = (): KangurLessonDocument => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  blocks: [createKangurLessonTextBlock()],
});

export const createKangurLessonDocumentFromTemplate = (
  templateId: KangurLessonDocumentTemplateId = 'article'
): KangurLessonDocument => {
  switch (templateId) {
    case 'text-with-figure':
      return {
        version: 1,
        updatedAt: new Date().toISOString(),
        blocks: [
          createKangurLessonTextBlock(),
          createKangurLessonGridBlockFromTemplate('hero-right'),
        ],
      };
    case 'svg-gallery-page':
      return {
        version: 1,
        updatedAt: new Date().toISOString(),
        blocks: [
          createKangurLessonTextBlock(),
          createKangurLessonGridBlockFromTemplate('svg-gallery'),
        ],
      };
    case 'svg-mosaic-page':
      return {
        version: 1,
        updatedAt: new Date().toISOString(),
        blocks: [
          createKangurLessonTextBlock(),
          createKangurLessonGridBlockFromTemplate('svg-mosaic'),
        ],
      };
    case 'article':
    default:
      return createDefaultKangurLessonDocument();
  }
};

export const resolveStarterKangurLessonDocumentTemplate = (
  componentId: KangurLessonComponentId
): KangurLessonDocumentTemplateId => {
  if (componentId.startsWith('geometry_')) {
    return 'svg-mosaic-page';
  }

  if (componentId.startsWith('logical_')) {
    return 'article';
  }

  return 'text-with-figure';
};

export const createStarterKangurLessonDocument = (
  componentId: KangurLessonComponentId
): KangurLessonDocument =>
  createKangurLessonDocumentFromTemplate(resolveStarterKangurLessonDocumentTemplate(componentId));

const normalizeTextAlign = (value: unknown): KangurLessonTextBlock['align'] => {
  if (value === 'center' || value === 'right') return value;
  return 'left';
};

const normalizeSvgAlign = (value: unknown): KangurLessonSvgBlock['align'] => {
  if (value === 'left' || value === 'right') return value;
  return 'center';
};

const normalizeSvgFit = (value: unknown): KangurLessonSvgBlock['fit'] => {
  if (value === 'cover' || value === 'none') return value;
  return 'contain';
};

const normalizeTextBlock = (value: unknown): KangurLessonTextBlock | null => {
  if (!isRecord(value)) return null;
  return {
    id: normalizeText(value['id'], createKangurLessonBlockId('lesson-text'), 120),
    type: 'text',
    html: sanitizeHtml(typeof value['html'] === 'string' ? value['html'] : ''),
    ttsText: normalizeText(value['ttsText'], '', 10_000),
    align: normalizeTextAlign(value['align']),
  };
};

const normalizeSvgBlock = (value: unknown): KangurLessonSvgBlock | null => {
  if (!isRecord(value)) return null;

  const viewBox = normalizeText(value['viewBox'], DEFAULT_SVG_VIEWBOX, 80);

  return {
    id: normalizeText(value['id'], createKangurLessonBlockId('lesson-svg'), 120),
    type: 'svg',
    title: normalizeText(value['title'], '', 120),
    ttsDescription: normalizeText(value['ttsDescription'], '', 2_000),
    markup: sanitizeSvg(typeof value['markup'] === 'string' ? value['markup'] : '', {
      viewBox,
    }),
    viewBox,
    align: normalizeSvgAlign(value['align']),
    fit: normalizeSvgFit(value['fit']),
    maxWidth: clamp(normalizeInteger(value['maxWidth'], 420), 120, 1_200),
  };
};

const normalizeInlineBlock = (value: unknown): KangurLessonInlineBlock | null => {
  if (!isRecord(value)) return null;
  if (value['type'] === 'svg') return normalizeSvgBlock(value);
  return normalizeTextBlock(value);
};

const normalizeGridItem = (
  value: unknown,
  columns: number,
  index: number
): KangurLessonGridItem | null => {
  if (!isRecord(value)) return null;
  const block = normalizeInlineBlock(value['block']);
  if (!block) return null;

  const colSpan = clamp(normalizeInteger(value['colSpan'], 1), 1, columns);
  const rowSpan = clamp(normalizeInteger(value['rowSpan'], 1), 1, 4);
  const columnStartRaw =
    value['columnStart'] === null || value['columnStart'] === undefined
      ? null
      : clamp(normalizeInteger(value['columnStart'], 1), 1, columns);

  return {
    id: normalizeText(value['id'], `lesson-grid-item-${index + 1}`, 120),
    colSpan,
    rowSpan,
    columnStart: clampGridColumnStart(columnStartRaw, colSpan, columns),
    rowStart:
      value['rowStart'] === null || value['rowStart'] === undefined
        ? null
        : clamp(normalizeInteger(value['rowStart'], 1), 1, 12),
    block,
  };
};

const normalizeGridBlock = (value: unknown): KangurLessonGridBlock | null => {
  if (!isRecord(value)) return null;

  const columns = clamp(normalizeInteger(value['columns'], 2), 1, 4);
  const items = Array.isArray(value['items'])
    ? value['items']
      .map((entry, index) => normalizeGridItem(entry, columns, index))
      .filter((entry): entry is KangurLessonGridItem => Boolean(entry))
      .slice(0, 24)
    : [];

  return {
    id: normalizeText(value['id'], createKangurLessonBlockId('lesson-grid'), 120),
    type: 'grid',
    columns,
    gap: clamp(normalizeInteger(value['gap'], 16), 0, 48),
    rowHeight: clamp(normalizeInteger(value['rowHeight'], 220), 120, 480),
    denseFill: value['denseFill'] === true,
    stackOnMobile: value['stackOnMobile'] !== false,
    items,
  };
};

const normalizeRootBlock = (value: unknown): KangurLessonRootBlock | null => {
  if (!isRecord(value)) return null;
  if (value['type'] === 'svg') return normalizeSvgBlock(value);
  if (value['type'] === 'grid') return normalizeGridBlock(value);
  return normalizeTextBlock(value);
};

export const normalizeKangurLessonDocument = (value: unknown): KangurLessonDocument => {
  if (!isRecord(value)) {
    return createDefaultKangurLessonDocument();
  }

  const blocks = Array.isArray(value['blocks'])
    ? value['blocks']
      .map(normalizeRootBlock)
      .filter((entry): entry is KangurLessonRootBlock => Boolean(entry))
      .slice(0, 64)
    : [];

  const updatedAt =
    typeof value['updatedAt'] === 'string' && value['updatedAt'].trim()
      ? value['updatedAt']
      : undefined;

  return {
    version: 1,
    blocks,
    updatedAt,
  };
};

export const canonicalizeKangurLessonDocument = (
  document: KangurLessonDocument
): KangurLessonDocument => normalizeKangurLessonDocument(document);

export const parseKangurLessonDocument = (
  raw: string | null | undefined
): KangurLessonDocument | null => {
  const parsed = parseJsonSetting<unknown>(raw, null);
  return parsed ? normalizeKangurLessonDocument(parsed) : null;
};

export const normalizeKangurLessonDocumentStore = (
  value: unknown
): KangurLessonDocumentStore => {
  if (!isRecord(value)) return {};

  const normalized: KangurLessonDocumentStore = {};
  for (const [lessonId, rawDocument] of Object.entries(value)) {
    const normalizedLessonId = lessonId.trim();
    if (!normalizedLessonId) continue;
    normalized[normalizedLessonId] = normalizeKangurLessonDocument(rawDocument);
  }

  return normalized;
};

export const canonicalizeKangurLessonDocumentStore = (
  store: KangurLessonDocumentStore
): KangurLessonDocumentStore => normalizeKangurLessonDocumentStore(store);

export const parseKangurLessonDocumentStore = (
  raw: string | null | undefined
): KangurLessonDocumentStore =>
  normalizeKangurLessonDocumentStore(parseJsonSetting<unknown>(raw, {}));

export const hasKangurLessonDocumentContent = (
  document: KangurLessonDocument | null | undefined
): boolean => {
  if (!document) return false;

  return document.blocks.some((block) => {
    if (block.type === 'text') {
      return block.html.replace(/<[^>]+>/g, '').trim().length > 0;
    }

    if (block.type === 'svg') {
      return block.markup.trim().length > 0;
    }

    return block.items.some((item) => {
      if (item.block.type === 'text') {
        return item.block.html.replace(/<[^>]+>/g, '').trim().length > 0;
      }
      return item.block.markup.trim().length > 0;
    });
  });
};

export const updateKangurLessonDocumentTimestamp = (
  document: KangurLessonDocument
): KangurLessonDocument => ({
  ...canonicalizeKangurLessonDocument(document),
  updatedAt: new Date().toISOString(),
});

export const removeKangurLessonDocument = (
  store: KangurLessonDocumentStore,
  lessonId: string
): KangurLessonDocumentStore => {
  if (!(lessonId in store)) {
    return store;
  }

  const nextStore = { ...store };
  delete nextStore[lessonId];
  return nextStore;
};
