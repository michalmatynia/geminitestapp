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

/**
 * Builds a standardized source string for logging: 'ai.agentcreator.audit.<action>'
 */
const buildAgentCreatorAuditSource = (action: string): string => `ai.agentcreator.audit.${action}`;

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

type AgentAuditMetadata = {
  stepId?: string;
  failedStepId?: string;
  activeStepId?: string;
  steps?: Array<{ id?: string }>;
};

const isNonEmptyString = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value.length > 0;

const hasMatchingAuditMetadataField = (metadata: AgentAuditMetadata, stepId: string): boolean =>
  metadata.stepId === stepId ||
  metadata.failedStepId === stepId ||
  metadata.activeStepId === stepId;

const hasMatchingAuditMetadataStep = (metadata: AgentAuditMetadata, stepId: string): boolean => {
  if (!Array.isArray(metadata.steps)) {
    return false;
  }
  return metadata.steps.some((step: { id?: string }) => step.id === stepId);
};

const auditMatchesStepId = (audit: AgentAuditRouteRecord, stepId: string): boolean => {
  const metadata = audit.metadata as AgentAuditMetadata | null;
  if (metadata === null) {
    return false;
  }
  return hasMatchingAuditMetadataField(metadata, stepId) || hasMatchingAuditMetadataStep(metadata, stepId);
};

const toAgentAuditLogRecordDto = (
  audit: AgentAuditRouteRecord
): AgentAuditLogRecordDto => ({
  ...audit,
  runId: audit.runId ?? null,
  metadata: audit.metadata ?? null,
  createdAt:
    audit.createdAt instanceof Date ? audit.createdAt.toISOString() : audit.createdAt,
});

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
    const filtered = isNonEmptyString(stepId)
      ? audits.filter((audit: AgentAuditRouteRecord) => auditMatchesStepId(audit, stepId))
      : audits;
    if (DEBUG_CHATBOT) {
      void ErrorSystem.logInfo('Audits loaded', {
        service: buildAgentCreatorAuditSource('loaded'),
        runId,
        count: filtered.length,
        durationMs: Date.now() - requestStart,
      });
    }
    const response: AgentAuditLogRecordsResponse = {
      audits: filtered.map(toAgentAuditLogRecordDto),
    };
    return NextResponse.json(response);
  },
  {
    source: 'chatbot.agent.[runId].audits.GET',
    requireAuth: true,
    querySchema,
  }
);
