import type { ImageStudioSequenceOperation } from '../../utils/studio-settings';

export const UPSCALE_SCALE_OPTIONS = ['1.25', '1.5', '2', '3', '4'].map((value) => ({
  value,
  label: `${value}x`,
}));

export const UPSCALE_STRATEGY_OPTIONS = [
  { value: 'scale', label: 'By Multiplier' },
  { value: 'target_resolution', label: 'By Resolution' },
];

export const STEP_ON_FAILURE_OPTIONS = [
  { value: 'stop', label: 'Stop Sequence' },
  { value: 'continue', label: 'Continue (Mark Failed)' },
  { value: 'skip', label: 'Skip Step' },
];

export const STEP_RUNTIME_OPTIONS = [
  { value: 'server', label: 'Server' },
  { value: 'client', label: 'Client' },
];

export const PRESET_NAME_MAX_LENGTH = 72;

export const PROJECT_SEQUENCE_OPERATION_LABELS: Record<ImageStudioSequenceOperation, string> = {
  crop_center: 'Crop',
  mask: 'Mask',
  generate: 'Generate',
  regenerate: 'Regenerate',
  upscale: 'Upscale',
};
