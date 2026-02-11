export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import {
  IMAGE_STUDIO_OPENAI_API_KEY_KEY,
  IMAGE_STUDIO_SETTINGS_KEY,
  parseImageStudioSettings,
} from '@/features/ai/image-studio/utils/studio-settings';
import { auth } from '@/features/auth/server';
import { getSettingValue } from '@/features/products/services/aiDescriptionService';
import { formatProgrammaticPrompt } from '@/features/prompt-engine/prompt-formatter';
import { extractParamsFromPrompt } from '@/features/prompt-engine/prompt-params';
import {
  type PromptValidationIssue,
  validateProgrammaticPrompt,
} from '@/features/prompt-engine/prompt-validator';
import {
  type PromptValidationSettings,
  parsePromptEngineSettings,
  PROMPT_ENGINE_SETTINGS_KEY,
} from '@/features/prompt-engine/settings';
import { authError, badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const extractionModeSchema = z.enum(['programmatic', 'gpt', 'hybrid']);

const payloadSchema = z.object({
  prompt: z.string().trim().min(1),
  mode: extractionModeSchema.optional(),
  applyAutofix: z.boolean().optional(),
});

const responseSchema = z.object({
  params: z.record(z.string(), z.any()),
});

type PromptExtractSource = 'programmatic' | 'programmatic_autofix' | 'gpt';

type PromptExtractResponse = {
  params: Record<string, unknown>;
  source: PromptExtractSource;
  modeRequested: z.infer<typeof extractionModeSchema>;
  fallbackUsed: boolean;
  formattedPrompt: string | null;
  validation: {
    before: PromptValidationIssue[];
    after: PromptValidationIssue[];
  };
  diagnostics: {
    programmaticError: string | null;
    aiError: string | null;
    model: string | null;
    autofixApplied: boolean;
  };
};

type ProgrammaticAttempt = {
  ok: boolean;
  params: Record<string, unknown> | null;
  source: 'programmatic' | 'programmatic_autofix' | null;
  error: string | null;
  formattedPrompt: string | null;
  autofixApplied: boolean;
  validationBefore: PromptValidationIssue[];
  validationAfter: PromptValidationIssue[];
};

function parseJsonCandidate(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidates: string[] = [trimmed];
  const fenceMatch = trimmed.match(/^```(?:json|javascript|js)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch?.[1]) {
    candidates.push(fenceMatch[1].trim());
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1).trim());
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      continue;
    }
  }
  return null;
}

function runProgrammaticAttempt(
  prompt: string,
  applyAutofix: boolean,
  promptValidationSettings: PromptValidationSettings
): ProgrammaticAttempt {
  const validationBefore = validateProgrammaticPrompt(prompt, {
    enabled: true,
    rules: promptValidationSettings.rules,
    learnedRules: promptValidationSettings.learnedRules ?? [],
  });

  const formatted = applyAutofix
    ? formatProgrammaticPrompt(prompt, promptValidationSettings)
    : { prompt, changed: false };
  const candidatePrompt = formatted.prompt;
  const direct = extractParamsFromPrompt(candidatePrompt);

  if (direct.ok) {
    const validationAfter = validateProgrammaticPrompt(candidatePrompt, {
      enabled: true,
      rules: promptValidationSettings.rules,
      learnedRules: promptValidationSettings.learnedRules ?? [],
    });
    return {
      ok: true,
      params: direct.params,
      source: formatted.changed ? 'programmatic_autofix' : 'programmatic',
      error: null,
      formattedPrompt: formatted.changed ? candidatePrompt : null,
      autofixApplied: Boolean(formatted.changed),
      validationBefore,
      validationAfter,
    };
  }

  const validationAfter = validateProgrammaticPrompt(candidatePrompt, {
    enabled: true,
    rules: promptValidationSettings.rules,
    learnedRules: promptValidationSettings.learnedRules ?? [],
  });

  return {
    ok: false,
    params: null,
    source: null,
    error: direct.error,
    formattedPrompt: formatted.changed ? candidatePrompt : null,
    autofixApplied: Boolean(formatted.changed),
    validationBefore,
    validationAfter,
  };
}

async function runAiExtraction(
  prompt: string,
  model: string,
  temperature: number,
  topP: number | undefined,
  maxOutputTokens: number,
  apiKey: string
): Promise<Record<string, unknown>> {
  const client = new OpenAI({ apiKey });

  const systemPrompt = [
    'You extract a JSON params object from a prompt.',
    'If the prompt includes a params object (JS-like or JSON), extract it and normalize to strict JSON.',
    'If the prompt does not include a params object, infer a best-effort params object from explicit key/value settings only; otherwise return an empty object.',
    'Return ONLY JSON matching: { "params": { ... } } with no extra text.',
    'Preserve booleans, numbers, arrays, and nested objects when present.',
  ].join('\n');

  const userPrompt = ['Prompt:', prompt].join('\n');

  const response = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: maxOutputTokens,
    ...(topP !== undefined ? { top_p: topP } : {}),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';
  const parsedJson = parseJsonCandidate(raw);
  if (!parsedJson) {
    throw new Error('Model did not return valid JSON.');
  }

  const validated = responseSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error('Invalid prompt extraction response shape.');
  }

  return validated.data.params;
}

function createResponse(payload: PromptExtractResponse): Response {
  return NextResponse.json(payload);
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes('ai_paths.manage');
  if (!hasAccess) throw authError('Unauthorized.');

  const parsed = await parseJsonBody(req, payloadSchema, { logPrefix: 'image-studio.prompt-extract.POST' });
  if (!parsed.ok) return parsed.response;

  const settingsRaw = await getSettingValue(IMAGE_STUDIO_SETTINGS_KEY);
  const settings = parseImageStudioSettings(settingsRaw);
  const modeRequested = parsed.data.mode ?? settings.promptExtraction.mode;
  const applyAutofix = parsed.data.applyAutofix ?? settings.promptExtraction.applyAutofix;
  const promptEngineSettingsRaw = await getSettingValue(PROMPT_ENGINE_SETTINGS_KEY);
  const promptEngineSettings = parsePromptEngineSettings(promptEngineSettingsRaw);
  const programmatic = runProgrammaticAttempt(
    parsed.data.prompt,
    applyAutofix,
    promptEngineSettings.promptValidation
  );

  if (modeRequested === 'programmatic') {
    if (!programmatic.ok || !programmatic.params || !programmatic.source) {
      throw badRequestError(programmatic.error ?? 'Programmatic extraction failed.');
    }
    return createResponse({
      params: programmatic.params,
      source: programmatic.source,
      modeRequested,
      fallbackUsed: false,
      formattedPrompt: programmatic.formattedPrompt,
      diagnostics: {
        programmaticError: null,
        aiError: null,
        model: null,
        autofixApplied: programmatic.autofixApplied,
      },
      validation: {
        before: programmatic.validationBefore,
        after: programmatic.validationAfter,
      },
    });
  }

  if (modeRequested === 'hybrid' && programmatic.ok && programmatic.params && programmatic.source) {
    return createResponse({
      params: programmatic.params,
      source: programmatic.source,
      modeRequested,
      fallbackUsed: false,
      formattedPrompt: programmatic.formattedPrompt,
      diagnostics: {
        programmaticError: null,
        aiError: null,
        model: null,
        autofixApplied: programmatic.autofixApplied,
      },
      validation: {
        before: programmatic.validationBefore,
        after: programmatic.validationAfter,
      },
    });
  }

  const model = (
    settings.promptExtraction.gpt.model ||
    settings.targetAi.openai.model ||
    (await getSettingValue('openai_model')) ||
    'gpt-4o-mini'
  ).trim();
  let temperature = settings.promptExtraction.gpt.temperature ?? 0;
  let top_p: number | undefined;
  let max_output_tokens = settings.promptExtraction.gpt.max_output_tokens ?? 1200;
  let aiError: string | null = null;
  if (!model) {
    aiError = 'Prompt extraction model is missing. Set it in Image Studio settings.';
  } else {
    top_p = settings.promptExtraction.gpt.top_p ?? undefined;
    const apiKey =
      (await getSettingValue(IMAGE_STUDIO_OPENAI_API_KEY_KEY))?.trim() ||
      (await getSettingValue('openai_api_key'))?.trim() ||
      process.env['OPENAI_API_KEY'] ||
      null;
    if (apiKey) {
      try {
        const aiParams = await runAiExtraction(
          parsed.data.prompt,
          model,
          temperature,
          top_p,
          max_output_tokens,
          apiKey
        );
        return createResponse({
          params: aiParams,
          source: 'gpt',
          modeRequested,
          fallbackUsed: false,
          formattedPrompt: programmatic.formattedPrompt,
          diagnostics: {
            programmaticError: programmatic.ok ? null : programmatic.error,
            aiError: null,
            model,
            autofixApplied: programmatic.autofixApplied,
          },
          validation: {
            before: programmatic.validationBefore,
            after: programmatic.validationAfter,
          },
        });
      } catch (error) {
        aiError = error instanceof Error ? error.message : 'AI extraction failed.';
      }
    } else {
      aiError = 'OpenAI API key is missing. Set it in Image Studio settings.';
    }
  }

  if (programmatic.ok && programmatic.params && programmatic.source) {
    return createResponse({
      params: programmatic.params,
      source: programmatic.source,
      modeRequested,
      fallbackUsed: true,
      formattedPrompt: programmatic.formattedPrompt,
      diagnostics: {
        programmaticError: null,
        aiError,
        model: model && model.length > 0 ? model : null,
        autofixApplied: programmatic.autofixApplied,
      },
      validation: {
        before: programmatic.validationBefore,
        after: programmatic.validationAfter,
      },
    });
  }

  throw badRequestError(
    `Prompt extraction failed. Programmatic: ${programmatic.error ?? 'unknown error'}. AI: ${aiError ?? 'unknown error'}.`
  );
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'image-studio.prompt-extract.POST' }
);
