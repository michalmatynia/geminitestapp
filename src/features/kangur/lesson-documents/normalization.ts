import {
  type KangurLessonActivityBlock,
  type KangurLessonCalloutBlock,
  type KangurLessonDocument,
  type KangurLessonGridBlock,
  type KangurLessonGridItem,
  type KangurLessonImageBlock,
  type KangurLessonInlineBlock,
  type KangurLessonPage,
  type KangurLessonQuizBlock,
  type KangurLessonQuizChoice,
  type KangurLessonRootBlock,
  type KangurLessonSvgBlock,
  type KangurLessonTextBlock,
} from '@/features/kangur/shared/contracts/kangur';
import { sanitizeHtml, sanitizeSvg } from '@/features/kangur/shared/utils';

import { applyKangurLessonActivityDefaults } from '../lesson-activities';
import {
  createKangurLessonBlockId,
  createKangurLessonPage,
  createKangurLessonTextBlock,
  flattenKangurLessonDocumentPages,
} from './creators';
import {
  clamp,
  clampGridColumnStart,
  DEFAULT_IMAGE_SRC,
  DEFAULT_SVG_VIEWBOX,
  isRecord,
  normalizeDocumentNarration,
  normalizeInteger,
  normalizeText,
} from './utils';

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

const normalizeImageSource = (value: unknown): string => {
  if (typeof value !== 'string') return DEFAULT_IMAGE_SRC;
  const trimmed = value.trim().slice(0, 2_000);
  if (!trimmed || /^javascript:/i.test(trimmed)) {
    return DEFAULT_IMAGE_SRC;
  }
  return trimmed;
};

export const normalizeTextBlock = (value: unknown): KangurLessonTextBlock | null => {
  if (!isRecord(value)) return null;
  return {
    id: normalizeText(value['id'], createKangurLessonBlockId('lesson-text'), 120),
    type: 'text',
    html: sanitizeHtml(typeof value['html'] === 'string' ? value['html'] : ''),
    ttsText: normalizeText(value['ttsText'], '', 10_000),
    align: normalizeTextAlign(value['align']),
  };
};

