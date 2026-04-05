import 'server-only';

import { getSecurePath } from '@/shared/lib/security/path-guard';

export const KANGUR_SOCIAL_ADDON_TEMP_ROOT = '/var/tmp/libapp-uploads/kangur/social-addons';

export const resolveKangurSocialAddonTempPath = (value: string): string =>
  getSecurePath(KANGUR_SOCIAL_ADDON_TEMP_ROOT, value);
