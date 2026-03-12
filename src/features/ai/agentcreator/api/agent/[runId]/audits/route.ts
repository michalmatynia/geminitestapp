import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAgentAuditLogDelegate } from '@/features/ai/agent-runtime/store-delegates';
import type {
  AgentAuditLogRecordDto,
  AgentAuditLogRecordsResponse,
} from '@/shared/contracts/agent-runtime';
import { internalError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import {
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';
export const querySchema = z.object({
  stepId: optionalTrimmedQueryString(),
  limit: optionalIntegerQuerySchema(z.number().int().min(10).max(500)),
});

type AgentAuditRouteRecord = {
  id: string;
  runId: string | null;
  level: string;
  message: string;
  metadata?: unknown;
  createdAt: Date | string;
};

export const GET = apiHandlerWithParams<{ runId: string }>(
  async (_req, _ctx, params) => {
    const requestStart = Date.now();
    const agentAuditLog = getAgentAuditLogDelegate();
    if (!agentAuditLog) {
      throw internalError('Agent audit storage is unavailable.');
    }
    const { runId } = params;
    const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
    const stepId = query.stepId ?? null;
    const take = query.limit ?? 200;
    const audits = await agentAuditLog.findMany<AgentAuditRouteRecord>({
      where: { runId },
      orderBy: { createdAt: 'desc' },
      take,
    });
    const filtered = stepId
      ? audits.filter((audit: AgentAuditRouteRecord) => {
        const metadata = audit.metadata as {
          stepId?: string;
          failedStepId?: string;
          activeStepId?: string;
          steps?: Array<{ id?: string }>;
        } | null;
        if (
          metadata?.stepId === stepId ||
          metadata?.failedStepId === stepId ||
          metadata?.activeStepId === stepId
        ) {
          return true;
        }
        if (Array.isArray(metadata?.steps)) {
          return metadata.steps.some((step: { id?: string }) => step?.id === stepId);
        }
        return false;
      })
      : audits;
    if (DEBUG_CHATBOT) {
      void ErrorSystem.logInfo('Audits loaded', {
        service: 'agent-api',
        runId,
        count: filtered.length,
        durationMs: Date.now() - requestStart,
      });
    }
    const response: AgentAuditLogRecordsResponse = {
      audits: filtered.map(
        (audit: AgentAuditRouteRecord): AgentAuditLogRecordDto => ({
          ...audit,
          runId: audit.runId ?? null,
          metadata: audit.metadata ?? null,
          createdAt:
            audit.createdAt instanceof Date ? audit.createdAt.toISOString() : audit.createdAt,
        })
      ),
    };
    return NextResponse.json(response);
  },
  {
    source: 'chatbot.agent.[runId].audits.GET',
    requireAuth: true,
    querySchema,
  }
);
