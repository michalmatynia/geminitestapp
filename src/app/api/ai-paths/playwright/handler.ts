import { type NextRequest, NextResponse } from 'next/server';

import { resolveAiPathsContextRegistryEnvelope } from '@/features/ai/ai-paths/context-registry/server';
import {
  enforceAiPathsActionRateLimit,
  requireAiPathsAccessOrInternal,
} from '@/features/ai/ai-paths/server/access';
import {
  createAiPathNodePlaywrightInstance,
  enqueuePlaywrightEngineRun,
  type PlaywrightEngineRunRecord,
} from '@/features/playwright/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { aiPathsPlaywrightEnqueueRequestSchema } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { type z } from 'zod';

type AiPathsPlaywrightEnqueueRequest = z.infer<typeof aiPathsPlaywrightEnqueueRequestSchema>;

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
  if (capture === undefined) return undefined;
  const normalized: CapturePayload = {};
  if (typeof capture.screenshot === 'boolean') normalized.screenshot = capture.screenshot;
  if (typeof capture.html === 'boolean') normalized.html = capture.html;
  if (typeof capture.video === 'boolean') normalized.video = capture.video;
  if (typeof capture.trace === 'boolean') normalized.trace = capture.trace;
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

interface EngineRequest {
  script: string;
  input?: unknown;
  startUrl?: string;
  timeoutMs?: number;
  browserEngine?: string;
  personaId?: string;
  settingsOverrides?: Record<string, unknown>;
  launchOptions?: Record<string, unknown>;
  contextOptions?: Record<string, unknown>;
  contextRegistry?: unknown;
  capture?: CapturePayload;
}

const toPublicRun = (
  run: PlaywrightEngineRunRecord
): Omit<PlaywrightEngineRunRecord, 'ownerUserId'> => {
  const { ownerUserId, ...rest } = run;
  void ownerUserId;
  return rest;
};

const addEngineOptions = (
  request: EngineRequest,
  payload: AiPathsPlaywrightEnqueueRequest
): EngineRequest => ({
  ...request,
  ...(payload.timeoutMs !== undefined ? { timeoutMs: payload.timeoutMs } : {}),
  ...(payload.browserEngine !== undefined ? { browserEngine: payload.browserEngine } : {}),
  ...(payload.settingsOverrides !== undefined ? { settingsOverrides: payload.settingsOverrides } : {}),
  ...(payload.launchOptions !== undefined ? { launchOptions: payload.launchOptions } : {}),
  ...(payload.contextOptions !== undefined ? { contextOptions: payload.contextOptions } : {}),
});

/* eslint-disable complexity */
const resolveBuildEngineRequest = (
  payload: AiPathsPlaywrightEnqueueRequest,
  contextRegistry: unknown,
  capture: CapturePayload | undefined
): EngineRequest => {
  const request: EngineRequest = { script: payload.script };

  if (payload.input !== undefined) request.input = payload.input;

  const startUrl = payload.startUrl?.trim();
  if (typeof startUrl === 'string' && startUrl.length > 0) request.startUrl = startUrl;

  const enrichedRequest = addEngineOptions(request, payload);

  const personaId = payload.personaId?.trim();
  if (typeof personaId === 'string' && personaId.length > 0) enrichedRequest.personaId = personaId;

  if (contextRegistry !== undefined && contextRegistry !== null) {
    enrichedRequest.contextRegistry = contextRegistry;
  }
  if (capture !== undefined) enrichedRequest.capture = capture;

  return enrichedRequest;
};
/* eslint-enable complexity */

export async function postPlaywrightHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { access, isInternal } = await requireAiPathsAccessOrInternal(req);
  if (!isInternal) {
    await enforceAiPathsActionRateLimit(access, 'playwright-enqueue');
  }

  const parsed = await parseJsonBody(req, aiPathsPlaywrightEnqueueRequestSchema, {
    logPrefix: 'ai-paths.playwright.enqueue',
  });
  if (!parsed.ok) return parsed.response;

  const payload = parsed.data;
  const capture = normalizeCaptureConfig(payload.capture);
  const contextRegistry = await resolveAiPathsContextRegistryEnvelope(payload.contextRegistry);
  
  const run = await enqueuePlaywrightEngineRun({
    request: resolveBuildEngineRequest(payload, contextRegistry, capture),
    waitForResult: payload.waitForResult ?? true,
    ownerUserId: isInternal ? 'system' : access.userId,
    instance: createAiPathNodePlaywrightInstance(),
  });

  return NextResponse.json({ run: toPublicRun(run) });
}
