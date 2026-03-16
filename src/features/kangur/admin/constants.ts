import type {
  KangurLessonDocumentTemplateId,
  KangurLessonGridTemplateId,
} from '@/features/kangur/lesson-documents';
import type { IdLabelOptionDto, LabeledOptionDto } from '@/shared/contracts/base';

export const ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const MEDIA_FIT_OPTIONS = [
  { value: 'contain', label: 'Contain' },
  { value: 'cover', label: 'Cover' },
  { value: 'none', label: 'Natural' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const INLINE_BLOCK_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'svg', label: 'SVG' },
  { value: 'image', label: 'SVG Image' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const ROOT_BLOCK_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'svg', label: 'SVG' },
  { value: 'image', label: 'SVG Image' },
  { value: 'activity', label: 'Activity' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const LESSON_CONTENT_MODE_OPTIONS = [
  { value: 'component', label: 'Legacy component' },
  { value: 'document', label: 'Custom document' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const GRID_TEMPLATE_OPTIONS: Array<IdLabelOptionDto<KangurLessonGridTemplateId>> = [
  { id: 'two-column', label: '2 columns' },
  { id: 'three-column', label: '3 columns' },
  { id: 'hero-left', label: 'Hero left' },
  { id: 'hero-right', label: 'Hero right' },
  { id: 'image-gallery', label: 'SVG Image Gallery' },
  { id: 'image-mosaic', label: 'SVG Image Mosaic' },
  { id: 'svg-duo', label: 'SVG duo' },
  { id: 'svg-trio', label: 'SVG trio' },
  { id: 'svg-gallery', label: 'SVG gallery' },
  { id: 'svg-mosaic', label: 'SVG mosaic' },
] as const;

export const DOCUMENT_TEMPLATE_OPTIONS: Array<
  IdLabelOptionDto<KangurLessonDocumentTemplateId>
> = [
  { id: 'article', label: 'Article starter' },
  { id: 'text-with-figure', label: 'Text + figure' },
  { id: 'image-gallery-page', label: 'SVG Image Gallery Page' },
  { id: 'svg-gallery-page', label: 'SVG gallery page' },
  { id: 'svg-mosaic-page', label: 'SVG mosaic page' },
] as const;

export const ORDERED_TREE_INSTANCE = 'kangur_lessons_manager';
export const CATALOG_TREE_INSTANCE = 'kangur_lessons_manager_catalog';
export const TREE_MODE_STORAGE_KEY = 'kangur_lessons_manager_tree_mode_v1';
