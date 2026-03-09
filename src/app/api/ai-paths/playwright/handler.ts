import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveAiPathsContextRegistryEnvelope } from '@/features/ai/ai-paths/context-registry/server';
import {
  enforceAiPathsActionRateLimit,
  requireAiPathsAccessOrInternal,
} from '@/features/ai/ai-paths/server';
import {
  enqueuePlaywrightNodeRun,
  type PlaywrightNodeRunRecord,
} from '@/features/ai/ai-paths/services/playwright-node-runner';
import { parseJsonBody } from '@/features/products/server';
import { contextRegistryConsumerEnvelopeSchema } from '@/shared/contracts/ai-context-registry';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const captureSchema = z.object({
  screenshot: z.boolean().optional(),
  html: z.boolean().optional(),
  video: z.boolean().optional(),
  trace: z.boolean().optional(),
});

const enqueueSchema = z.object({
  script: z.string().trim().min(1),
  input: z.record(z.string(), z.unknown()).optional(),
  startUrl: z.string().trim().optional(),
  timeoutMs: z
    .number()
    .int()
    .min(1000)
    .max(30 * 60 * 1000)
    .optional(),
  waitForResult: z.boolean().optional(),
  browserEngine: z.enum(['chromium', 'firefox', 'webkit']).optional(),
  personaId: z.string().trim().optional(),
  settingsOverrides: z.record(z.string(), z.unknown()).optional(),
  launchOptions: z.record(z.string(), z.unknown()).optional(),
  contextOptions: z.record(z.string(), z.unknown()).optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
  capture: captureSchema.optional(),
});

type CapturePayload = {
  screenshot?: boolean;
  html?: boolean;
  video?: boolean;
  trace?: boolean;
};

const normalizeCaptureConfig = (
  capture: z.infer<typeof captureSchema> | undefined
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

  const parsed = await parseJsonBody(req, enqueueSchema, {
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
