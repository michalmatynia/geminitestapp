import type { BlockDefinition } from '@/features/cms/types/page-builder';

import { colorSchemeField, paddingFields } from './shared-field-helpers';
import { IMAGE_HEIGHT_OPTIONS, IMAGE_PLACEMENT_OPTIONS } from './block-definitions-content.constants';

export const contentSectionBlockDefinitions: Record<string, BlockDefinition> = {
  ImageWithText: {
    type: 'ImageWithText',
    label: 'Image with text',
    icon: 'Layers',
    defaultSettings: {
      imageHeight: 'medium',
      desktopImageWidth: 'medium',
      desktopImagePlacement: 'image-first',
      desktopContentPosition: 'middle',
      desktopContentAlignment: 'left',
      contentLayout: 'no-overlap',
      colorScheme: 'scheme-3',
      containerColorScheme: 'scheme-1',
      imageBehavior: 'none',
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      { key: 'image', label: 'Image', type: 'image' },
      {
        key: 'imageHeight',
        label: 'Image height',
        type: 'select',
        options: IMAGE_HEIGHT_OPTIONS,
        defaultValue: 'medium',
      },
      {
        key: 'desktopImagePlacement',
        label: 'Desktop image placement',
        type: 'radio',
        options: IMAGE_PLACEMENT_OPTIONS,
        defaultValue: 'image-first',
      },
      colorSchemeField('colorScheme', 'Color scheme', 'scheme-3'),
      ...paddingFields(),
    ],
  },
  Hero: {
    type: 'Hero',
    label: 'Hero banner',
    icon: 'LayoutTemplate',
    defaultSettings: {
      imageHeight: 'large',
      colorScheme: 'scheme-1',
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      { key: 'image', label: 'Image', type: 'image' },
      {
        key: 'imageHeight',
        label: 'Image height',
        type: 'select',
        options: IMAGE_HEIGHT_OPTIONS,
        defaultValue: 'large',
      },
      colorSchemeField('colorScheme', 'Color scheme'),
      ...paddingFields(),
    ],
  },
};
