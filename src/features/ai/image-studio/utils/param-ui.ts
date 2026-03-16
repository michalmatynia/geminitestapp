import { type ParamSpec, type ParamSpecKind } from '@/shared/contracts/prompt-engine';

export type ParamUiControl =
  | 'auto'
  | 'checkbox'
  | 'buttons'
  | 'select'
  | 'slider'
  | 'number'
  | 'text'
  | 'textarea'
  | 'json'
  | 'rgb'
  | 'tuple2';

const PARAM_UI_CONTROLS: ParamUiControl[] = [
  'auto',
  'checkbox',
  'buttons',
  'select',
  'slider',
  'number',
  'text',
  'textarea',
  'json',
  'rgb',
  'tuple2',
];

const PARAM_UI_RGB_OPTIONS: ParamUiControl[] = ['auto', 'rgb', 'json'];
const PARAM_UI_TUPLE2_OPTIONS: ParamUiControl[] = ['auto', 'tuple2', 'json'];
const PARAM_UI_BOOLEAN_OPTIONS: ParamUiControl[] = ['auto', 'checkbox', 'buttons', 'json'];
const PARAM_UI_ENUM_OPTIONS: ParamUiControl[] = ['auto', 'select', 'buttons', 'text', 'json'];
const PARAM_UI_NUMBER_OPTIONS: ParamUiControl[] = ['auto', 'number', 'slider', 'json'];
const PARAM_UI_STRING_OPTIONS: ParamUiControl[] = ['auto', 'text', 'textarea', 'json'];
const PARAM_UI_FALLBACK_OPTIONS: ParamUiControl[] = ['auto', 'json'];

export const isParamUiControl = (value: unknown): value is ParamUiControl =>
  typeof value === 'string' && PARAM_UI_CONTROLS.includes(value as ParamUiControl);

type ParamUiRecommendation = {
  baseKind: ParamSpecKind;
  recommended: Exclude<ParamUiControl, 'auto'>;
  options: ParamUiControl[];
  confidence: number; // 0..1
  reason: string | null;
  canSlider: boolean;
};

const inferBaseKind = (value: unknown, spec?: ParamSpec): ParamSpecKind => {
  if (spec?.kind) return spec.kind;
  if (Array.isArray(value)) return 'json';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number' && Number.isFinite(value)) return 'number';
  if (typeof value === 'string') return 'string';
  return 'json';
};

const canUseSlider = (value: unknown, spec?: ParamSpec): boolean => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (spec?.min !== undefined && spec?.max !== undefined) return true;
  return value >= 0 && value <= 1;
};

export const paramUiControlLabel = (control: ParamUiControl): string => {
  switch (control) {
    case 'auto':
      return 'Auto';
    case 'checkbox':
      return 'Checkbox';
    case 'buttons':
      return 'Buttons';
    case 'select':
      return 'Dropdown';
    case 'slider':
      return 'Slider';
    case 'number':
      return 'Number';
    case 'text':
      return 'Text';
    case 'textarea':
      return 'Textarea';
    case 'json':
      return 'JSON';
    case 'rgb':
      return 'RGB';
    case 'tuple2':
      return 'Tuple';
    default:
      return control;
  }
};

export function recommendParamUiControl(value: unknown, spec?: ParamSpec): ParamUiRecommendation {
  const baseKind = inferBaseKind(value, spec);
  const sliderOk = canUseSlider(value, spec);

  if (baseKind === 'rgb') {
    return {
      baseKind,
      recommended: 'rgb',
      options: PARAM_UI_RGB_OPTIONS,
      confidence: 0.95,
      reason: null,
      canSlider: false,
    };
  }

  if (baseKind === 'tuple2') {
    return {
      baseKind,
      recommended: 'tuple2',
      options: PARAM_UI_TUPLE2_OPTIONS,
      confidence: 0.9,
      reason: null,
      canSlider: false,
    };
  }

  if (baseKind === 'boolean') {
    return {
      baseKind,
      recommended: 'checkbox',
      options: PARAM_UI_BOOLEAN_OPTIONS,
      confidence: 1,
      reason: null,
      canSlider: false,
    };
  }

  if (baseKind === 'enum') {
    const count = spec?.enumOptions?.length ?? 0;
    const recommended = count > 0 && count <= 6 ? 'buttons' : 'select';
    return {
      baseKind,
      recommended,
      options: PARAM_UI_ENUM_OPTIONS,
      confidence: count > 0 ? 0.9 : 0.45,
      reason: count > 0 ? null : 'No enum options detected in the hint comments.',
      canSlider: false,
    };
  }

  if (baseKind === 'number') {
    return {
      baseKind,
      recommended: sliderOk ? 'slider' : 'number',
      options: PARAM_UI_NUMBER_OPTIONS,
      confidence: spec?.min !== undefined && spec?.max !== undefined ? 0.85 : 0.65,
      reason: sliderOk
        ? null
        : 'No numeric range detected (add a hint like `// 0–1` to enable a slider).',
      canSlider: sliderOk,
    };
  }

  if (baseKind === 'string') {
    const multiline = typeof value === 'string' && (value.includes('\n') || value.includes('\r'));
    return {
      baseKind,
      recommended: multiline ? 'textarea' : 'text',
      options: PARAM_UI_STRING_OPTIONS,
      confidence: 0.6,
      reason: null,
      canSlider: false,
    };
  }

  return {
    baseKind,
    recommended: 'json',
    options: PARAM_UI_FALLBACK_OPTIONS,
    confidence: 0.35,
    reason: 'Unrecognized structure; edit as JSON.',
    canSlider: false,
  };
}
