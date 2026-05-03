import type { LabeledOptionDto, LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';

export const positionOptions = [
  { value: 'top-right', label: 'Top Right', description: 'Corner top right' },
  { value: 'top-left', label: 'Top Left', description: 'Corner top left' },
  { value: 'bottom-right', label: 'Bottom Right', description: 'Corner bottom right' },
  { value: 'bottom-left', label: 'Bottom Left', description: 'Corner bottom left' },
] as const satisfies ReadonlyArray<LabeledOptionWithDescriptionDto<string>>;

export const accentOptions = [
  { value: 'emerald', label: 'Emerald', color: 'bg-emerald-500' },
  { value: 'blue', label: 'Blue', color: 'bg-blue-500' },
  { value: 'amber', label: 'Amber', color: 'bg-amber-500' },
  { value: 'rose', label: 'Rose', color: 'bg-rose-500' },
  { value: 'slate', label: 'Slate', color: 'bg-slate-500' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string> & { color: string }>;

export type PositionType = (typeof positionOptions)[number]['value'];
export type AccentType = (typeof accentOptions)[number]['value'];

export const positionPreview: Record<PositionType, { x: string; y: string }> = {
  'top-right': { x: 'right', y: 'top' },
  'top-left': { x: 'left', y: 'top' },
  'bottom-right': { x: 'right', y: 'bottom' },
  'bottom-left': { x: 'left', y: 'bottom' },
};
