import { KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY } from '@/shared/contracts/kangur';

export { KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY };

export type KangurStorefrontAppearanceMode = 'default' | 'dark';

export const KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY = 'kangur-storefront-appearance-mode';

export const KANGUR_STOREFRONT_THEME_OPTIONS = [
  {
    value: 'default',
    label: 'Motyw dzienny',
  },
  {
    value: 'dark',
    label: 'Motyw nocny',
  },
] as const satisfies ReadonlyArray<{
  value: KangurStorefrontAppearanceMode;
  label: string;
}>;

export const parseKangurStorefrontAppearanceMode = (
  raw: string | null | undefined
): KangurStorefrontAppearanceMode => (raw === 'dark' ? 'dark' : 'default');
