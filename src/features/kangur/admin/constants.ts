import type {
  KangurLessonDocumentTemplateId,
  KangurLessonGridTemplateId,
} from '@/features/kangur/lesson-documents';

export const ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const;

export const MEDIA_FIT_OPTIONS = [
  { value: 'contain', label: 'Contain' },
  { value: 'cover', label: 'Cover' },
  { value: 'none', label: 'Natural' },
] as const;

export const INLINE_BLOCK_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'svg', label: 'SVG' },
  { value: 'image', label: 'Image' },
] as const;

export const ROOT_BLOCK_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'svg', label: 'SVG' },
  { value: 'image', label: 'Image' },
  { value: 'activity', label: 'Activity' },
] as const;

export const LESSON_CONTENT_MODE_OPTIONS = [
  { value: 'component', label: 'Legacy component' },
  { value: 'document', label: 'Custom document' },
] as const;

export const GRID_TEMPLATE_OPTIONS: Array<{
  id: KangurLessonGridTemplateId;
  label: string;
}> = [
  { id: 'two-column', label: '2 columns' },
  { id: 'three-column', label: '3 columns' },
  { id: 'hero-left', label: 'Hero left' },
  { id: 'hero-right', label: 'Hero right' },
  { id: 'image-gallery', label: 'Image gallery' },
  { id: 'image-mosaic', label: 'Image mosaic' },
  { id: 'svg-duo', label: 'SVG duo' },
  { id: 'svg-trio', label: 'SVG trio' },
  { id: 'svg-gallery', label: 'SVG gallery' },
  { id: 'svg-mosaic', label: 'SVG mosaic' },
] as const;

export const DOCUMENT_TEMPLATE_OPTIONS: Array<{
  id: KangurLessonDocumentTemplateId;
  label: string;
}> = [
  { id: 'article', label: 'Article starter' },
  { id: 'text-with-figure', label: 'Text + figure' },
  { id: 'image-gallery-page', label: 'Image gallery page' },
  { id: 'svg-gallery-page', label: 'SVG gallery page' },
  { id: 'svg-mosaic-page', label: 'SVG mosaic page' },
] as const;

export const ORDERED_TREE_INSTANCE = 'kangur_lessons_manager';
export const CATALOG_TREE_INSTANCE = 'kangur_lessons_manager_catalog';
export const TREE_MODE_STORAGE_KEY = 'kangur_lessons_manager_tree_mode_v1';
