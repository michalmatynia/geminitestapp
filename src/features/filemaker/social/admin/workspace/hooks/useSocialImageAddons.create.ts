import {
  logSocialPublishingClientError,
  trackSocialPublishingClientEvent,
} from '@/features/filemaker/social/client-observability';
import type { CreateSocialPublishingImageAddonPayload } from '@/features/filemaker/social/hooks/useSocialPublishingImageAddons';
import type { SocialPublishingCaptureAppearanceMode } from '@/shared/contracts/social-publishing-image-addons';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';

import { emptyAddonForm } from '../SocialPublishingPage.Constants';
import type { SocialImageAddonsDeps, SocialImageAddonsMutations } from './useSocialImageAddons.types';

const optionalTrimmedText = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveWaitForMs = (value: string): number | undefined => {
  const waitForMsRaw = Number(value);
  return Number.isFinite(waitForMsRaw) ? Math.max(0, waitForMsRaw) : undefined;
};

const buildCreateAddonPayload = ({
  appearanceMode,
  deps,
}: {
  appearanceMode: SocialPublishingCaptureAppearanceMode;
  deps: SocialImageAddonsDeps;
}): CreateSocialPublishingImageAddonPayload | null => {
  const title = deps.addonForm.title.trim();
  const sourceUrl = deps.addonForm.sourceUrl.trim();
  if (title.length === 0 || sourceUrl.length === 0) {
    return null;
  }

  const payload: CreateSocialPublishingImageAddonPayload = {
    title,
    sourceUrl,
    description: optionalTrimmedText(deps.addonForm.description),
    selector: optionalTrimmedText(deps.addonForm.selector),
    appearanceMode,
  };
  const waitForMs = resolveWaitForMs(deps.addonForm.waitForMs);
  if (waitForMs !== undefined) {
    payload.waitForMs = waitForMs;
  }
  return payload;
};

export const createSocialImageAddon = async ({
  appearanceMode,
  createAddonMutation,
  deps,
}: Pick<SocialImageAddonsMutations, 'createAddonMutation'> & {
  appearanceMode: SocialPublishingCaptureAppearanceMode;
  deps: SocialImageAddonsDeps;
}): Promise<void> => {
  const payload = buildCreateAddonPayload({ appearanceMode, deps });
  if (payload === null) {
    return;
  }

  trackSocialPublishingClientEvent(
    'social_publishing_addon_capture_attempt',
    deps.buildSocialContext({ addonTitleLength: payload.title.length })
  );
  try {
    const created = await createAddonMutation.mutateAsync(payload);
    deps.setAddonForm(emptyAddonForm);
    trackSocialPublishingClientEvent(
      'social_publishing_addon_capture_success',
      deps.buildSocialContext({ addonId: created.id })
    );
  } catch (error) {
    void ErrorSystem.captureException(error);
    logSocialPublishingClientError(error, {
      source: 'AdminSocialPublishingPage',
      action: 'createAddon',
      ...deps.buildSocialContext({ error: true }),
    });
    trackSocialPublishingClientEvent(
      'social_publishing_addon_capture_failed',
      deps.buildSocialContext({ error: true })
    );
  }
};
