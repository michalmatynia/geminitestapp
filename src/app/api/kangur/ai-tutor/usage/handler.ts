import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { readKangurAiTutorDailyUsage } from '@/features/kangur/server/ai-tutor-usage';
import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  getKangurAiTutorSettingsForLearner,
  parseKangurAiTutorSettings,
  resolveKangurAiTutorAppSettings,
} from '@/features/kangur/ai-tutor/settings';
import type { KangurAiTutorUsageResponse } from '@/shared/contracts/kangur-ai-tutor';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { normalizeOptionalQueryString } from '@/shared/lib/api/query-schema';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';

export const querySchema = z.object({
  locale: z.preprocess((value) => normalizeOptionalQueryString(value) ?? 'pl', z.string()),
});

export async function getKangurAiTutorUsageHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = querySchema.parse(ctx.query ?? {});
  const tutorContent = await getKangurAiTutorContent(query.locale);
  const errorMessages = tutorContent.usageApi.availabilityErrors;
  const actor = await resolveKangurActor(req);
  const learnerId = requireActiveLearner(actor).id;

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
