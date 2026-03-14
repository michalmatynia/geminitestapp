import 'server-only';

import type { KangurActor } from '@/features/kangur/services/kangur-actor';
import type { SystemLogLevelDto as SystemLogLevel } from '@/shared/contracts/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import type { NextRequest } from 'next/server';

type KangurRequestContext = Pick<ApiHandlerContext, 'requestId' | 'traceId' | 'correlationId'>;

type LogKangurServerEventInput = {
  source: string;
  message: string;
  level?: SystemLogLevel;
  service?: string;
  request?: NextRequest;
  requestContext?: KangurRequestContext | null;
  actor?: KangurActor | null;
  error?: unknown;
  statusCode?: number | null;
  context?: Record<string, unknown> | null;
};

const buildActorContext = (actor?: KangurActor | null): Record<string, unknown> => {
  if (!actor) {
    return {};
  }

  const activeLearner = actor.activeLearner ?? null;
  return {
    actorType: actor.actorType,
    ownerUserId: actor.ownerUserId,
    learnerId: activeLearner?.id ?? null,
    learnerStatus: activeLearner?.status ?? null,
    canManageLearners: actor.canManageLearners,
  };
};

export const logKangurServerEvent = async (
  input: LogKangurServerEventInput
): Promise<void> => {
  try {
    await logSystemEvent({
      level: input.level ?? 'info',
      message: input.message,
      source: input.source,
      service: input.service ?? 'kangur.api',
      request: input.request,
      requestId: input.requestContext?.requestId ?? null,
      traceId: input.requestContext?.traceId ?? null,
      correlationId: input.requestContext?.correlationId ?? null,
      statusCode: input.statusCode ?? undefined,
      error: input.error,
      context: {
        feature: 'kangur',
        ...buildActorContext(input.actor),
        ...(input.context ?? {}),
      },
    });
  } catch {
    // Never throw from feature telemetry helpers.
  }
};
