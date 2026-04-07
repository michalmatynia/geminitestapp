import { type KangurLessonDocument } from '@/features/kangur/shared/contracts/kangur';
import { isSvgImageSource } from '../utils';
import { resolveKangurLessonDocumentPages } from './pages';

export const hasKangurLessonDocumentContent = (
  document: KangurLessonDocument | null | undefined
): boolean => {
  if (!document) return false;

  return resolveKangurLessonDocumentPages(document).some((page) =>
    page.blocks.some((block) => {
      if (block.type === 'text') {
        return block.html.replace(/<[^>]+>/g, '').trim().length > 0;
      }

      if (block.type === 'svg') {
        return block.markup.trim().length > 0;
      }

      if (block.type === 'image') {
        return (
          isSvgImageSource(block.src) ||
          (block.caption?.trim().length ?? 0) > 0 ||
          block.title.trim().length > 0
        );
      }

      if (block.type === 'activity') {
        return (
          block.title.trim().length > 0 ||
          (block.description?.trim().length ?? 0) > 0 ||
          (block.ttsDescription?.trim().length ?? 0) > 0
        );
      }

      if (block.type === 'grid') {
        return block.items.some((item) => {
          if (item.block.type === 'text') {
            return item.block.html.replace(/<[^>]+>/g, '').trim().length > 0;
          }
          if (item.block.type === 'svg') {
            return item.block.markup.trim().length > 0;
          }
          return (
            isSvgImageSource(item.block.src) ||
            (item.block.caption?.trim().length ?? 0) > 0 ||
            item.block.title.trim().length > 0
          );
        });
      }

      return false;
    })
  );
};
