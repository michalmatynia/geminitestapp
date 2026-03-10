import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import { resolveKangurActor } from '@/features/kangur/server';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { readKangurAiTutorDailyUsage } from '@/features/kangur/server/ai-tutor-usage';
import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  getKangurAiTutorSettingsForLearner,
  parseKangurAiTutorSettings,
  resolveKangurAiTutorAppSettings,
} from '@/features/kangur/settings-ai-tutor';
import type { KangurAiTutorUsageResponse } from '@/shared/contracts/kangur-ai-tutor';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';

export async function getKangurAiTutorUsageHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const tutorContent = await getKangurAiTutorContent('pl');
  const errorMessages = tutorContent.usageApi.availabilityErrors;
  const actor = await resolveKangurActor(req);
  const learnerId = actor.activeLearner.id;

  const rawSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const settingsStore = parseKangurAiTutorSettings(rawSettings);
  const rawAppSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_APP_SETTINGS_KEY);
  const appSettings = resolveKangurAiTutorAppSettings(rawAppSettings, settingsStore);
  const tutorSettings = getKangurAiTutorSettingsForLearner(settingsStore, learnerId, appSettings);

  if (!tutorSettings.enabled) {
    throw badRequestError(errorMessages.disabled, {
      reason: 'disabled',
    });
  }

  if (!actor.ownerEmailVerified) {
    throw badRequestError(errorMessages.emailUnverified, {
      reason: 'email_unverified',
    });
  }

  const usage = await readKangurAiTutorDailyUsage({
    learnerId,
    dailyMessageLimit: tutorSettings.dailyMessageLimit,
  });

  return NextResponse.json({
    usage,
  } satisfies KangurAiTutorUsageResponse);
}
