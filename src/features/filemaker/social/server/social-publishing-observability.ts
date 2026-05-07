import 'server-only';

import type { SocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import type { SystemLogLevelDto as SystemLogLevel } from '@/shared/contracts/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { NextRequest } from 'next/server';

type SocialPublishingRequestContext = Pick<
  ApiHandlerContext,
  'requestId' | 'traceId' | 'correlationId'
>;

type LogSocialPublishingServerEventInput = {
  source: string;
  message: string;
  level?: SystemLogLevel;
  service?: string;
  request?: NextRequest;
  requestContext?: SocialPublishingRequestContext | null;
  actor?: SocialPublishingActor | null;
  error?: unknown;
  statusCode?: number | null;
  context?: Record<string, unknown> | null;
};

const buildActorContext = (
  actor?: SocialPublishingActor | null
): Record<string, unknown> => {
  if (!actor) return {};
  return {
    actorId: actor.actorId,
    actorRole: actor.role,
  };
};

export const logSocialPublishingServerEvent = async (
  input: LogSocialPublishingServerEventInput
): Promise<void> => {
  try {
    await logSystemEvent({
      level: input.level ?? 'info',
      message: input.message,
      source: input.source,
      service: input.service ?? 'filemaker.social-publishing.api',
      request: input.request,
      requestId: input.requestContext?.requestId ?? null,
      traceId: input.requestContext?.traceId ?? null,
      correlationId: input.requestContext?.correlationId ?? null,
      statusCode: input.statusCode ?? undefined,
      error: input.error,
      context: {
        feature: 'social_publishing',
        ...buildActorContext(input.actor),
        ...(input.context ?? {}),
      },
    });
  } catch (error) {
    void ErrorSystem.captureException(error);
  }
};
