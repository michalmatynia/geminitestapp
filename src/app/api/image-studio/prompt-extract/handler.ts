import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  supportsBrainJsonMode,
} from '@/shared/lib/ai-brain/server-runtime-client';
import {
  imageStudioPromptExtractModeSchema,
  type ImageStudioPromptExtractResponse,
  type ImageStudioPromptExtractSource,
} from '@/shared/contracts/image-studio';
import {
  IMAGE_STUDIO_SETTINGS_KEY,
  parsePersistedImageStudioSettings,
} from '@/features/ai/server';
import { auth } from '@/features/auth/server';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import { formatProgrammaticPrompt } from '@/shared/lib/prompt-engine';
import { extractParamsFromPrompt } from '@/shared/utils/prompt-params';
import { validateProgrammaticPrompt } from '@/shared/lib/prompt-engine';
import {
  parsePromptEngineSettings,
  PROMPT_ENGINE_SETTINGS_KEY,
} from '@/shared/lib/prompt-engine/settings';
import type {
  PromptValidationIssue,
  PromptValidationSettings,
} from '@/shared/contracts/prompt-engine';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError, badRequestError, internalError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const payloadSchema = z.object({
  prompt: z.string().trim().min(1),
  mode: imageStudioPromptExtractModeSchema.optional(),
  applyAutofix: z.boolean().optional(),
});

const responseSchema = z.object({
  params: z.record(z.string(), z.unknown()),
});

type ProgrammaticAttempt = {
  ok: boolean;
  params: Record<string, unknown> | null;
  source: ImageStudioPromptExtractSource | null;
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
  const validationBefore = validateProgrammaticPrompt(
    prompt,
    {
      enabled: true,
      rules: promptValidationSettings.rules,
      learnedRules: promptValidationSettings.learnedRules ?? [],
    },
    {
      scope: 'image_studio_extraction',
    }
  );

  const formatted = applyAutofix
    ? formatProgrammaticPrompt(
      prompt,
      promptValidationSettings,
      {
        scope: 'image_studio_extraction',
      },
      {
        precomputedIssuesBefore: validationBefore,
      }
    )
    : { prompt, changed: false };
  const candidatePrompt = formatted.prompt;
  const direct = extractParamsFromPrompt(candidatePrompt);

  if (direct.ok) {
    const validationAfter = validateProgrammaticPrompt(
      candidatePrompt,
      {
        enabled: true,
        rules: promptValidationSettings.rules,
        learnedRules: promptValidationSettings.learnedRules ?? [],
      },
      {
        scope: 'image_studio_extraction',
      }
    );
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

  const validationAfter = validateProgrammaticPrompt(
    candidatePrompt,
    {
      enabled: true,
      rules: promptValidationSettings.rules,
      learnedRules: promptValidationSettings.learnedRules ?? [],
    },
    {
      scope: 'image_studio_extraction',
    }
  );

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
  input: {
    model: string;
    temperature: number;
    maxOutputTokens: number;
    systemPrompt: string;
  }
): Promise<Record<string, unknown>> {
  const userPrompt = ['Prompt:', prompt].join('\n');

  const response = await runBrainChatCompletion({
    modelId: input.model,
    temperature: input.temperature,
    maxTokens: input.maxOutputTokens,
    jsonMode: supportsBrainJsonMode(input.model),
    messages: [
      { role: 'system', content: input.systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = response.text ?? '';
  const parsedJson = parseJsonCandidate(raw);
  if (!parsedJson) {
    throw internalError('Model did not return valid JSON.', { raw });
  }

  const validated = responseSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw internalError('Invalid prompt extraction response shape.', {
      issues: validated.error.flatten(),
    });
  }

  return validated.data.params;
}

function createResponse(payload: ImageStudioPromptExtractResponse): Response {
  return NextResponse.json(payload);
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated || session?.user?.permissions?.includes('ai_paths.manage');
  if (!hasAccess) throw authError('Unauthorized.');

  const parsed = await parseJsonBody(req, payloadSchema, {
    logPrefix: 'image-studio.prompt-extract.POST',
  });
  if (!parsed.ok) return parsed.response;

  const settingsRaw = (await getSettingValue(IMAGE_STUDIO_SETTINGS_KEY)) as
    | string
    | null
    | undefined;
  const settings = parsePersistedImageStudioSettings(settingsRaw);
  const modeRequested = parsed.data.mode ?? settings.promptExtraction.mode;
  const applyAutofix = parsed.data.applyAutofix ?? settings.promptExtraction.applyAutofix;

  const promptEngineSettingsRaw = (await getSettingValue(PROMPT_ENGINE_SETTINGS_KEY)) as
    | string
    | null
    | undefined;
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

  const systemPrompt = [
    'You extract a JSON params object from a prompt.',
    'If the prompt includes a params object (JS-like or JSON), extract it and normalize to strict JSON.',
    'If the prompt does not include a params object, infer a best-effort params object from explicit key/value settings only; otherwise return an empty object.',
    'Return ONLY JSON matching: { "params": { ... } } with no extra text.',
    'Preserve booleans, numbers, arrays, and nested objects when present.',
  ].join('\n');
  let model = '';
  let aiError: string | null;
  try {
    const config = await resolveBrainExecutionConfigForCapability('image_studio.prompt_extract', {
      defaultTemperature: settings.promptExtraction.gpt.temperature ?? 0,
      defaultMaxTokens: settings.promptExtraction.gpt.max_output_tokens ?? 1200,
      defaultSystemPrompt: systemPrompt,
      runtimeKind: 'validation',
    });
    model = config.modelId;
    const aiParams = await runAiExtraction(parsed.data.prompt, {
      model,
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
      systemPrompt: config.systemPrompt,
    });
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
