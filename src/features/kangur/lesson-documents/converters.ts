import {
  type KangurLessonActivityBlock,
  type KangurLessonCalloutBlock,
  type KangurLessonGridBlock,
  type KangurLessonGridItem,
  type KangurLessonInlineBlock,
  type KangurLessonPage,
  type KangurLessonQuizBlock,
  type KangurLessonRootBlock,
} from '@/features/kangur/shared/contracts/kangur';

import {
  createKangurLessonActivityBlock,
  createKangurLessonBlockId,
  createKangurLessonImageBlock,
  createKangurLessonSvgBlock,
  createKangurLessonTextBlock,
} from './creators';
import { escapeHtmlText, normalizeText, stripHtmlToText } from './utils';

const trimInlineTextCandidate = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
};

const resolveInlineBlockTitleSource = (block: KangurLessonInlineBlock): string =>
  block.type === 'text' ? stripHtmlToText(block.html) : block.title;

const resolveInlineBlockNarrationSource = (block: KangurLessonInlineBlock): string => {
  if (block.type === 'text') {
    return block.ttsText ?? stripHtmlToText(block.html);
  }
  if (block.type === 'image') {
    return block.ttsDescription ?? block.caption ?? block.altText ?? block.title;
  }
  return block.ttsDescription ?? block.title;
};

const resolveInlineImageAltSource = (block: KangurLessonInlineBlock): string =>
  block.type === 'text'
    ? stripHtmlToText(block.html)
    : block.type === 'svg'
      ? block.title
      : block.altText ?? block.title;

const resolveInlineTextHtmlSource = (block: KangurLessonInlineBlock): string | null => {
  if (block.type === 'text') {
    return null;
  }
  return trimInlineTextCandidate(block.title) ??
    (block.type === 'image' ? trimInlineTextCandidate(block.caption) : null);
};

const deriveInlineBlockTitle = (
  block: KangurLessonInlineBlock,
  fallback: string
): string => normalizeText(resolveInlineBlockTitleSource(block), fallback, 120);

const deriveInlineBlockDescription = (
  block: KangurLessonInlineBlock,
  fallback: string,
  maxLength: number
): string => normalizeText(resolveInlineBlockNarrationSource(block), fallback, maxLength);

const buildConvertedSvgBlock = (block: KangurLessonInlineBlock): KangurLessonInlineBlock => {
  const nextBlock = createKangurLessonSvgBlock();
  return {
    ...nextBlock,
    id: block.id,
    align: block.align,
    title: deriveInlineBlockTitle(block, nextBlock.title),
    ttsDescription: deriveInlineBlockDescription(block, '', 2_000),
  };
};

const buildConvertedImageBlock = (block: KangurLessonInlineBlock): KangurLessonInlineBlock => {
  const nextBlock = createKangurLessonImageBlock();
  return {
    ...nextBlock,
    id: block.id,
    align: block.align,
    title: deriveInlineBlockTitle(block, nextBlock.title),
    altText: normalizeText(resolveInlineImageAltSource(block), '', 300),
    ttsDescription: deriveInlineBlockDescription(block, '', 2_000),
  };
};

const buildConvertedTextBlock = (block: KangurLessonInlineBlock): KangurLessonInlineBlock => {
  const nextBlock = createKangurLessonTextBlock();
  const htmlSource = resolveInlineTextHtmlSource(block);
  return {
    ...nextBlock,
    id: block.id,
    align: block.align,
    html: htmlSource ? `<p>${escapeHtmlText(htmlSource)}</p>` : nextBlock.html,
    ttsText:
      block.type === 'text' ? nextBlock.ttsText : deriveInlineBlockDescription(block, '', 10_000),
  };
};

const INLINE_BLOCK_TYPE_CONVERTERS: Record<
  KangurLessonInlineBlock['type'],
  (block: KangurLessonInlineBlock) => KangurLessonInlineBlock
> = {
  svg: buildConvertedSvgBlock,
  image: buildConvertedImageBlock,
  text: buildConvertedTextBlock,
};

export const convertKangurLessonInlineBlockType = (
  block: KangurLessonInlineBlock,
  nextType: KangurLessonInlineBlock['type']
): KangurLessonInlineBlock =>
  block.type === nextType ? block : INLINE_BLOCK_TYPE_CONVERTERS[nextType](block);

