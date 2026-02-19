import {
  IMAGE_STUDIO_CROP_DOC_KEYS,
  IMAGE_STUDIO_DOCS,
  IMAGE_STUDIO_OBJECT_LAYOUT_DOC_KEYS,
  IMAGE_STUDIO_SEQUENCE_DOC_KEYS,
  IMAGE_STUDIO_VERSION_GRAPH_DOC_KEYS,
  type ImageStudioDocEntry,
  type ImageStudioDocKey,
} from './image-studio-docs';
import { DOCUMENTATION_MODULE_IDS, type DocumentationEntry } from '../types';

const CROP_KEYS = new Set<ImageStudioDocKey>(IMAGE_STUDIO_CROP_DOC_KEYS);
const OBJECT_LAYOUT_KEYS = new Set<ImageStudioDocKey>(IMAGE_STUDIO_OBJECT_LAYOUT_DOC_KEYS);
const SEQUENCE_KEYS = new Set<ImageStudioDocKey>(IMAGE_STUDIO_SEQUENCE_DOC_KEYS);
const VERSION_GRAPH_KEYS = new Set<ImageStudioDocKey>(IMAGE_STUDIO_VERSION_GRAPH_DOC_KEYS);

const resolveSectionForKey = (key: ImageStudioDocKey): string => {
  if (CROP_KEYS.has(key)) return 'Crop';
  if (OBJECT_LAYOUT_KEYS.has(key)) return 'Object Layout';
  if (SEQUENCE_KEYS.has(key)) return 'Sequencer';
  if (VERSION_GRAPH_KEYS.has(key)) return 'Version Graph';
  if (key.startsWith('sidebar_')) return 'Sidebar';
  return 'General';
};

export const IMAGE_STUDIO_DOCUMENTATION_CATALOG: DocumentationEntry[] = (
  Object.values(IMAGE_STUDIO_DOCS)
).map((entry) => ({
  id: entry.key,
  moduleId: DOCUMENTATION_MODULE_IDS.imageStudio,
  title: entry.title,
  summary: entry.description,
  section: resolveSectionForKey(entry.key),
  aliases: [entry.key, entry.title],
}));

export {
  IMAGE_STUDIO_CROP_DOC_KEYS,
  IMAGE_STUDIO_DOCS,
  IMAGE_STUDIO_OBJECT_LAYOUT_DOC_KEYS,
  IMAGE_STUDIO_SEQUENCE_DOC_KEYS,
  IMAGE_STUDIO_VERSION_GRAPH_DOC_KEYS,
};
export type { ImageStudioDocEntry, ImageStudioDocKey };
