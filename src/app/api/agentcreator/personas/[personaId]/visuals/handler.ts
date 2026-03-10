import { NextRequest, NextResponse } from 'next/server';

import { readAgentPersonaAvatarThumbnailByRef } from '@/features/ai/agentcreator/server/persona-avatar-thumbnails';
import type { AgentPersona } from '@/shared/contracts/agents';
import { AGENT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/agents';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { normalizeAgentPersonas } from '@/shared/lib/agent-personas';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { personaId: string }
): Promise<Response> {
  const personaId = params.personaId?.trim();
  if (!personaId) {
    throw badRequestError('Persona id is required.');
  }

  const raw = await readStoredSettingValue(AGENT_PERSONA_SETTINGS_KEY);
  const personas = normalizeAgentPersonas(raw?.trim() ? JSON.parse(raw) : []);
  const persona = personas.find((candidate) => candidate.id === personaId) ?? null;
  if (!persona) {
    throw notFoundError('Agent persona not found.');
  }

  const moods = await Promise.all(
    (persona.moods ?? []).map(async (mood) => {
      const thumbnail =
        mood.useEmbeddedThumbnail && mood.avatarThumbnailRef
          ? await readAgentPersonaAvatarThumbnailByRef(mood.avatarThumbnailRef)
          : null;

      return {
        ...mood,
        avatarThumbnailDataUrl: thumbnail?.dataUrl ?? null,
        avatarThumbnailMimeType: thumbnail?.mimeType ?? mood.avatarThumbnailMimeType ?? null,
        avatarThumbnailBytes: thumbnail?.bytes ?? mood.avatarThumbnailBytes ?? null,
        avatarThumbnailWidth: thumbnail?.width ?? mood.avatarThumbnailWidth ?? null,
        avatarThumbnailHeight: thumbnail?.height ?? mood.avatarThumbnailHeight ?? null,
      };
    })
  );

  const payload: AgentPersona = {
    ...persona,
    moods,
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
