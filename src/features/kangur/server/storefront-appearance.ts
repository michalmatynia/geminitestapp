import 'server-only';

import {
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
  parseKangurStorefrontAppearanceMode,
  type KangurStorefrontAppearanceMode,
} from '@/features/kangur/storefront-appearance-settings';
import { getSettingValue } from '@/shared/lib/ai/server-settings';

export const getKangurStorefrontDefaultMode = async (): Promise<KangurStorefrontAppearanceMode> => {
  const raw = await getSettingValue(KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY);
  return parseKangurStorefrontAppearanceMode(raw);
};
