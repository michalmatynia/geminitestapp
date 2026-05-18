'use client';

import { useSocialMissingImageAddons } from './hooks/useSocialMissingImageAddons';
import { useSocialModelTelemetry } from './hooks/useSocialModelTelemetry';
import { useSocialSettings } from './hooks/useSocialSettings';
import { useAdminSocialPageActions } from './SocialPublishingPage.hooks.actions';
import { useAdminSocialContextBuilder } from './SocialPublishingPage.hooks.context';
import {
  buildAdminSocialPublishingPageResult,
  type AdminSocialPublishingPageResult,
} from './SocialPublishingPage.hooks.result';
import {
  resolveAdminSocialPublishingSettings,
  resolveAdminSocialVisualState,
} from './SocialPublishingPage.hooks.runtime';
import {
  useAdminSocialCaptureFlows,
  useAdminSocialContextLoader,
  useAdminSocialEditor,
  useAdminSocialGeneration,
  useAdminSocialImageAddons,
  useAdminSocialPipeline,
  useAdminSocialPostCrud,
} from './SocialPublishingPage.hooks.wiring';

type UseAdminSocialPublishingPageOptions = {
  preloadSettingsModalData?: boolean;
};

export function useAdminSocialPublishingPage(
  options?: UseAdminSocialPublishingPageOptions
): AdminSocialPublishingPageResult {
  const settings = useSocialSettings({
    preloadSettingsModalData: options?.preloadSettingsModalData,
  });
  const resolved = resolveAdminSocialPublishingSettings(settings);
  const editor = useAdminSocialEditor({ resolved, settings });
  const visual = resolveAdminSocialVisualState({ editor, resolved });
  const buildSocialContext = useAdminSocialContextBuilder({ editor, resolved, settings });
  const crud = useAdminSocialPostCrud({ buildSocialContext, editor, resolved, settings });
  const imageAddons = useAdminSocialImageAddons({ buildSocialContext, editor, settings });
  const context = useAdminSocialContextLoader({ buildSocialContext, editor });
  const generation = useAdminSocialGeneration({ buildSocialContext, editor, resolved, settings });
  const pipeline = useAdminSocialPipeline({
    buildSocialContext,
    context,
    editor,
    imageAddons,
    resolved,
    settings,
    visual,
  });
  const missingImageAddons = useSocialMissingImageAddons({ editor, crud, buildSocialContext });
  const captureFlows = useAdminSocialCaptureFlows({
    buildSocialContext,
    crud,
    editor,
    imageAddons,
    pipeline,
    resolved,
    settings,
  });
  const telemetry = useSocialModelTelemetry({ settings, buildSocialContext });
  const actions = useAdminSocialPageActions({ captureFlows, generation, pipeline });

  return buildAdminSocialPublishingPageResult({
    actions,
    captureFlows,
    context,
    crud,
    editor,
    generation,
    imageAddons,
    missingImageAddons,
    pipeline,
    resolved,
    settings,
    telemetry,
    visual,
  });
}
