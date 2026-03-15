import { NextRequest, NextResponse } from 'next/server';

import { readAgentPersonaAvatarThumbnailByRef } from '@/features/ai/agentcreator/server/persona-avatar-thumbnails';
import type { AgentPersona } from '@/shared/contracts/agents';
import { AGENT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/agents';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { normalizeAgentPersonas } from '@/shared/lib/agent-personas';
import { readStoredSettingValue, upsertStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


type AgentPersonaMood = NonNullable<AgentPersona['moods']>[number];

const resolveMoodVisuals = async (
  mood: AgentPersonaMood
): Promise<{ mood: AgentPersonaMood; didBackfill: boolean }> => {
  const inlineThumbnailDataUrl =
    typeof mood.avatarThumbnailDataUrl === 'string' ? mood.avatarThumbnailDataUrl.trim() : '';

  if (inlineThumbnailDataUrl) {
    return {
      mood: {
        ...mood,
        avatarThumbnailDataUrl: inlineThumbnailDataUrl,
      },
      didBackfill: false,
    };
  }

  if (!(mood.useEmbeddedThumbnail && mood.avatarThumbnailRef)) {
    return {
      mood: {
        ...mood,
        avatarThumbnailDataUrl: null,
      },
      didBackfill: false,
    };
  }

  const thumbnail = await readAgentPersonaAvatarThumbnailByRef(mood.avatarThumbnailRef);
  if (!thumbnail) {
    return {
      mood: {
        ...mood,
        avatarThumbnailDataUrl: null,
      },
      didBackfill: false,
    };
  }

  return {
    mood: {
      ...mood,
      avatarThumbnailDataUrl: thumbnail.dataUrl,
      avatarThumbnailMimeType: thumbnail.mimeType,
      avatarThumbnailBytes: thumbnail.bytes,
      avatarThumbnailWidth: thumbnail.width,
      avatarThumbnailHeight: thumbnail.height,
    },
    didBackfill: true,
  };
};

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

  const moodResults = await Promise.all((persona.moods ?? []).map(resolveMoodVisuals));
  const moods = moodResults.map(({ mood }) => mood);
  const didBackfill = moodResults.some(({ didBackfill }) => didBackfill);

  if (didBackfill) {
    const nextPersonas = personas.map((candidate) =>
      candidate.id === persona.id ? { ...candidate, moods } : candidate
    );

    try {
      await upsertStoredSettingValue(AGENT_PERSONA_SETTINGS_KEY, JSON.stringify(nextPersonas));
    } catch (error) {
      void ErrorSystem.captureException(error);
    
      // Keep the visuals response available even if the lazy backfill write fails.
    }
  }

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
