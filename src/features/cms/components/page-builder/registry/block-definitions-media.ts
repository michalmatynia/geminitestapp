import type { BlockDefinition } from '@/features/cms/types/page-builder';
import {
  DIVIDER_STYLE_OPTIONS,
} from './block-definitions/media-constants';
import { IMAGE_BLOCK_DEFINITIONS } from './block-definitions/media-image';
import { MEDIA_3D_BLOCK_DEFINITIONS } from './block-definitions/media-3d';
import { VIDEO_BLOCK_DEFINITIONS } from './block-definitions/media-video';
import { EMBEDDED_BLOCK_DEFINITIONS } from './block-definitions/media-embedded';
import { GALLERY_BLOCK_DEFINITIONS } from './block-definitions/media-gallery';

export const mediaBlockDefinitions: Record<string, BlockDefinition> = {
  ...IMAGE_BLOCK_DEFINITIONS,
  ...MEDIA_3D_BLOCK_DEFINITIONS,
  ...VIDEO_BLOCK_DEFINITIONS,
  ...EMBEDDED_BLOCK_DEFINITIONS,
  ...GALLERY_BLOCK_DEFINITIONS,
  Divider: {
    type: 'Divider',
    label: 'Divider',
    icon: 'MinusIcon',
    defaultSettings: {
      style: 'solid',
      width: 100,
      height: 1,
      color: '#e2e8f0',
      marginTop: 16,
      marginBottom: 16,
    },
    settingsSchema: [
      {
        key: 'style',
        label: 'Style',
        type: 'select',
        options: DIVIDER_STYLE_OPTIONS,
        defaultValue: 'solid',
      },
      { key: 'width', label: 'Width (%)', type: 'range', defaultValue: 100, min: 10, max: 100 },
      { key: 'height', label: 'Thickness (px)', type: 'range', defaultValue: 1, min: 1, max: 10 },
      { key: 'color', label: 'Color', type: 'color', defaultValue: '#e2e8f0' },
      { key: 'marginTop', label: 'Top margin', type: 'number', defaultValue: 16 },
      { key: 'marginBottom', label: 'Bottom margin', type: 'number', defaultValue: 16 },
    ],
  },
};
