import { NextRequest, NextResponse } from 'next/server';

import { buildPlaywrightAiPathsFixtureCleanupPlan } from '@/features/ai/ai-paths/lib/playwright-fixture-cleanup';
import {
  deleteAiPathsSettings,
  getAiPathsSetting,
  requireAiPathsAccess,
  upsertAiPathsSetting,
} from '@/features/ai/ai-paths/server';
import {
  AI_PATHS_INDEX_KEY,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
} from '@/features/ai/ai-paths/server/settings-store.constants';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await requireAiPathsAccess();

  const [triggerButtonsRaw, indexRaw] = await Promise.all([
    getAiPathsSetting(AI_PATHS_TRIGGER_BUTTONS_KEY),
    getAiPathsSetting(AI_PATHS_INDEX_KEY),
  ]);

  const plan = buildPlaywrightAiPathsFixtureCleanupPlan({
    triggerButtonsRaw,
    indexRaw,
  });

  if (plan.removedTriggerButtons > 0) {
    await upsertAiPathsSetting(AI_PATHS_TRIGGER_BUTTONS_KEY, plan.nextTriggerButtonsRaw);
  }

  if (plan.removedPathIndexEntries > 0) {
    await upsertAiPathsSetting(AI_PATHS_INDEX_KEY, plan.nextIndexRaw);
  }

  if (plan.pathConfigKeysToDelete.length > 0) {
    await deleteAiPathsSettings(plan.pathConfigKeysToDelete);
  }

  return NextResponse.json({
    removedTriggerButtons: plan.removedTriggerButtons,
    removedPathIndexEntries: plan.removedPathIndexEntries,
    removedPathConfigs: plan.removedPathConfigs,
  });
}
