import { NextResponse } from 'next/server';

import { ErrorSystem } from '@/features/observability/server';
import { internalError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import prisma from '@/shared/lib/db/prisma';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

export const GET = apiHandlerWithParams<{ runId: string }>(
  async (req, _ctx, params) => {
    const requestStart = Date.now();
    if (!('agentAuditLog' in prisma)) {
      throw internalError(
        'Agent steps not initialized. Run prisma generate/db push.'
      );
    }
    const { runId } = params;
    const url = new URL(req.url);
    const stepId = url.searchParams.get('stepId');
    const limit = Number(url.searchParams.get('limit') ?? '200');
    const take = Number.isFinite(limit) ? Math.min(Math.max(limit, 10), 500) : 200;
    const audits = await prisma.agentAuditLog.findMany({
      where: { runId },
      orderBy: { createdAt: 'desc' },
      take,
    });
    const filtered = stepId
      ? audits.filter((audit) => {
        const metadata = audit.metadata as
            | {
                stepId?: string;
                failedStepId?: string;
                activeStepId?: string;
                steps?: Array<{ id?: string }>;
              }
            | null;
        if (
          metadata?.stepId === stepId ||
            metadata?.failedStepId === stepId ||
            metadata?.activeStepId === stepId
        ) {
          return true;
        }
        if (Array.isArray(metadata?.steps)) {
          return metadata?.steps.some((step) => step?.id === stepId);
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
    return NextResponse.json({ audits: filtered });
  },
  { source: 'chatbot.agent.[runId].audits.GET' }
);