export const convertKangurLessonRootBlockType = (
  block: Exclude<KangurLessonRootBlock, KangurLessonGridBlock | KangurLessonCalloutBlock | KangurLessonQuizBlock>,
  nextType: Exclude<KangurLessonRootBlock['type'], 'grid' | 'callout' | 'quiz'>
): Exclude<KangurLessonRootBlock, KangurLessonGridBlock | KangurLessonCalloutBlock | KangurLessonQuizBlock> => {
  if (block.type === nextType) {
    return block;
  }

  if (nextType === 'activity') {
    const nextBlock = createKangurLessonActivityBlock();
    const derivedTitle =
      block.type === 'text'
        ? normalizeText(stripHtmlToText(block.html), nextBlock.title, 120)
        : normalizeText(block.title, nextBlock.title, 120);
    const derivedDescription =
      block.type === 'text'
        ? normalizeText(
          block.ttsText ?? stripHtmlToText(block.html),
          nextBlock.description ?? '',
          500
        )
        : normalizeText(
          block.type === 'image'
            ? (block.caption ?? block.altText ?? block.title)
            : (block.ttsDescription ?? block.title),
          nextBlock.description ?? '',
          500
        );
    const derivedTtsDescription =
      block.type === 'text'
        ? normalizeText(block.ttsText ?? stripHtmlToText(block.html), '', 2_000)
        : normalizeText(
          block.type === 'image'
            ? (block.ttsDescription ?? block.caption ?? block.altText ?? block.title)
            : (block.ttsDescription ?? block.title),
          '',
          2_000
        );

    return {
      ...nextBlock,
      id: block.id,
      title: derivedTitle,
      description: derivedDescription,
      ttsDescription: derivedTtsDescription,
    };
  }

  if (block.type === 'activity') {
    const nextInlineType =
      nextType === 'text' || nextType === 'svg' || nextType === 'image' ? nextType : 'text';
    const nextBlock = convertKangurLessonInlineBlockType(
      {
        id: block.id,
        type: 'text',
        html: block.description?.trim()
          ? `<p>${escapeHtmlText(block.description.trim())}</p>`
          : `<p>${escapeHtmlText(block.title.trim())}</p>`,
        ttsText: block.ttsDescription ?? block.description ?? block.title,
        align: 'left',
      },
      nextInlineType
    );
    return {
      ...nextBlock,
      id: block.id,
    };
  }

  return convertKangurLessonInlineBlockType(block, nextType);
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

  if (block.type === 'image') {
    return {
      ...block,
      id: createKangurLessonBlockId('lesson-image'),
    };
  }

  return {
    ...block,
    id: createKangurLessonBlockId('lesson-text'),
  };
};

export const cloneKangurLessonActivityBlock = (
  block: KangurLessonActivityBlock
): KangurLessonActivityBlock => ({
  ...block,
  id: createKangurLessonBlockId('lesson-activity'),
});

export const cloneKangurLessonGridItem = (item: KangurLessonGridItem): KangurLessonGridItem => ({
  ...item,
  id: createKangurLessonBlockId('lesson-grid-item'),
  block: cloneKangurLessonInlineBlock(item.block),
});

export const cloneKangurLessonCalloutBlock = (
  block: KangurLessonCalloutBlock
): KangurLessonCalloutBlock => ({
  ...block,
  id: createKangurLessonBlockId('lesson-callout'),
});

export const cloneKangurLessonQuizBlock = (
  block: KangurLessonQuizBlock
): KangurLessonQuizBlock => ({
  ...block,
  id: createKangurLessonBlockId('lesson-quiz'),
  choices: block.choices.map((choice) => ({
    ...choice,
    id: createKangurLessonBlockId('quiz-choice'),
  })),
  correctChoiceId: '',
});

export const cloneKangurLessonRootBlock = (block: KangurLessonRootBlock): KangurLessonRootBlock => {
  if (block.type === 'grid') {
    return {
      ...block,
      id: createKangurLessonBlockId('lesson-grid'),
      items: block.items.map(cloneKangurLessonGridItem),
    };
  }

  if (block.type === 'activity') {
    return cloneKangurLessonActivityBlock(block);
  }

  if (block.type === 'callout') {
    return cloneKangurLessonCalloutBlock(block);
  }

  if (block.type === 'quiz') {
    return cloneKangurLessonQuizBlock(block);
  }

  return cloneKangurLessonInlineBlock(block);
};

export const cloneKangurLessonPage = (page: KangurLessonPage): KangurLessonPage => ({
  ...page,
  id: createKangurLessonBlockId('lesson-page'),
  blocks: page.blocks.map(cloneKangurLessonRootBlock),
});
