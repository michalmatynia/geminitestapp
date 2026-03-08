import { NextRequest, NextResponse } from 'next/server';

import { getAgentPersonaById, searchAgentPersonaMemory } from '@/features/ai/agentcreator/server/persona-memory';
import { agentPersonaMoodIdSchema, type AgentPersonaMoodId } from '@/shared/contracts/agents';
import { type PersonaMemorySourceType, personaMemorySourceTypeSchema } from '@/shared/contracts/persona-memory';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { personaId: string }
): Promise<Response> {
  const personaId = params.personaId?.trim();
  if (!personaId) {
    throw badRequestError('Persona id is required.');
  }

  const persona = await getAgentPersonaById(personaId);
  if (!persona) {
    throw notFoundError('Agent persona not found.');
  }

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || null;
  const tag = url.searchParams.get('tag')?.trim() || null;
  const topic = url.searchParams.get('topic')?.trim() || null;
  const rawMood = url.searchParams.get('mood')?.trim() || null;
  const rawSourceType = url.searchParams.get('sourceType')?.trim() || null;
  const parsedMood = rawMood ? agentPersonaMoodIdSchema.safeParse(rawMood) : null;
  const parsedSourceType = rawSourceType
    ? personaMemorySourceTypeSchema.safeParse(rawSourceType)
    : null;

  if (rawMood && !parsedMood?.success) {
    throw badRequestError('Invalid persona memory mood filter.');
  }

  if (rawSourceType && !parsedSourceType?.success) {
    throw badRequestError('Invalid persona memory source type.');
  }

  const limitParam = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) ? limitParam : undefined;

  const payload = await searchAgentPersonaMemory({
    personaId,
    q,
    tag,
    topic,
    mood: parsedMood?.success ? (parsedMood.data as AgentPersonaMoodId) : null,
    sourceType: parsedSourceType?.success
      ? (parsedSourceType.data as PersonaMemorySourceType)
      : null,
    limit,
  });

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
