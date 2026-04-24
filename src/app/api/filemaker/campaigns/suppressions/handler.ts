import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { assertSettingsManageAccess } from '@/features/auth/server';
import {
  loadFilemakerMailSuppressionEntries,
  removeFilemakerMailSuppressionEntry,
} from '@/features/filemaker/server';
import { notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const deleteBodySchema = z.object({
  emailAddress: z.string().trim().min(1, 'emailAddress is required'),
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
  const { emailAddress } = deleteBodySchema.parse(await req.json());
  const { removed, entry } = await removeFilemakerMailSuppressionEntry(emailAddress);
  if (!removed) {
    throw notFoundError(
      `No suppression entry found for ${emailAddress.trim().toLowerCase()}.`
    );
  }
  return NextResponse.json({ removed: true, entry });
}
