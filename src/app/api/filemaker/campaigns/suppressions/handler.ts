import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { assertSettingsManageAccess } from '@/features/auth/server';
import {
  bulkImportFilemakerMailSuppressions,
  loadFilemakerMailSuppressionEntries,
  pruneFilemakerCampaignColdRecipients,
  removeFilemakerMailSuppressionEntry,
} from '@/features/filemaker/server';
import { notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import type { FilemakerEmailCampaignSuppressionEntry } from '@/features/filemaker/types';

const deleteBodySchema = z.object({
  emailAddress: z.string().trim().min(1, 'emailAddress is required'),
});
const putBodySchema = z.object({
  emailAddresses: z.array(z.string().trim().min(1)).min(1, 'At least one email address is required'),
});
const pruneBodySchema = z.object({
  minSendsWithoutEngagement: z.number().int().min(1).max(100).optional(),
});

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertSettingsManageAccess();
  const entries = await loadFilemakerMailSuppressionEntries();
  return NextResponse.json({ entries });
}

export async function deleteHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertSettingsManageAccess();
  const body = (await req.json()) as unknown;
  const parsedBody: z.infer<typeof deleteBodySchema> = deleteBodySchema.parse(body);
  const result = (await removeFilemakerMailSuppressionEntry(parsedBody.emailAddress)) as {
    removed: boolean;
    entry: FilemakerEmailCampaignSuppressionEntry | null;
  };
  if (!result.removed) {
    throw notFoundError(
      `No suppression entry found for ${parsedBody.emailAddress.trim().toLowerCase()}.`
    );
  }
  return NextResponse.json({ removed: true, entry: result.entry });
}

export async function putHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertSettingsManageAccess();
  const body = (await req.json()) as unknown;
  const { emailAddresses } = putBodySchema.parse(body);
  const result = await bulkImportFilemakerMailSuppressions({
    emailAddresses,
    actor: 'admin-csv-import',
  });
  return NextResponse.json(result);
}

export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertSettingsManageAccess();
  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsedBody: z.infer<typeof pruneBodySchema> = pruneBodySchema.parse(body);
  const result = await pruneFilemakerCampaignColdRecipients({
    actor: 'admin-manual-cold-prune',
    minSendsWithoutEngagement: parsedBody.minSendsWithoutEngagement,
  });
  return NextResponse.json(result);
}
