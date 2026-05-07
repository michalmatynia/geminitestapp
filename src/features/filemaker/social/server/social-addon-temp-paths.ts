import 'server-only';

import { getSecurePath } from '@/shared/lib/security/path-guard';

export const SOCIAL_PUBLISHING_ADDON_TEMP_ROOT = '/var/tmp/libapp-uploads/filemaker/social-addons';

export const resolveSocialPublishingAddonTempPath = (value: string): string =>
  getSecurePath(SOCIAL_PUBLISHING_ADDON_TEMP_ROOT, value);
