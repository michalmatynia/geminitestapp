import {
  type KangurLessonActivityBlock,
  type KangurLessonGridBlock,
  type KangurLessonGridItem,
  type KangurLessonInlineBlock,
  type KangurLessonPage,
  type KangurLessonRootBlock,
} from '@/shared/contracts/kangur';
import {
  createKangurLessonActivityBlock,
  createKangurLessonBlockId,
  createKangurLessonImageBlock,
  createKangurLessonSvgBlock,
  createKangurLessonTextBlock,
} from './creators';
import { escapeHtmlText, normalizeText, stripHtmlToText } from './utils';

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
        : normalizeText(block.title, nextBlock.title, 120);
    const derivedDescription =
      block.type === 'text'
        ? normalizeText(block.ttsText ?? stripHtmlToText(block.html), '', 2_000)
        : normalizeText(
          block.ttsDescription ??
              (block.type === 'image' ? block.caption ?? block.altText ?? block.title : block.title),
          '',
          2_000
        );

    return {
      ...nextBlock,
      id: block.id,
      align: block.align,
      title: derivedTitle,
      ttsDescription: derivedDescription,
    };
  }

  if (nextType === 'image') {
    const nextBlock = createKangurLessonImageBlock();
    const derivedTitle =
      block.type === 'text'
        ? normalizeText(stripHtmlToText(block.html), nextBlock.title, 120)
        : normalizeText(block.title, nextBlock.title, 120);
    const derivedAltText =
      block.type === 'text'
        ? normalizeText(stripHtmlToText(block.html), '', 300)
        : normalizeText(
          block.type === 'svg' ? block.title : block.altText ?? block.title,
          '',
          300
        );
    const derivedDescription =
      block.type === 'text'
        ? normalizeText(block.ttsText ?? stripHtmlToText(block.html), '', 2_000)
        : normalizeText(
          block.ttsDescription ??
              (block.type === 'image' ? block.caption ?? block.altText ?? block.title : block.title),
          '',
          2_000
        );

    return {
      ...nextBlock,
      id: block.id,
      align: block.align,
      title: derivedTitle,
      altText: derivedAltText,
      ttsDescription: derivedDescription,
    };
  }

  const nextBlock = createKangurLessonTextBlock();
  const derivedHtml =
    block.type !== 'text' && block.title.trim().length > 0
      ? `<p>${escapeHtmlText(block.title.trim())}</p>`
      : block.type === 'image' && block.caption?.trim()
        ? `<p>${escapeHtmlText(block.caption.trim())}</p>`
        : nextBlock.html;
  const derivedTtsText =
    block.type === 'svg'
      ? normalizeText(block.ttsDescription ?? block.title, '', 10_000)
      : block.type === 'image'
        ? normalizeText(
          block.ttsDescription ?? block.caption ?? block.altText ?? block.title,
          '',
          10_000
        )
        : nextBlock.ttsText;

  return {
    ...nextBlock,
    id: block.id,
    align: block.align,
    html: derivedHtml,
    ttsText: derivedTtsText,
  };
};

export const convertKangurLessonRootBlockType = (
  block: Exclude<KangurLessonRootBlock, KangurLessonGridBlock>,
  nextType: Exclude<KangurLessonRootBlock['type'], 'grid'>
): Exclude<KangurLessonRootBlock, KangurLessonGridBlock> => {
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
        ? normalizeText(block.ttsText ?? stripHtmlToText(block.html), nextBlock.description ?? '', 500)
        : normalizeText(
          block.type === 'image'
            ? block.caption ?? block.altText ?? block.title
            : block.ttsDescription ?? block.title,
          nextBlock.description ?? '',
          500
        );
    const derivedTtsDescription =
      block.type === 'text'
        ? normalizeText(block.ttsText ?? stripHtmlToText(block.html), '', 2_000)
        : normalizeText(
          block.type === 'image'
            ? block.ttsDescription ?? block.caption ?? block.altText ?? block.title
            : block.ttsDescription ?? block.title,
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
    const nextInlineType = nextType === 'text' || nextType === 'svg' || nextType === 'image' ? nextType : 'text';
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

  if (block.type === 'activity') {
    return cloneKangurLessonActivityBlock(block);
  }

  return cloneKangurLessonInlineBlock(block);
};

export const cloneKangurLessonPage = (page: KangurLessonPage): KangurLessonPage => ({
  ...page,
  id: createKangurLessonBlockId('lesson-page'),
  blocks: page.blocks.map(cloneKangurLessonRootBlock),
});
