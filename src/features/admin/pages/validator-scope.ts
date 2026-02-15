export type ValidatorScope =
  | 'products'
  | 'image-studio'
  | 'prompt-exploder'
  | 'case-resolver-prompt-exploder';

export const parseValidatorScope = (value: string | null): ValidatorScope =>
  value === 'image-studio'
    ? 'image-studio'
    : value === 'prompt-exploder'
      ? 'prompt-exploder'
      : value === 'case-resolver-prompt-exploder'
        ? 'case-resolver-prompt-exploder'
        : 'products';