export const normalizeSvgBlock = (value: unknown): KangurLessonSvgBlock | null => {
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

export const normalizeImageBlock = (value: unknown): KangurLessonImageBlock | null => {
  if (!isRecord(value)) return null;

  return {
    id: normalizeText(value['id'], createKangurLessonBlockId('lesson-image'), 120),
    type: 'image',
    title: normalizeText(value['title'], '', 120),
    altText: normalizeText(value['altText'], '', 300),
    caption: normalizeText(value['caption'], '', 300),
    ttsDescription: normalizeText(value['ttsDescription'], '', 2_000),
    src: normalizeImageSource(value['src'] ?? value['imageUrl'] ?? value['url']),
    align: normalizeSvgAlign(value['align']),
    fit: normalizeSvgFit(value['fit']),
    maxWidth: clamp(normalizeInteger(value['maxWidth'], 480), 120, 1_200),
  };
};

export const normalizeActivityBlock = (value: unknown): KangurLessonActivityBlock | null => {
  if (!isRecord(value)) return null;

  const activityId =
    value['activityId'] === 'adding-ball' ||
    value['activityId'] === 'adding-synthesis' ||
    value['activityId'] === 'subtracting-game' ||
    value['activityId'] === 'multiplication-array' ||
    value['activityId'] === 'multiplication-quiz' ||
    value['activityId'] === 'division-game' ||
    value['activityId'] === 'geometry-drawing' ||
    value['activityId'] === 'calendar-interactive' ||
    value['activityId'] === 'clock-training'
      ? value['activityId']
      : 'clock-training';
  const defaults = applyKangurLessonActivityDefaults(activityId);

  return {
    id: normalizeText(value['id'], createKangurLessonBlockId('lesson-activity'), 120),
    type: 'activity',
    activityId,
    title: normalizeText(value['title'], defaults.title, 120),
    description: normalizeText(value['description'], defaults.description ?? '', 500),
    ttsDescription: normalizeText(value['ttsDescription'], '', 2_000),
  };
};

export const normalizeInlineBlock = (value: unknown): KangurLessonInlineBlock | null => {
  if (!isRecord(value)) return null;
  if (value['type'] === 'svg') return normalizeSvgBlock(value);
  if (value['type'] === 'image') return normalizeImageBlock(value);
  return normalizeTextBlock(value);
};

export const normalizeGridItem = (
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

export const normalizeGridBlock = (value: unknown): KangurLessonGridBlock | null => {
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

const normalizeCalloutVariant = (value: unknown): KangurLessonCalloutBlock['variant'] => {
  if (value === 'tip' || value === 'warning' || value === 'success') return value;
  return 'info';
};

export const normalizeCalloutBlock = (value: unknown): KangurLessonCalloutBlock | null => {
  if (!isRecord(value)) return null;
  return {
    id: normalizeText(value['id'], createKangurLessonBlockId('lesson-callout'), 120),
    type: 'callout',
    variant: normalizeCalloutVariant(value['variant']),
    title: normalizeText(value['title'], '', 120),
    html: sanitizeHtml(typeof value['html'] === 'string' ? value['html'] : ''),
    ttsText: normalizeText(value['ttsText'], '', 2_000),
  };
};

const normalizeQuizChoice = (value: unknown, index: number): KangurLessonQuizChoice | null => {
  if (!isRecord(value)) return null;
  return {
    id: normalizeText(value['id'], createKangurLessonBlockId(`quiz-choice-${index}`), 120),
    text: normalizeText(value['text'], '', 500),
  };
};

export const normalizeQuizBlock = (value: unknown): KangurLessonQuizBlock | null => {
  if (!isRecord(value)) return null;

  const rawChoices = Array.isArray(value['choices']) ? value['choices'] : [];
  const choices = rawChoices
    .map((entry, i) => normalizeQuizChoice(entry, i))
    .filter((entry): entry is KangurLessonQuizChoice => Boolean(entry))
    .slice(0, 4);

  // Ensure minimum 2 choices
  while (choices.length < 2) {
    choices.push({ id: createKangurLessonBlockId('quiz-choice-pad'), text: '' });
  }

  const correctChoiceId = normalizeText(value['correctChoiceId'], '', 120);
  const validCorrectChoiceId = choices.some((c) => c.id === correctChoiceId)
    ? correctChoiceId
    : '';

  return {
    id: normalizeText(value['id'], createKangurLessonBlockId('lesson-quiz'), 120),
    type: 'quiz',
    question: sanitizeHtml(typeof value['question'] === 'string' ? value['question'] : ''),
    choices,
    correctChoiceId: validCorrectChoiceId,
    explanation: typeof value['explanation'] === 'string'
      ? sanitizeHtml(value['explanation'])
      : undefined,
    ttsText: normalizeText(value['ttsText'], '', 2_000),
  };
};

export const normalizeRootBlock = (value: unknown): KangurLessonRootBlock | null => {
  if (!isRecord(value)) return null;
  if (value['type'] === 'svg') return normalizeSvgBlock(value);
  if (value['type'] === 'image') return normalizeImageBlock(value);
  if (value['type'] === 'activity') return normalizeActivityBlock(value);
  if (value['type'] === 'grid') return normalizeGridBlock(value);
  if (value['type'] === 'callout') return normalizeCalloutBlock(value);
  if (value['type'] === 'quiz') return normalizeQuizBlock(value);
  return normalizeTextBlock(value);
};

export const normalizePage = (value: unknown): KangurLessonPage | null => {
  if (!isRecord(value)) return null;
  const blocks = Array.isArray(value['blocks'])
    ? value['blocks']
      .map(normalizeRootBlock)
      .filter((entry): entry is KangurLessonRootBlock => Boolean(entry))
      .slice(0, 48)
    : [];

  return {
    id: normalizeText(value['id'], createKangurLessonBlockId('lesson-page'), 120),
    sectionKey: normalizeText(value['sectionKey'], '', 120),
    sectionTitle: normalizeText(value['sectionTitle'], '', 120),
    sectionDescription: normalizeText(value['sectionDescription'], '', 240),
    title: normalizeText(value['title'], '', 120),
    description: normalizeText(value['description'], '', 240),
    blocks,
  };
};

export const normalizeKangurLessonDocument = (value: unknown): KangurLessonDocument => {
  if (!isRecord(value)) {
    const defaultPages = [createKangurLessonPage('', [createKangurLessonTextBlock()])];
    return {
      version: 1,
      narration: {
        voice: 'coral',
        locale: 'pl-PL',
      },
      updatedAt: new Date().toISOString(),
      pages: defaultPages,
      blocks: flattenKangurLessonDocumentPages(defaultPages),
    };
  }

  const legacyBlocks = Array.isArray(value['blocks'])
    ? value['blocks']
      .map(normalizeRootBlock)
      .filter((entry): entry is KangurLessonRootBlock => Boolean(entry))
      .slice(0, 256)
    : [];
  const normalizedPages = Array.isArray(value['pages'])
    ? value['pages']
      .map((entry) => normalizePage(entry))
      .filter((entry): entry is KangurLessonPage => Boolean(entry))
      .slice(0, 24)
    : [];
  const pages =
    normalizedPages.length > 0 ? normalizedPages : [createKangurLessonPage('', legacyBlocks)];
  const blocks = flattenKangurLessonDocumentPages(pages);

  const updatedAt =
    typeof value['updatedAt'] === 'string' && value['updatedAt'].trim()
      ? value['updatedAt']
      : undefined;

  return {
    version: 1,
    blocks,
    pages,
    narration: normalizeDocumentNarration(value['narration']),
    updatedAt,
  };
};
