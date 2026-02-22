import 'server-only';

import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

import { Prisma } from '@prisma/client';

import { ErrorSystem } from '@/features/observability/server';
import prisma from '@/shared/lib/db/prisma';

import {
  launchBrowser,
  createBrowserContext,
  captureSnapshot,
  captureSessionContext,
} from './playwright/browser';
import { collectUiInventory } from './playwright/inventory';
import { extractTargetUrl } from './utils';

import type { AgentControlAction, AgentToolResult } from './tool-types';
import type { Browser, BrowserContext, Page } from 'playwright';

export async function runAgentBrowserControl({
  runId,
  action,
  url,
  stepId,
  stepLabel,
}: {
  runId: string;
  action: AgentControlAction;
  url?: string | undefined;
  stepId?: string | undefined;
  stepLabel?: string | undefined;
}): Promise<AgentToolResult> {
  const debugEnabled = process.env['DEBUG_CHATBOT'] === 'true';
  if (!('agentBrowserLog' in prisma) || !('agentBrowserSnapshot' in prisma)) {
    void ErrorSystem.logWarning('[chatbot][agent][tool] Agent browser tables not initialized.', {
      service: 'agent-control',
      runId
    });
    return {
      ok: false,
      error: 'Agent browser tables not initialized. Run prisma generate/db push.',
    };
  }

  let launch: Browser | null = null;
  let context: BrowserContext | null = null;
  try {
    const run = await prisma.chatbotAgentRun.findUnique({ where: { id: runId } });
    if (!run) {
      return { ok: false, error: 'Agent run not found.' };
    }

    const runDir = path.join(process.cwd(), 'tmp', 'chatbot-agent', runId);
    await fs.mkdir(runDir, { recursive: true });

    const activeStepId = stepId ?? null;
    const log = async (
      level: string,
      message: string,
      metadata?: Record<string, unknown>
    ): Promise<void> => {
      await prisma.agentBrowserLog.create({
        data: {
          runId,
          stepId: activeStepId,
          level,
          message,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    };

    const latestSnapshot = await prisma.agentBrowserSnapshot.findFirst({
      where: { runId },
      orderBy: { createdAt: 'desc' },
    });

    const fallbackUrl = extractTargetUrl(run.prompt) ?? null;
    const latestUrl =
      latestSnapshot?.url && latestSnapshot.url !== 'about:blank'
        ? latestSnapshot.url
        : null;
    const targetUrl =
      action === 'goto' && url?.trim()
        ? url.trim()
        : latestUrl ?? fallbackUrl;

    if (!targetUrl && action !== 'snapshot') {
      return { ok: false, error: 'No target URL available for control action.' };
    }
    
    launch = await launchBrowser(run.agentBrowser ?? 'chromium', run.runHeadless ?? true);
    context = await createBrowserContext(launch, runDir);
    const page: Page = await context.newPage();

    await log('info', 'Agent control action started.', {
      action,
      url: targetUrl,
      browser: run.agentBrowser || 'chromium',
    });

    if (targetUrl) {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (action === 'reload') {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      }
    } else {
      await page.setContent(
        '<html><head><title>Agent preview</title></head><body><h1>No target URL</h1></body></html>'
      );
    }
    
    const safeLabel = stepLabel
      ? `step-${stepLabel}`
      : `control-${action}`;

    const createdSnapshot = await captureSnapshot(
      page,
      runId,
      runDir,
      safeLabel,
      log,
      activeStepId
    );

    // Re-implemented UI inventory and session capture to use shared functions if possible, 
    // or keep local if needed. Since I exported them, I can use them.
    await collectUiInventory(page, runId, safeLabel, log, activeStepId);
    await captureSessionContext(page, context, runId, safeLabel, log, activeStepId);

    const logCount = await prisma.agentBrowserLog.count({ where: { runId } });
    
    // We need to return snapshotId, captureSnapshot doesn't return ID directly but creates it. 
    // I should have made captureSnapshot return the object. 
    // For now I'll query it or just rely on latest.
    const freshSnapshot = await prisma.agentBrowserSnapshot.findFirst({
      where: { runId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ok: true,
      output: {
        url: createdSnapshot.url,
        snapshotId: freshSnapshot?.id ?? null,
        logCount,
      },
    };

  } catch (error) {
    const errorId = randomUUID();
    const message = error instanceof Error ? error.message : 'Control action failed.';
    
    try {
      await ErrorSystem.captureException(error, { 
        service: 'agent-control', 
        action: 'runAgentBrowserControl',
        runId,
        errorId,
        requestedAction: action
      });
    } catch (logError) {
      if (debugEnabled) {
        const { logger } = await import('@/shared/utils/logger');
        logger.error('[chatbot][agent][control] Failed (and logging failed)', logError, { runId, errorId, error });
      }
    }

    try {
      await prisma.agentBrowserLog.create({
        data: {
          runId,
          level: 'error',
          message,
          metadata: { errorId },
        },
      });
    } catch {
      // ignore logging failures
    }
    return { ok: false, error: message, errorId };
  } finally {
    if (context) {
      await context.close();
    }
    if (launch) {
      await launch.close();
    }
  }
}
