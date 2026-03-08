import {
  Heading,
  AlignLeft,
  MousePointerClick,
  Box,
  Layers,
  GripVertical,
  LayoutGrid,
  Columns,
  FileText,
  LayoutTemplate,
  ListCollapse,
  Quote,
  TextCursorInput,
  Gauge,
  Video,
  GalleryHorizontal,
  Mail,
  Send,
  ImageIcon,
  Minus,
  Share2,
  Smile,
  Megaphone,
  AppWindow,
  Folder,
  Frame,
  type LucideIcon,
} from 'lucide-react';

import type { BlockInstance } from '@/features/cms/types/page-builder';

// ---------------------------------------------------------------------------
// Icon Mappings
// ---------------------------------------------------------------------------

export const SECTION_ICONS: Record<string, LucideIcon> = {
  AnnouncementBar: Megaphone,
  Block: Box,
  TextElement: FileText,
  TextAtom: Folder,
  ImageElement: ImageIcon,
  ButtonElement: MousePointerClick,
  ImageWithText: Layers,
  RichText: AlignLeft,
  Hero: Layers,
  Grid: LayoutGrid,
  Accordion: ListCollapse,
  Testimonials: Quote,
  Video: Video,
  Slideshow: GalleryHorizontal,
  Newsletter: Mail,
  ContactForm: Send,
  Model3DElement: Box,
};

export const BLOCK_ICONS: Record<string, LucideIcon> = {
  Row: GripVertical,
  Announcement: Megaphone,
  Heading: Heading,
  Text: AlignLeft,
  TextElement: FileText,
  TextAtom: Folder,
  TextAtomLetter: FileText,
  ImageElement: ImageIcon,
  Button: MousePointerClick,
  Input: TextCursorInput,
  Progress: Gauge,
  Repeater: ListCollapse,
  Column: Columns,
  Block: Box,
  ImageWithText: Layers,
  RichText: FileText,
  Hero: LayoutTemplate,
  Image: ImageIcon,
  VideoEmbed: Video,
  Divider: Minus,
  SocialLinks: Share2,
  Icon: Smile,
  AppEmbed: AppWindow,
  Carousel: GalleryHorizontal,
  CarouselFrame: Frame,
  SlideshowFrame: Frame,
  Model3D: Box,
  Model3DElement: Box,
  Slideshow: GalleryHorizontal,
};

// ---------------------------------------------------------------------------
// Type Arrays
// ---------------------------------------------------------------------------

/**
 * Block types that can contain nested blocks (section-level containers)
 */
export const SECTION_BLOCK_TYPES: string[] = [
  'ImageWithText',
  'Hero',
  'RichText',
  'Block',
  'TextAtom',
  'Carousel',
  'Slideshow',
  'Repeater',
];

/**
 * Section types that can be converted to blocks (e.g., when dropped into a column)
 */
export const CONVERTIBLE_SECTION_TYPES: string[] = [
  'ImageWithText',
  'Hero',
  'RichText',
  'Block',
  'TextElement',
  'ImageElement',
  'TextAtom',
  'ButtonElement',
  'Model3DElement',
  'Slideshow',
];

// ---------------------------------------------------------------------------
// Label Utilities
// ---------------------------------------------------------------------------

/**
 * Resolves a node label, using the provided value if it's a non-empty string,
 * otherwise falling back to the default.
 */
export const resolveNodeLabel = (fallback: string, value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return fallback;
};

/**
 * Resolves a block label, with special handling for TextAtomLetter blocks
 * which display their text content directly.
 */
export const resolveBlockLabel = (block: BlockInstance, fallback: string): string => {
  if (block.type === 'TextAtomLetter') {
    const raw = block.settings?.['textContent'];
    if (typeof raw === 'string') {
      return raw.trim().length === 0 ? 'space' : raw;
    }
  }
  return resolveNodeLabel(fallback, block.settings?.['label']);
};
