import {
  DOCUMENTATION_MODULE_IDS,
  IMAGE_STUDIO_CROP_DOC_KEYS,
  IMAGE_STUDIO_DOCS,
  IMAGE_STUDIO_OBJECT_LAYOUT_DOC_KEYS,
  IMAGE_STUDIO_SEQUENCE_DOC_KEYS,
  IMAGE_STUDIO_VERSION_GRAPH_DOC_KEYS,
  type ImageStudioDocEntry,
  type ImageStudioDocKey,
} from '@/shared/lib/documentation';
import { getDocumentationTooltip } from '@/shared/lib/documentation';

export type { ImageStudioDocEntry, ImageStudioDocKey };

export {
  IMAGE_STUDIO_CROP_DOC_KEYS,
  IMAGE_STUDIO_DOCS,
  IMAGE_STUDIO_OBJECT_LAYOUT_DOC_KEYS,
  IMAGE_STUDIO_SEQUENCE_DOC_KEYS,
  IMAGE_STUDIO_VERSION_GRAPH_DOC_KEYS,
};

export function getImageStudioDocTooltip(key: ImageStudioDocKey): string {
  return (
    getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.imageStudio, key) ??
    `${IMAGE_STUDIO_DOCS[key].title}: ${IMAGE_STUDIO_DOCS[key].description}`
  );
}
