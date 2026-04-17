import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { assertSettingsManageAccess } from '@/features/auth/server';
import { isPlaywrightProgrammableSlug } from '@/features/integrations/constants/slugs';
import { getIntegrationRepository } from '@/features/integrations/server';
import {
  buildProgrammableConnectionActionMigrationPreview,
  mergePlaywrightActionsWithProgrammableConnectionDrafts,
} from '@/features/integrations/utils/playwright-programmable-connection-migration';
import { PLAYWRIGHT_ACTIONS_SETTINGS_KEY } from '@/shared/contracts/playwright-steps';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { fetchResolvedPlaywrightRuntimeActions } from '@/shared/lib/browser-execution/runtime-action-resolver.server';
import { parseAndValidatePlaywrightActionsSettingValue } from '@/shared/lib/browser-execution/playwright-actions-settings-validation';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { clearSettingsCache } from '@/shared/lib/settings-cache';
import { encodeSettingValue } from '@/shared/lib/settings/settings-compression';
import { serializeSetting } from '@/shared/utils/settings-json';

const promoteProgrammableBrowserOwnershipSchema = z
  .object({
    name: z.string().trim().min(1),
    playwrightListingScript: z.string().trim().nullable().optional(),
    playwrightImportScript: z.string().trim().nullable().optional(),
    playwrightImportBaseUrl: z.string().trim().nullable().optional(),
    playwrightListingActionId: z.string().trim().nullable().optional(),
    playwrightImportActionId: z.string().trim().nullable().optional(),
    playwrightImportCaptureRoutesJson: z.string().trim().nullable().optional(),
    playwrightFieldMapperJson: z.string().trim().nullable().optional(),
    proxyPassword: z.string().trim().nullable().optional(),
  })
  .strict();

const upsertPlaywrightActionsSetting = async (value: string): Promise<void> => {
  const validated = parseAndValidatePlaywrightActionsSettingValue(value);
  if (!validated.ok) {
    throw badRequestError(validated.error);
  }

  const mongo = await getMongoDb();
  const now = new Date();
  await mongo.collection('settings').updateOne(
    { key: PLAYWRIGHT_ACTIONS_SETTINGS_KEY },
    {
      $set: {
        value: encodeSettingValue(PLAYWRIGHT_ACTIONS_SETTINGS_KEY, validated.value),
        updatedAt: now,
      },
      $setOnInsert: {
        key: PLAYWRIGHT_ACTIONS_SETTINGS_KEY,
        createdAt: now,
      },
    },
    { upsert: true }
  );
  clearSettingsCache();
};

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  await assertSettingsManageAccess();

  const connectionId = params.id;
  if (!connectionId) {
    throw badRequestError('Connection id is required');
  }

  const parsed = await parseJsonBody(req, promoteProgrammableBrowserOwnershipSchema, {
    logPrefix: 'integrations.connections.promotePlaywrightBrowserOwnership.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const repo = await getIntegrationRepository();
  const existingConnection = await repo.getConnectionById(connectionId);
  if (!existingConnection) {
    throw notFoundError('Connection not found', { connectionId });
  }

  const integration = await repo.getIntegrationById(existingConnection.integrationId);
  if (!integration || !isPlaywrightProgrammableSlug(integration.slug)) {
    throw badRequestError('Only programmable connections support Step Sequencer browser ownership promotion.', {
      connectionId,
      integrationId: existingConnection.integrationId,
      integrationSlug: integration?.slug ?? null,
    });
  }

  const actions = await fetchResolvedPlaywrightRuntimeActions();
  const nextConnectionState = {
    ...existingConnection,
    name: parsed.data.name,
    playwrightListingActionId: parsed.data.playwrightListingActionId ?? null,
    playwrightImportActionId: parsed.data.playwrightImportActionId ?? null,
    ...(typeof parsed.data.proxyPassword === 'string' && parsed.data.proxyPassword.length > 0
      ? { playwrightProxyPassword: parsed.data.proxyPassword }
      : {}),
  };
  const preview = buildProgrammableConnectionActionMigrationPreview({
    connection: nextConnectionState,
    actions,
  });

  if (!preview.hasLegacyBrowserBehavior) {
    throw badRequestError('This programmable connection no longer has legacy browser settings to promote.', {
      connectionId,
    });
  }

  if (preview.requiresManualProxyPasswordInput) {
    throw badRequestError(
      'Re-enter the programmable connection proxy password before promoting browser ownership into action drafts.',
      { connectionId }
    );
  }

  await upsertPlaywrightActionsSetting(
    serializeSetting(
      mergePlaywrightActionsWithProgrammableConnectionDrafts({
        actions,
        listingDraftAction: preview.listingDraftAction,
        importDraftAction: preview.importDraftAction,
      })
    )
  );

  await repo.updateConnection(connectionId, {
    name: parsed.data.name,
    playwrightListingScript: parsed.data.playwrightListingScript ?? null,
    playwrightImportScript: parsed.data.playwrightImportScript ?? null,
    playwrightImportBaseUrl: parsed.data.playwrightImportBaseUrl ?? null,
    playwrightImportCaptureRoutesJson: parsed.data.playwrightImportCaptureRoutesJson ?? null,
    playwrightFieldMapperJson: parsed.data.playwrightFieldMapperJson ?? null,
    playwrightListingActionId: preview.listingDraftAction.id,
    playwrightImportActionId: preview.importDraftAction.id,
    resetPlaywrightOverrides: true,
  });

  return NextResponse.json({
    connectionId,
    listingActionId: preview.listingDraftAction.id,
    importActionId: preview.importDraftAction.id,
    listingDraftActionName: preview.listingDraftAction.name,
    importDraftActionName: preview.importDraftAction.name,
  });
}
