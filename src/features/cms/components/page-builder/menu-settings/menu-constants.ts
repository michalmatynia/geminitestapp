import type { LabeledOptionDto, LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';

export const FONT_FAMILY_OPTIONS: ReadonlyArray<LabeledOptionDto<string>> = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Bebas Neue', value: '\'Bebas Neue\', sans-serif' },
  { label: 'Space Grotesk', value: '\'Space Grotesk\', sans-serif' },
  { label: 'Manrope', value: 'Manrope, sans-serif' },
  { label: 'Outfit', value: 'Outfit, sans-serif' },
  { label: 'Plus Jakarta Sans', value: '\'Plus Jakarta Sans\', sans-serif' },
  { label: 'DM Sans', value: 'DM Sans, sans-serif' },
  { label: 'Sora', value: 'Sora, sans-serif' },
];

export const FONT_WEIGHT_OPTIONS: ReadonlyArray<LabeledOptionDto<string>> = [
  { label: '100 – Thin', value: '100' },
  { label: '400 – Normal', value: '400' },
  { label: '700 – Bold', value: '700' },
  { label: '900 – Black', value: '900' },
];

export const MENU_PLACEMENT_OPTIONS: ReadonlyArray<LabeledOptionDto<string>> = [
  { label: 'Top', value: 'top' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
];

export const MENU_LAYOUT_OPTIONS: ReadonlyArray<LabeledOptionDto<string>> = [
  { label: 'Horizontal', value: 'horizontal' },
  { label: 'Vertical', value: 'vertical' },
  { label: 'Centered', value: 'centered' },
];

export const MENU_ALIGNMENT_OPTIONS: ReadonlyArray<LabeledOptionDto<string>> = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
  { label: 'Space between', value: 'space-between' },
];

export const TEXT_TRANSFORM_OPTIONS: ReadonlyArray<LabeledOptionDto<string>> = [
  { label: 'None', value: 'none' },
  { label: 'Uppercase', value: 'uppercase' },
  { label: 'Capitalize', value: 'capitalize' },
];

export const MOBILE_BREAKPOINT_OPTIONS: ReadonlyArray<LabeledOptionDto<string>> = [
  { label: '768px (Tablet)', value: '768' },
  { label: '1024px (Small desktop)', value: '1024' },
];

export const MOBILE_ANIMATION_OPTIONS: ReadonlyArray<LabeledOptionDto<string>> = [
  { label: 'Slide left', value: 'slide-left' },
  { label: 'Fade', value: 'fade' },
];

export const DROPDOWN_SHADOW_OPTIONS: ReadonlyArray<LabeledOptionDto<string>> = [
  { label: 'None', value: 'none' },
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
];

export const POSITION_MODE_OPTIONS: ReadonlyArray<LabeledOptionDto<string>> = [
  { label: 'Glued to top', value: 'sticky' },
  { label: 'Top of page', value: 'static' },
];

export const ACTIVE_STYLE_OPTIONS: ReadonlyArray<LabeledOptionDto<string>> = [
  { label: 'Underline', value: 'underline' },
  { label: 'Bold', value: 'bold' },
  { label: 'Background', value: 'background' },
  { label: 'None', value: 'none' },
];

export const HOVER_STYLE_OPTIONS: ReadonlyArray<LabeledOptionDto<string>> = [
  { label: 'Underline', value: 'underline' },
  { label: 'Color shift', value: 'color-shift' },
  { label: 'Background', value: 'background' },
  { label: 'Scale', value: 'scale' },
];

export const MENU_SECTIONS = [
  'Visibility & Placement',
  'Menu Layout',
  'Menu Items',
  'Menu Images',
  'Typography',
  'Colors',
  'Spacing',
  'Mobile Menu',
  'Dropdown Style',
  'Sticky Behaviour',
  'Active State',
  'Hover Effects',
  'Animations',
];
