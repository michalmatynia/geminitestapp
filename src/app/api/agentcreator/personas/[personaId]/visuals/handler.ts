import { type NextRequest, NextResponse } from 'next/server';

import { readAgentPersonaAvatarThumbnailByRef } from '@/features/ai/agentcreator/server/persona-avatar-thumbnails';
import type { AgentPersona } from '@/shared/contracts/agents';
import { AGENT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/agents';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import { readStoredSettingValue, upsertStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


import {
  resolvePersonaVisualsPersonaId,
  resolveStoredAgentPersonas,
} from './handler.helpers';

type AgentPersonaMood = NonNullable<AgentPersona['moods']>[number];

const getMoodWithBackfill = async (
  mood: AgentPersonaMood
): Promise<{ mood: AgentPersonaMood; didBackfill: boolean }> => {
  const thumbnailDataUrl = typeof mood.avatarThumbnailDataUrl === 'string' ? mood.avatarThumbnailDataUrl.trim() : '';

  if (thumbnailDataUrl !== '') {
    return {
      mood: { ...mood, avatarThumbnailDataUrl: thumbnailDataUrl },
      didBackfill: false,
    };
  }

  const useEmbedded = mood.useEmbeddedThumbnail ?? false;
  const thumbnailRef = mood.avatarThumbnailRef ?? '';
  
  if (!useEmbedded || thumbnailRef === '') {
    return {
      mood: { ...mood, avatarThumbnailDataUrl: null },
      didBackfill: false,
    };
  }

  const thumbnail = await readAgentPersonaAvatarThumbnailByRef(thumbnailRef);
  if (thumbnail === null) {
    return {
      mood: { ...mood, avatarThumbnailDataUrl: null },
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

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { personaId: string }
): Promise<Response> {
  const personaId = resolvePersonaVisualsPersonaId(params.personaId);

  const raw = await readStoredSettingValue(AGENT_PERSONA_SETTINGS_KEY);
  const personas = resolveStoredAgentPersonas(raw);
  const persona = personas.find((candidate) => candidate.id === personaId) ?? null;
  if (persona === null) {
    throw notFoundError('Agent persona not found.');
  }

  const moodResults = await Promise.all((persona.moods ?? []).map(getMoodWithBackfill));
  const moods = moodResults.map((result) => result.mood);
  const hasBackfilled = moodResults.some((result) => result.didBackfill);

  if (hasBackfilled) {
    const nextPersonas = personas.map((candidate) =>
      candidate.id === persona.id ? { ...candidate, moods } : candidate
    );

    try {
      await upsertStoredSettingValue(AGENT_PERSONA_SETTINGS_KEY, JSON.stringify(nextPersonas));
    } catch (error) {
      await ErrorSystem.captureException(error);
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

