import type { BlockDefinition } from '@/features/cms/types/page-builder';
import {
  SLIDESHOW_ELEMENT_ANIMATION_OPTIONS,
  SLIDESHOW_ELEMENT_EASING_OPTIONS,
  SLIDESHOW_HEIGHT_MODE_OPTIONS,
  SLIDESHOW_TRANSITION_OPTIONS,
  TOGGLE_ON_OFF_OPTIONS,
} from './media-constants';

export const GALLERY_BLOCK_DEFINITIONS: Record<string, BlockDefinition> = {
  Gallery: {
    type: 'Gallery',
    label: 'Image gallery',
    icon: 'GridIcon',
    defaultSettings: { images: [], columns: 3, gap: 16 },
    settingsSchema: [
      { key: 'images', label: 'Images', type: 'image_list' },
      { key: 'columns', label: 'Columns', type: 'number', defaultValue: 3 },
      { key: 'gap', label: 'Gap (px)', type: 'number', defaultValue: 16 },
    ],
  },
  Slideshow: {
    type: 'Slideshow',
    label: 'Slideshow',
    icon: 'LayersIcon',
    defaultSettings: {
      slides: [],
      transition: 'fade',
      duration: 5000,
      autoPlay: 'true',
      showArrows: 'true',
      showDots: 'true',
      heightMode: 'auto',
      fixedHeight: 400,
    },
    settingsSchema: [
      {
        key: 'slides',
        label: 'Slides',
        type: 'list',
        itemSchema: [
          { key: 'src', label: 'Image', type: 'image' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'subtitle', label: 'Subtitle', type: 'text' },
          { key: 'link', label: 'Link URL', type: 'text' },
          {
            key: 'titleAnimation',
            label: 'Title animation',
            type: 'select',
            options: SLIDESHOW_ELEMENT_ANIMATION_OPTIONS,
            defaultValue: 'fade-in',
          },
          {
            key: 'subtitleAnimation',
            label: 'Subtitle animation',
            type: 'select',
            options: SLIDESHOW_ELEMENT_ANIMATION_OPTIONS,
            defaultValue: 'fade-in',
          },
          {
            key: 'easing',
            label: 'Animation easing',
            type: 'select',
            options: SLIDESHOW_ELEMENT_EASING_OPTIONS,
            defaultValue: 'ease-out',
          },
        ],
      },
      {
        key: 'transition',
        label: 'Transition effect',
        type: 'select',
        options: SLIDESHOW_TRANSITION_OPTIONS,
        defaultValue: 'fade',
      },
      { key: 'duration', label: 'Slide duration (ms)', type: 'number', defaultValue: 5000 },
      {
        key: 'autoPlay',
        label: 'Autoplay',
        type: 'select',
        options: TOGGLE_ON_OFF_OPTIONS,
        defaultValue: 'true',
      },
      {
        key: 'showArrows',
        label: 'Show arrows',
        type: 'select',
        options: TOGGLE_ON_OFF_OPTIONS,
        defaultValue: 'true',
      },
      {
        key: 'showDots',
        label: 'Show navigation dots',
        type: 'select',
        options: TOGGLE_ON_OFF_OPTIONS,
        defaultValue: 'true',
      },
      {
        key: 'heightMode',
        label: 'Height mode',
        type: 'select',
        options: SLIDESHOW_HEIGHT_MODE_OPTIONS,
        defaultValue: 'auto',
      },
      { key: 'fixedHeight', label: 'Fixed height (px)', type: 'number', defaultValue: 400 },
    ],
  },
};
