import { useOptionalCmsStorefrontAppearance } from '@/features/cms/public';
import {
  KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY,
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
} from '@/features/kangur/appearance/storefront-appearance-settings';
import type { SocialPublishingCaptureAppearanceMode } from '@/shared/contracts/social-publishing-image-addons';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

export const normalizeAppearanceMode = (
  value: string | null | undefined
): SocialPublishingCaptureAppearanceMode | null =>
  value === 'default' || value === 'dawn' || value === 'sunset' || value === 'dark'
    ? value
    : null;

const readPersistedAppearanceMode = (): SocialPublishingCaptureAppearanceMode | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return normalizeAppearanceMode(
      window.localStorage.getItem(KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY)
    );
  } catch {
    return null;
  }
};

export const useResolvedCaptureAppearanceMode =
  (): SocialPublishingCaptureAppearanceMode => {
    const settingsStore = useSettingsStore();
    const storefrontAppearance = useOptionalCmsStorefrontAppearance();
    const storedDefaultAppearanceMode = settingsStore.get(
      KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY
    );

    return (
      normalizeAppearanceMode(storefrontAppearance?.mode) ??
      readPersistedAppearanceMode() ??
      normalizeAppearanceMode(storedDefaultAppearanceMode) ??
      'default'
    );
  };
