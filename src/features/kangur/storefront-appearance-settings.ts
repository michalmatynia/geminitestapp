import { KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY } from '@/features/kangur/shared/contracts/kangur';
import type { LabeledOptionDto } from '@/shared/contracts/base';

export { KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY };

export type KangurStorefrontAppearanceMode = 'default' | 'dawn' | 'sunset' | 'dark';

export type KangurStorefrontThemeSettingsSnapshot = Record<
  KangurStorefrontAppearanceMode,
  string | null
>;

export type KangurStorefrontInitialState = {
  initialMode: KangurStorefrontAppearanceMode;
  initialThemeSettings: KangurStorefrontThemeSettingsSnapshot;
};

export const KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY = 'kangur-storefront-appearance-mode';

export const KANGUR_STOREFRONT_THEME_OPTIONS = [
  {
    value: 'default',
    label: 'Motyw dzienny',
  },
  {
    value: 'dawn',
    label: 'Motyw świtowy',
  },
  {
    value: 'sunset',
    label: 'Motyw zachodu',
  },
  {
    value: 'dark',
    label: 'Motyw nocny',
  },
] as const satisfies ReadonlyArray<LabeledOptionDto<KangurStorefrontAppearanceMode>>;

export const parseKangurStorefrontAppearanceMode = (
  raw: string | null | undefined
): KangurStorefrontAppearanceMode => {
  if (raw === 'dark' || raw === 'dawn' || raw === 'sunset') {
    return raw;
  }
  return 'default';
};
