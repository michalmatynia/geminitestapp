import { NextRequest } from 'next/server';

import { filemakerMailComposeInputSchema } from '@/shared/contracts/filemaker-mail';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server';
import { sendFilemakerMailMessage } from '@/features/filemaker/server';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const input = filemakerMailComposeInputSchema.parse(await req.json());
  return Response.json(await sendFilemakerMailMessage(input), { status: 201 });
}

