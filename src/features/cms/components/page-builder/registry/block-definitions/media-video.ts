import type { BlockDefinition } from '@/features/cms/types/page-builder';
import {
  VIDEO_ASPECT_RATIO_OPTIONS,
} from './media-constants';

export const VIDEO_BLOCK_DEFINITIONS: Record<string, BlockDefinition> = {
  VideoElement: {
    type: 'VideoElement',
    label: 'Video',
    icon: 'VideoIcon',
    defaultSettings: {
      url: '',
      provider: 'youtube',
      aspectRatio: '16:9',
      width: 100,
      autoPlay: false,
      loop: false,
      muted: false,
      controls: true,
    },
    settingsSchema: [
      { key: 'url', label: 'Video URL', type: 'text' },
      {
        key: 'provider',
        label: 'Provider',
        type: 'select',
        options: [
          { label: 'YouTube', value: 'youtube' },
          { label: 'Vimeo', value: 'vimeo' },
          { label: 'Cloudinary', value: 'cloudinary' },
          { label: 'Direct', value: 'direct' },
        ],
        defaultValue: 'youtube',
      },
      {
        key: 'aspectRatio',
        label: 'Aspect ratio',
        type: 'select',
        options: VIDEO_ASPECT_RATIO_OPTIONS,
        defaultValue: '16:9',
      },
      { key: 'width', label: 'Width (%)', type: 'range', defaultValue: 100, min: 10, max: 100 },
      { key: 'autoPlay', label: 'Autoplay', type: 'checkbox', defaultValue: false },
      { key: 'loop', label: 'Loop', type: 'checkbox', defaultValue: false },
      { key: 'muted', label: 'Muted', type: 'checkbox', defaultValue: false },
      { key: 'controls', label: 'Show controls', type: 'checkbox', defaultValue: true },
    ],
  },
};
