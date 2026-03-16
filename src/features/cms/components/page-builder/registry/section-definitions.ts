import type { SectionDefinition } from '@/features/cms/types/page-builder';

import { BLOCK_DEFINITIONS, BLOCK_SECTION_ALLOWED_BLOCK_TYPES } from './block-definitions';
import {
  WRAP_OPTIONS,
  JUSTIFY_OPTIONS,
  ALIGN_OPTIONS,
  colorSchemeField,
  colorSchemeFieldWithNone,
  paddingFields,
  marginFields,
  layoutFields,
  sectionStyleFields,
} from './shared-field-helpers';

const LEFT_CENTER_RIGHT_OPTIONS = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
];

const ROW_COLUMN_OPTIONS = [
  { label: 'Row', value: 'row' },
  { label: 'Column', value: 'column' },
];

const LINK_TARGET_OPTIONS = [
  { label: 'Same tab', value: '_self' },
  { label: 'New tab', value: '_blank' },
];

const FONT_STYLE_OPTIONS = [
  { label: 'Normal', value: 'normal' },
  { label: 'Italic', value: 'italic' },
];

const TEXT_DECORATION_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Underline', value: 'underline' },
  { label: 'Line-through', value: 'line-through' },
];

const TEXT_TRANSFORM_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Uppercase', value: 'uppercase' },
  { label: 'Lowercase', value: 'lowercase' },
  { label: 'Capitalize', value: 'capitalize' },
];

const INHERIT_JUSTIFY_OPTIONS = [{ label: 'Inherit alignment', value: 'inherit' }, ...JUSTIFY_OPTIONS];

const IMAGE_HEIGHT_OPTIONS = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
  { label: 'Adapt to image', value: 'adapt' },
];

const IMAGE_WIDTH_OPTIONS = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
];

const IMAGE_PLACEMENT_OPTIONS = [
  { label: 'Image first', value: 'image-first' },
  { label: 'Image second', value: 'image-second' },
];

const CONTENT_POSITION_OPTIONS = [
  { label: 'Top', value: 'top' },
  { label: 'Middle', value: 'middle' },
  { label: 'Bottom', value: 'bottom' },
];

const CONTENT_LAYOUT_OPTIONS = [
  { label: 'No overlap', value: 'no-overlap' },
  { label: 'Overlap', value: 'overlap' },
];

const IMAGE_BEHAVIOR_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Ambient movement', value: 'ambient' },
  { label: 'Zoom in on scroll', value: 'zoom-scroll' },
];

const GRID_GAP_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
];

const GRID_GAP_WITH_INHERIT_OPTIONS = [
  { label: 'Inherit grid gap', value: 'inherit' },
  { label: 'None', value: 'none' },
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
];

const TESTIMONIALS_LAYOUT_OPTIONS = [
  { label: 'Grid', value: 'grid' },
  { label: 'Carousel', value: 'carousel' },
];

const VIDEO_ASPECT_RATIO_OPTIONS = [
  { label: '16:9', value: '16:9' },
  { label: '4:3', value: '4:3' },
  { label: '1:1', value: '1:1' },
];

const VIDEO_AUTOPLAY_OPTIONS = [
  { label: 'No', value: 'no' },
  { label: 'Yes', value: 'yes' },
];


// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

