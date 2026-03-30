export const EMPTY_SETTINGS_OPTIONS: Array<{ label: string; value: string }> = [];

export const IMAGE_ASPECT_RATIO_OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: '1 / 1', value: '1 / 1' },
  { label: '4 / 3', value: '4 / 3' },
  { label: '3 / 4', value: '3 / 4' },
  { label: '16 / 9', value: '16 / 9' },
  { label: '9 / 16', value: '9 / 16' },
];

export const IMAGE_OBJECT_FIT_OPTIONS = [
  { label: 'Cover (crop)', value: 'cover' },
  { label: 'Contain (fit)', value: 'contain' },
  { label: 'Fill', value: 'fill' },
  { label: 'None', value: 'none' },
  { label: 'Scale down', value: 'scale-down' },
];

export const IMAGE_OBJECT_POSITION_OPTIONS = [
  { label: 'Center', value: 'center' },
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
  { label: 'Top left', value: 'top-left' },
  { label: 'Top right', value: 'top-right' },
  { label: 'Bottom left', value: 'bottom-left' },
  { label: 'Bottom right', value: 'bottom-right' },
];

export const IMAGE_SHAPE_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Rounded', value: 'rounded' },
  { label: 'Circle', value: 'circle' },
];

export const CLIP_OVERFLOW_OPTIONS = [
  { label: 'Allow overflow', value: 'false' },
  { label: 'Clip to block', value: 'true' },
];

export const BORDER_STYLE_OPTIONS = [
  { label: 'Solid', value: 'solid' },
  { label: 'Dashed', value: 'dashed' },
  { label: 'Dotted', value: 'dotted' },
  { label: 'None', value: 'none' },
];

export const OVERLAY_TYPE_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Solid', value: 'solid' },
  { label: 'Gradient', value: 'gradient' },
];

export const OVERLAY_GRADIENT_DIRECTION_OPTIONS = [
  { label: 'Top', value: 'to-top' },
  { label: 'Bottom', value: 'to-bottom' },
  { label: 'Left', value: 'to-left' },
  { label: 'Right', value: 'to-right' },
  { label: 'Top left', value: 'to-top-left' },
  { label: 'Top right', value: 'to-top-right' },
  { label: 'Bottom left', value: 'to-bottom-left' },
  { label: 'Bottom right', value: 'to-bottom-right' },
];

export const TRANSPARENCY_MODE_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Gradient', value: 'gradient' },
];

export const TRANSPARENCY_DIRECTION_OPTIONS = [
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
  { label: 'Top left', value: 'top-left' },
  { label: 'Top right', value: 'top-right' },
  { label: 'Bottom left', value: 'bottom-left' },
  { label: 'Bottom right', value: 'bottom-right' },
];

export const TOGGLE_ON_OFF_OPTIONS = [
  { label: 'On', value: 'true' },
  { label: 'Off', value: 'false' },
];

export const SHOW_HIDE_OPTIONS = [
  { label: 'Show', value: 'true' },
  { label: 'Hide', value: 'false' },
];

export const MODEL_ENVIRONMENT_OPTIONS = [
  { label: 'Studio', value: 'studio' },
  { label: 'Sunset', value: 'sunset' },
  { label: 'Dawn', value: 'dawn' },
  { label: 'Night', value: 'night' },
  { label: 'Warehouse', value: 'warehouse' },
  { label: 'Forest', value: 'forest' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'City', value: 'city' },
  { label: 'Park', value: 'park' },
  { label: 'Lobby', value: 'lobby' },
];

export const MODEL_LIGHTING_OPTIONS = [
  { label: 'Studio', value: 'studio' },
  { label: 'Outdoor', value: 'outdoor' },
  { label: 'Dramatic', value: 'dramatic' },
  { label: 'Soft', value: 'soft' },
];

export const YES_NO_OPTIONS = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
];

export const VIDEO_ASPECT_RATIO_OPTIONS = [
  { label: '16:9', value: '16:9' },
  { label: '4:3', value: '4:3' },
  { label: '1:1', value: '1:1' },
];

export const DIVIDER_STYLE_OPTIONS = [
  { label: 'Solid', value: 'solid' },
  { label: 'Dashed', value: 'dashed' },
  { label: 'Dotted', value: 'dotted' },
];

export const KANGUR_WIDGET_DISPLAY_OPTIONS = [
  { label: 'Always render', value: 'always' },
  { label: 'Only active dashboard tab', value: 'active-tab' },
];

export const KANGUR_WIDGET_GAME_SCREEN_OPTIONS = [
  { label: 'Always render', value: 'always' },
  { label: 'Home', value: 'home' },
  { label: 'Training setup', value: 'training' },
  { label: 'Kangur setup', value: 'kangur_setup' },
  { label: 'Kangur session', value: 'kangur' },
  { label: 'Calendar training', value: 'calendar_quiz' },
  { label: 'Geometry training', value: 'geometry_quiz' },
  { label: 'Operation selection', value: 'operation' },
  { label: 'Question session', value: 'playing' },
  { label: 'Result', value: 'result' },
];

export const SLIDESHOW_TRANSITION_OPTIONS = [
  { label: 'Fade', value: 'fade' },
  { label: 'Slide', value: 'slide' },
];

export const SLIDESHOW_HEIGHT_MODE_OPTIONS = [
  { label: 'Auto (fit content)', value: 'auto' },
  { label: 'Fixed', value: 'fixed' },
];

export const SLIDESHOW_ELEMENT_ANIMATION_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Fade in', value: 'fade-in' },
  { label: 'Slide up', value: 'slide-up' },
  { label: 'Slide down', value: 'slide-down' },
  { label: 'Slide left', value: 'slide-left' },
  { label: 'Slide right', value: 'slide-right' },
  { label: 'Zoom in', value: 'zoom-in' },
  { label: 'Zoom out', value: 'zoom-out' },
];

export const SLIDESHOW_ELEMENT_EASING_OPTIONS = [
  { label: 'Linear', value: 'linear' },
  { label: 'Ease', value: 'ease' },
  { label: 'Ease in', value: 'ease-in' },
  { label: 'Ease out', value: 'ease-out' },
  { label: 'Ease in-out', value: 'ease-in-out' },
];
