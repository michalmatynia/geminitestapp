import { NextRequest, NextResponse } from 'next/server';

import { resolveAiPathsContextRegistryEnvelope } from '@/features/ai/ai-paths/context-registry/server';
import {
  enforceAiPathsActionRateLimit,
  requireAiPathsAccessOrInternal,
} from '@/features/ai/ai-paths/server/access';
import {
  enqueuePlaywrightNodeRun,
  type PlaywrightNodeRunRecord,
} from '@/features/ai/ai-paths/services/playwright-node-runner';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { aiPathsPlaywrightEnqueueRequestSchema } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

type CapturePayload = {
  screenshot?: boolean;
  html?: boolean;
  video?: boolean;
  trace?: boolean;
};

const normalizeCaptureConfig = (
  capture:
    | {
        screenshot?: boolean;
        html?: boolean;
        video?: boolean;
        trace?: boolean;
      }
    | undefined
): CapturePayload | undefined => {
  if (!capture) return undefined;
  const normalized: CapturePayload = {};
  if (typeof capture.screenshot === 'boolean') normalized.screenshot = capture.screenshot;
  if (typeof capture.html === 'boolean') normalized.html = capture.html;
  if (typeof capture.video === 'boolean') normalized.video = capture.video;
  if (typeof capture.trace === 'boolean') normalized.trace = capture.trace;
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const toPublicRun = (
  run: PlaywrightNodeRunRecord
): Omit<PlaywrightNodeRunRecord, 'ownerUserId'> => {
  const { ownerUserId: _ownerUserId, ...rest } = run;
  return rest;
};

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { access, isInternal } = await requireAiPathsAccessOrInternal(req);
  if (!isInternal) {
    await enforceAiPathsActionRateLimit(access, 'playwright-enqueue');
  }

  const parsed = await parseJsonBody(req, aiPathsPlaywrightEnqueueRequestSchema, {
    logPrefix: 'ai-paths.playwright.enqueue',
  });
  if (!parsed.ok) return parsed.response;

  const payload = parsed.data;
  const startUrl = payload.startUrl?.trim();
  const personaId = payload.personaId?.trim();
  const capture = normalizeCaptureConfig(payload.capture);
  const contextRegistry = await resolveAiPathsContextRegistryEnvelope(payload.contextRegistry);
  const run = await enqueuePlaywrightNodeRun({
    request: {
      script: payload.script,
      ...(payload.input ? { input: payload.input } : {}),
      ...(startUrl ? { startUrl } : {}),
      ...(payload.timeoutMs !== undefined ? { timeoutMs: payload.timeoutMs } : {}),
      ...(payload.browserEngine ? { browserEngine: payload.browserEngine } : {}),
      ...(personaId ? { personaId } : {}),
      ...(payload.settingsOverrides ? { settingsOverrides: payload.settingsOverrides } : {}),
      ...(payload.launchOptions ? { launchOptions: payload.launchOptions } : {}),
      ...(payload.contextOptions ? { contextOptions: payload.contextOptions } : {}),
      ...(contextRegistry ? { contextRegistry } : {}),
      ...(capture ? { capture } : {}),
    },
    waitForResult: payload.waitForResult ?? true,
    ownerUserId: isInternal ? 'system' : access.userId,
  });

  return NextResponse.json({ run: toPublicRun(run) });
}
