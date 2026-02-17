export type ImageStudioDocKey =
  | 'crop_box_tool'
  | 'crop'
  | 'square_crop'
  | 'view_crop'
  | 'cancel_crop';

export type ImageStudioDocEntry = {
  key: ImageStudioDocKey;
  title: string;
  description: string;
};

export const IMAGE_STUDIO_CROP_DOC_KEYS: ImageStudioDocKey[] = [
  'crop_box_tool',
  'crop',
  'square_crop',
  'view_crop',
  'cancel_crop',
];

export const IMAGE_STUDIO_DOCS: Record<ImageStudioDocKey, ImageStudioDocEntry> = {
  crop_box_tool: {
    key: 'crop_box_tool',
    title: 'Create Rectangle',
    description: 'Creates a rectangle shape you can resize and move, then use as the crop boundary.',
  },
  crop: {
    key: 'crop',
    title: 'Crop',
    description: 'Runs crop using the active boundary shape and creates a linked cropped output card.',
  },
  square_crop: {
    key: 'square_crop',
    title: 'Square Crop',
    description: 'Performs a quick centered 1:1 crop from the active source image.',
  },
  view_crop: {
    key: 'view_crop',
    title: 'View Crop',
    description: 'Crops to the currently visible preview viewport area shown on the canvas.',
  },
  cancel_crop: {
    key: 'cancel_crop',
    title: 'Cancel Crop',
    description: 'Stops the in-flight crop request and leaves the current source image unchanged.',
  },
};

export function getImageStudioDocTooltip(key: ImageStudioDocKey): string {
  const entry = IMAGE_STUDIO_DOCS[key];
  return `${entry.title}: ${entry.description}`;
}
