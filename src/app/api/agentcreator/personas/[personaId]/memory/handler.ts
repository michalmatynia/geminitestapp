import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAgentPersonaById, searchAgentPersonaMemory } from '@/features/ai/agentcreator/server/persona-memory';
import { agentPersonaMoodIdSchema } from '@/shared/contracts/agents';
import { personaMemorySourceTypeSchema } from '@/shared/contracts/persona-memory';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import {
  normalizeOptionalQueryString,
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  q: optionalTrimmedQueryString(),
  tag: optionalTrimmedQueryString(),
  topic: optionalTrimmedQueryString(),
  mood: z.preprocess(normalizeOptionalQueryString, agentPersonaMoodIdSchema.optional()),
  sourceType: z.preprocess(
    normalizeOptionalQueryString,
    personaMemorySourceTypeSchema.optional()
  ),
  limit: optionalIntegerQuerySchema(z.number().int()),
});

const resolveSearchInput = (personaId: string, query: z.infer<typeof querySchema>): Parameters<typeof searchAgentPersonaMemory>[0] => ({
  personaId,
  q: query.q ?? null,
  tag: query.tag ?? null,
  topic: query.topic ?? null,
  mood: query.mood ?? null,
  sourceType: query.sourceType ?? null,
  limit: query.limit ?? undefined,
});

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { personaId: string }
): Promise<Response> {
  const personaId = params.personaId.trim();
  if (personaId.length === 0) {
    throw badRequestError('Persona id is required.');
  }

  const persona = await getAgentPersonaById(personaId);
  if (!persona) {
    throw notFoundError('Agent persona not found.');
  }

  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const payload = await searchAgentPersonaMemory(resolveSearchInput(personaId, query));

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
