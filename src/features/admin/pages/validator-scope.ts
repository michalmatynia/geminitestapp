export type ValidatorScope = 'products' | 'image-studio' | 'prompt-exploder';

export const parseValidatorScope = (value: string | null): ValidatorScope =>
  value === 'image-studio'
    ? 'image-studio'
    : value === 'prompt-exploder'
      ? 'prompt-exploder'
      : 'products';
