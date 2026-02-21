import { DOCUMENTATION_MODULE_IDS, type DocumentationEntry } from '@/features/documentation/types';

import {
  IMAGE_STUDIO_CROP_DOC_KEYS,
  IMAGE_STUDIO_DOCS,
  IMAGE_STUDIO_OBJECT_LAYOUT_DOC_KEYS,
  IMAGE_STUDIO_SEQUENCE_DOC_KEYS,
  IMAGE_STUDIO_VERSION_GRAPH_DOC_KEYS,
  type ImageStudioDocEntry,
  type ImageStudioDocKey,
} from './image-studio-docs';


export const IMAGE_STUDIO_DOCUMENTATION_CATALOG: DocumentationEntry[] = (
  Object.values(IMAGE_STUDIO_DOCS)
).map((entry) => ({
  id: entry.key,
  moduleId: DOCUMENTATION_MODULE_IDS.imageStudio,
  title: entry.title,
  content: entry.description,
  keywords: [entry.key, entry.title],
}));

export {
  IMAGE_STUDIO_CROP_DOC_KEYS,
  IMAGE_STUDIO_DOCS,
  IMAGE_STUDIO_OBJECT_LAYOUT_DOC_KEYS,
  IMAGE_STUDIO_SEQUENCE_DOC_KEYS,
  IMAGE_STUDIO_VERSION_GRAPH_DOC_KEYS,
};
export type { ImageStudioDocEntry, ImageStudioDocKey };
