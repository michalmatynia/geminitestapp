export const runtime = 'nodejs';

import { type NextRequest, NextResponse } from 'next/server';

import {
  filemakerGoalAutomationRequestSchema,
  runGoalAutomationStream,
} from './handler';

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = filemakerGoalAutomationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const stream = await runGoalAutomationStream(parsed.data);

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
