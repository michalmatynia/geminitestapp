import { JUSTIFY_OPTIONS } from './shared-field-helpers';

export const ROW_COLUMN_OPTIONS = [
  { label: 'Row', value: 'row' },
  { label: 'Column', value: 'column' },
];

export const COLUMN_ROW_OPTIONS = [
  { label: 'Column', value: 'column' },
  { label: 'Row', value: 'row' },
];

export const LEFT_CENTER_RIGHT_OPTIONS = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
];

export const LINK_TARGET_OPTIONS = [
  { label: 'Same tab', value: '_self' },
  { label: 'New tab', value: '_blank' },
];

export const INHERIT_JUSTIFY_OPTIONS = [
  { label: 'Inherit alignment', value: 'inherit' },
  ...JUSTIFY_OPTIONS,
];

export const TRUE_FALSE_OPTIONS = [
  { label: 'Yes', value: 'true' },
  { label: 'No', value: 'false' },
];

export const FALSE_TRUE_OPTIONS = [
  { label: 'No', value: 'false' },
  { label: 'Yes', value: 'true' },
];

export const YES_NO_OPTIONS = [
  { label: 'No', value: 'no' },
  { label: 'Yes', value: 'yes' },
];

export const CAROUSEL_TRANSITION_OPTIONS = [
  { label: 'Slide', value: 'slide' },
  { label: 'Fade', value: 'fade' },
  { label: 'None', value: 'none' },
];

export const HEIGHT_MODE_OPTIONS = [
  { label: 'Auto (fit content)', value: 'auto' },
  { label: 'Fixed', value: 'fixed' },
];

export const VERTICAL_ALIGNMENT_OPTIONS = [
  { label: 'Top', value: 'top' },
  { label: 'Center', value: 'center' },
  { label: 'Bottom', value: 'bottom' },
];

export const FRAME_ANIMATION_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Fade in', value: 'fade-in' },
  { label: 'Slide up', value: 'slide-up' },
  { label: 'Slide down', value: 'slide-down' },
  { label: 'Slide left', value: 'slide-left' },
  { label: 'Slide right', value: 'slide-right' },
  { label: 'Zoom in', value: 'zoom-in' },
  { label: 'Zoom out', value: 'zoom-out' },
];

export const FRAME_ANIMATION_WITH_INHERIT_OPTIONS = [
  { label: 'Inherit from Slideshow', value: 'inherit' },
  ...FRAME_ANIMATION_OPTIONS,
];

export const ANIMATION_EASING_OPTIONS = [
  { label: 'Linear', value: 'linear' },
  { label: 'Ease', value: 'ease' },
  { label: 'Ease in', value: 'ease-in' },
  { label: 'Ease out', value: 'ease-out' },
  { label: 'Ease in-out', value: 'ease-in-out' },
];

export const HEADING_SIZE_OPTIONS = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
];

export const TEXT_DECORATION_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Underline', value: 'underline' },
  { label: 'Line-through', value: 'line-through' },
];

export const TEXT_TRANSFORM_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Uppercase', value: 'uppercase' },
  { label: 'Lowercase', value: 'lowercase' },
  { label: 'Capitalize', value: 'capitalize' },
];

export const FONT_STYLE_OPTIONS = [
  { label: 'Normal', value: 'normal' },
  { label: 'Italic', value: 'italic' },
];

export const INPUT_TYPE_OPTIONS = [
  { label: 'Text', value: 'text' },
  { label: 'Email', value: 'email' },
  { label: 'Password', value: 'password' },
  { label: 'Number', value: 'number' },
];

export const BUTTON_STYLE_OPTIONS = [
  { label: 'Solid', value: 'solid' },
  { label: 'Outline', value: 'outline' },
];

export const DISABLE_WHEN_OPTIONS = [
  { label: 'Value is truthy', value: 'truthy' },
  { label: 'Value is falsy', value: 'falsy' },
];

export const IMAGE_HEIGHT_OPTIONS = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
  { label: 'Adapt to image', value: 'adapt' },
];

export const IMAGE_PLACEMENT_OPTIONS = [
  { label: 'Image first', value: 'image-first' },
  { label: 'Image second', value: 'image-second' },
];

// Content blocks that can be placed inside a CarouselFrame
export const CAROUSEL_FRAME_ALLOWED_BLOCK_TYPES = [
  'ImageElement',
  'TextElement',
  'TextAtom',
  'Block',
  'Button',
  'Input',
  'Progress',
  'Repeater',
  'Heading',
  'Text',
  'VideoEmbed',
  'Divider',
  'SocialLinks',
  'Icon',
];

// Content blocks that can be placed inside a SlideshowFrame
export const SLIDESHOW_FRAME_ALLOWED_BLOCK_TYPES = [
  'ImageElement',
  'Image',
  'Heading',
  'Text',
  'TextElement',
  'TextAtom',
  'Block',
  'Button',
  'Input',
  'Progress',
  'Repeater',
  'AppEmbed',
];