export const SECTION_DEFINITIONS: Record<string, SectionDefinition> = {
  AnnouncementBar: {
    type: 'AnnouncementBar',
    label: 'Announcement bar',
    icon: 'Megaphone',
    allowedBlockTypes: [
      'Announcement',
      'Text',
      'TextElement',
      'TextAtom',
      'ImageElement',
      'Button',
      'Icon',
      'AppEmbed',
    ],
    defaultSettings: {
      colorScheme: 'scheme-2',
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 0,
      paddingRight: 0,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      contentAlignment: 'center',
    },
    settingsSchema: [
      colorSchemeField('colorScheme', 'Color scheme', 'scheme-2'),
      {
        key: 'contentAlignment',
        label: 'Content alignment',
        type: 'alignment',
        options: LEFT_CENTER_RIGHT_OPTIONS,
        defaultValue: 'center',
      },
      ...paddingFields(),
      ...marginFields(),
      ...sectionStyleFields(),
    ],
  },
  Block: {
    type: 'Block',
    label: 'Block',
    icon: 'Box',
    allowedBlockTypes: BLOCK_SECTION_ALLOWED_BLOCK_TYPES,
    defaultSettings: {
      colorScheme: 'none',
      paddingTop: 24,
      paddingBottom: 24,
      paddingLeft: 24,
      paddingRight: 24,
      blockGap: 0,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      contentAlignment: 'left',
      linkUrl: '',
      linkTarget: '_self',
      layoutDirection: 'row',
      wrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'inherit',
      minHeight: 0,
      maxWidth: 0,
      overflow: 'visible',
      opacity: 100,
      zIndex: 0,
      customCss: '',
    },
    settingsSchema: [
      colorSchemeFieldWithNone('colorScheme', 'Color scheme', 'none'),
      { key: 'blockGap', label: 'Content gap (px)', type: 'number', defaultValue: 0 },
      {
        key: 'layoutDirection',
        label: 'Layout direction',
        type: 'select',
        options: ROW_COLUMN_OPTIONS,
        defaultValue: 'row',
      },
      {
        key: 'wrap',
        label: 'Wrap',
        type: 'select',
        options: WRAP_OPTIONS,
        defaultValue: 'wrap',
      },
      {
        key: 'contentAlignment',
        label: 'Content alignment',
        type: 'select',
        options: LEFT_CENTER_RIGHT_OPTIONS,
        defaultValue: 'left',
      },
      { key: 'linkUrl', label: 'Block link', type: 'link', defaultValue: '' },
      {
        key: 'linkTarget',
        label: 'Link target',
        type: 'select',
        options: LINK_TARGET_OPTIONS,
        defaultValue: '_self',
      },
      {
        key: 'justifyContent',
        label: 'Justify content',
        type: 'select',
        options: INHERIT_JUSTIFY_OPTIONS,
        defaultValue: 'inherit',
      },
      {
        key: 'alignItems',
        label: 'Align items',
        type: 'select',
        options: ALIGN_OPTIONS,
        defaultValue: 'center',
      },
      ...paddingFields(),
      ...marginFields(),
      ...sectionStyleFields(),
      ...layoutFields(),
    ],
  },
  TextElement: {
    type: 'TextElement',
    label: 'Text element',
    icon: 'FileText',
    allowedBlockTypes: [],
    defaultSettings: {
      textContent: 'Text element',
      fontFamily: 'Inter, sans-serif',
      fontSize: 0,
      fontWeight: '400',
      fontStyle: 'normal',
      lineHeight: 0,
      letterSpacing: 0,
      textColor: '',
      textDecoration: 'none',
      textTransform: 'none',
      textAlign: 'left',
      wordSpacing: 0,
      textShadowX: 0,
      textShadowY: 0,
      textShadowBlur: 0,
      textShadowColor: '#00000000',
    },
    settingsSchema: [
      { key: 'textContent', label: 'Text', type: 'text', defaultValue: 'Text element' },
      {
        key: 'fontFamily',
        label: 'Font family',
        type: 'font-family',
        defaultValue: 'Inter, sans-serif',
      },
      { key: 'fontSize', label: 'Font size (px)', type: 'number', defaultValue: 0 },
      { key: 'fontWeight', label: 'Font weight', type: 'font-weight', defaultValue: '400' },
      {
        key: 'fontStyle',
        label: 'Font style',
        type: 'select',
        options: FONT_STYLE_OPTIONS,
        defaultValue: 'normal',
      },
      { key: 'lineHeight', label: 'Line height', type: 'number', defaultValue: 0 },
      { key: 'letterSpacing', label: 'Letter spacing (px)', type: 'number', defaultValue: 0 },
      { key: 'textColor', label: 'Text color', type: 'color', defaultValue: '' },
      {
        key: 'textDecoration',
        label: 'Text decoration',
        type: 'select',
        options: TEXT_DECORATION_OPTIONS,
        defaultValue: 'none',
      },
      {
        key: 'textTransform',
        label: 'Text transform',
        type: 'select',
        options: TEXT_TRANSFORM_OPTIONS,
        defaultValue: 'none',
      },
      { key: 'textAlign', label: 'Text align', type: 'alignment', defaultValue: 'left' },
      { key: 'wordSpacing', label: 'Word spacing (px)', type: 'number', defaultValue: 0 },
      { key: 'textShadowX', label: 'Text shadow X (px)', type: 'number', defaultValue: 0 },
      { key: 'textShadowY', label: 'Text shadow Y (px)', type: 'number', defaultValue: 0 },
      { key: 'textShadowBlur', label: 'Text shadow blur (px)', type: 'number', defaultValue: 0 },
      {
        key: 'textShadowColor',
        label: 'Text shadow color',
        type: 'color',
        defaultValue: '#00000000',
      },
    ],
  },
  TextAtom: {
    type: 'TextAtom',
    label: 'Text atoms',
    icon: 'Folder',
    allowedBlockTypes: [],
    defaultSettings: { ...BLOCK_DEFINITIONS['TextAtom']!.defaultSettings },
    settingsSchema: [...BLOCK_DEFINITIONS['TextAtom']!.settingsSchema],
  },
  ImageElement: {
    type: 'ImageElement',
    label: 'Image element',
    icon: 'ImageIcon',
    allowedBlockTypes: [],
    defaultSettings: { ...BLOCK_DEFINITIONS['ImageElement']!.defaultSettings },
    settingsSchema: [...BLOCK_DEFINITIONS['ImageElement']!.settingsSchema],
  },
  Model3DElement: {
    type: 'Model3DElement',
    label: '3D element',
    icon: 'Cube',
    allowedBlockTypes: [],
    defaultSettings: { ...BLOCK_DEFINITIONS['Model3D']!.defaultSettings },
    settingsSchema: [...BLOCK_DEFINITIONS['Model3D']!.settingsSchema],
  },
  ButtonElement: {
    type: 'ButtonElement',
    label: 'Button element',
    icon: 'MousePointerClick',
    allowedBlockTypes: [],
    defaultSettings: { ...BLOCK_DEFINITIONS['Button']!.defaultSettings },
    settingsSchema: [...BLOCK_DEFINITIONS['Button']!.settingsSchema],
  },
  ImageWithText: {
    type: 'ImageWithText',
    label: 'Image with text',
    icon: 'ImageIcon',
    allowedBlockTypes: [
      'Heading',
      'Text',
      'TextElement',
      'TextAtom',
      'ImageElement',
      'Button',
      'AppEmbed',
    ],
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
        key: 'desktopImageWidth',
        label: 'Desktop image width',
        type: 'select',
        options: IMAGE_WIDTH_OPTIONS,
        defaultValue: 'medium',
      },
      {
        key: 'desktopImagePlacement',
        label: 'Desktop image placement',
        type: 'radio',
        options: IMAGE_PLACEMENT_OPTIONS,
        defaultValue: 'image-first',
      },
      {
        key: 'desktopContentPosition',
        label: 'Desktop content position',
        type: 'select',
        options: CONTENT_POSITION_OPTIONS,
        defaultValue: 'middle',
      },
      {
        key: 'desktopContentAlignment',
        label: 'Desktop content alignment',
        type: 'select',
        options: LEFT_CENTER_RIGHT_OPTIONS,
        defaultValue: 'left',
      },
      {
        key: 'contentLayout',
        label: 'Content layout',
        type: 'radio',
        options: CONTENT_LAYOUT_OPTIONS,
        defaultValue: 'no-overlap',
      },
      colorSchemeField('colorScheme', 'Color scheme', 'scheme-3'),
      colorSchemeField('containerColorScheme', 'Container color scheme', 'scheme-1'),
      {
        key: 'imageBehavior',
        label: 'Image behavior',
        type: 'select',
        options: IMAGE_BEHAVIOR_OPTIONS,
        defaultValue: 'none',
      },
      ...paddingFields(),
      ...sectionStyleFields(),
    ],
  },

  RichText: {
    type: 'RichText',
    label: 'Rich text',
    icon: 'FileText',
    allowedBlockTypes: [
      'Heading',
      'Text',
      'TextElement',
      'TextAtom',
      'ImageElement',
      'Button',
      'AppEmbed',
    ],
    defaultSettings: {
      colorScheme: 'scheme-1',
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      colorSchemeField('colorScheme', 'Color scheme'),
      ...paddingFields(),
      ...sectionStyleFields(),
    ],
  },

  Grid: {
    type: 'Grid',
    label: 'Grid',
    icon: 'LayoutGrid',
    allowedBlockTypes: ['Row', 'ImageElement'],
    defaultSettings: {
      rows: 1,
      columns: 2,
      gap: 'medium',
      rowGap: 'inherit',
      columnGap: 'inherit',
      rowGapPx: 0,
      columnGapPx: 0,
      paddingTop: 16,
      paddingBottom: 16,
      marginTop: 0,
      marginBottom: 0,
      colorScheme: 'none',
      minHeight: 0,
      maxWidth: 0,
      overflow: 'visible',
      opacity: 100,
      zIndex: 0,
      customCss: '',
    },
    settingsSchema: [
      { key: 'rows', label: 'Rows', type: 'range', defaultValue: 1, min: 1, max: 8 },
      { key: 'columns', label: 'Columns', type: 'range', defaultValue: 2, min: 1, max: 12 },
      {
        key: 'gap',
        label: 'Gap',
        type: 'select',
        options: GRID_GAP_OPTIONS,
        defaultValue: 'medium',
      },
      {
        key: 'rowGap',
        label: 'Row gap',
        type: 'select',
        options: GRID_GAP_WITH_INHERIT_OPTIONS,
        defaultValue: 'inherit',
      },
      { key: 'rowGapPx', label: 'Row gap (px)', type: 'number', defaultValue: 0 },
      {
        key: 'columnGap',
        label: 'Column gap',
        type: 'select',
        options: GRID_GAP_WITH_INHERIT_OPTIONS,
        defaultValue: 'inherit',
      },
      { key: 'columnGapPx', label: 'Column gap (px)', type: 'number', defaultValue: 0 },
      ...paddingFields(),
      ...marginFields(),
      colorSchemeFieldWithNone('colorScheme', 'Color scheme', 'none'),
      ...sectionStyleFields(),
      ...layoutFields(),
    ],
  },

  Hero: {
    type: 'Hero',
    label: 'Hero banner',
    icon: 'LayoutTemplate',
    allowedBlockTypes: [
      'Heading',
      'Text',
      'TextElement',
      'TextAtom',
      'ImageElement',
      'Button',
      'AppEmbed',
    ],
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
      ...sectionStyleFields(),
    ],
  },

  Accordion: {
    type: 'Accordion',
    label: 'Accordion',
    icon: 'ListCollapse',
    allowedBlockTypes: ['Heading', 'Text', 'TextElement', 'TextAtom', 'ImageElement', 'AppEmbed'],
    defaultSettings: {
      colorScheme: 'scheme-1',
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      colorSchemeField('colorScheme', 'Color scheme'),
      ...paddingFields(),
      ...sectionStyleFields(),
    ],
  },

  Testimonials: {
    type: 'Testimonials',
    label: 'Testimonials',
    icon: 'Quote',
    allowedBlockTypes: [
      'Heading',
      'Text',
      'TextElement',
      'TextAtom',
      'ImageElement',
      'Image',
      'AppEmbed',
    ],
    defaultSettings: {
      layout: 'grid',
      columns: 3,
      colorScheme: 'scheme-1',
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      {
        key: 'layout',
        label: 'Layout',
        type: 'select',
        options: TESTIMONIALS_LAYOUT_OPTIONS,
        defaultValue: 'grid',
      },
      { key: 'columns', label: 'Columns', type: 'range', defaultValue: 3, min: 1, max: 4 },
      colorSchemeField('colorScheme', 'Color scheme'),
      ...paddingFields(),
      ...sectionStyleFields(),
    ],
  },

  Video: {
    type: 'Video',
    label: 'Video',
    icon: 'Video',
    allowedBlockTypes: [],
    defaultSettings: {
      videoUrl: '',
      aspectRatio: '16:9',
      autoplay: 'no',
      colorScheme: 'scheme-1',
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      { key: 'videoUrl', label: 'Video URL', type: 'text', defaultValue: '' },
      {
        key: 'aspectRatio',
        label: 'Aspect ratio',
        type: 'select',
        options: VIDEO_ASPECT_RATIO_OPTIONS,
        defaultValue: '16:9',
      },
      {
        key: 'autoplay',
        label: 'Autoplay',
        type: 'select',
        options: VIDEO_AUTOPLAY_OPTIONS,
        defaultValue: 'no',
      },
      colorSchemeField('colorScheme', 'Color scheme'),
      ...paddingFields(),
      ...sectionStyleFields(),
    ],
  },

  Slideshow: {
    type: 'Slideshow',
    label: 'Slideshow',
    icon: 'GalleryHorizontal',
    allowedBlockTypes: [
      'SlideshowFrame',
      'Block',
      'Image',
      'Heading',
      'Text',
      'TextElement',
      'TextAtom',
      'ImageElement',
      'Button',
      'AppEmbed',
    ],
    defaultSettings: { ...BLOCK_DEFINITIONS['Slideshow']!.defaultSettings },
    settingsSchema: [...BLOCK_DEFINITIONS['Slideshow']!.settingsSchema, ...sectionStyleFields()],
  },

  Newsletter: {
    type: 'Newsletter',
    label: 'Newsletter',
    icon: 'Mail',
    allowedBlockTypes: ['Heading', 'Text', 'TextElement', 'TextAtom', 'ImageElement', 'AppEmbed'],
    defaultSettings: {
      buttonText: 'Subscribe',
      placeholder: 'Enter your email',
      colorScheme: 'scheme-1',
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      { key: 'buttonText', label: 'Button text', type: 'text', defaultValue: 'Subscribe' },
      { key: 'placeholder', label: 'Placeholder', type: 'text', defaultValue: 'Enter your email' },
      colorSchemeField('colorScheme', 'Color scheme'),
      ...paddingFields(),
      ...sectionStyleFields(),
    ],
  },

  ContactForm: {
    type: 'ContactForm',
    label: 'Contact form',
    icon: 'Send',
    allowedBlockTypes: [],
    defaultSettings: {
      fields: 'name,email,message',
      submitText: 'Send message',
      successMessage: 'Thank you! We will be in touch.',
      colorScheme: 'scheme-1',
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      {
        key: 'fields',
        label: 'Fields (comma-separated)',
        type: 'text',
        defaultValue: 'name,email,message',
      },
      {
        key: 'submitText',
        label: 'Submit button text',
        type: 'text',
        defaultValue: 'Send message',
      },
      {
        key: 'successMessage',
        label: 'Success message',
        type: 'text',
        defaultValue: 'Thank you! We will be in touch.',
      },
      colorSchemeField('colorScheme', 'Color scheme'),
      ...paddingFields(),
      ...sectionStyleFields(),
    ],
  },
};
