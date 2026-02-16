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
import {
  PROMPT_ENGINE_SETTINGS_KEY,
  parsePromptEngineSettings,
  parsePromptValidationRules,
  type PromptValidationRule,
} from '@/features/prompt-engine/public';
import { authError, configurationError, internalError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const payloadSchema = z.object({
  prompt: z.string().trim().min(1),
  limit: z.number().int().min(1).max(20).optional().default(8),
});

const ruleSignature = (rule: PromptValidationRule): string => {
  if (rule.kind === 'regex') {
    return `regex:${rule.pattern}/${rule.flags}`;
  }
  return `params:${rule.id}`;
};

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes('ai_paths.manage');
  if (!hasAccess) throw authError('Unauthorized.');

  const parsed = await parseJsonBody(req, payloadSchema, { logPrefix: 'image-studio.validation-patterns.learn.POST' });
  if (!parsed.ok) return parsed.response;

  const apiKey =
    (await getSettingValue(IMAGE_STUDIO_OPENAI_API_KEY_KEY))?.trim() ||
    (await getSettingValue('openai_api_key'))?.trim() ||
    process.env['OPENAI_API_KEY'] ||
    null;
  if (!apiKey) {
    throw configurationError('OpenAI API key is missing. Set it in Image Studio settings.');
  }

  const studioSettingsRaw = await getSettingValue(IMAGE_STUDIO_SETTINGS_KEY);
  const studioSettings = parseImageStudioSettings(studioSettingsRaw);
  const model =
    studioSettings.promptExtraction.gpt.model ||
    studioSettings.uiExtractor.model ||
    (await getSettingValue('openai_model'))?.trim() ||
    'gpt-4o-mini';
  const settingsRaw = await getSettingValue(PROMPT_ENGINE_SETTINGS_KEY);
  const settings = parsePromptEngineSettings(settingsRaw);
  const existingRules = [
    ...settings.promptValidation.rules,
    ...(settings.promptValidation.learnedRules ?? []),
  ];

  const existingSummary = existingRules.slice(0, 120).map((rule: PromptValidationRule) => {
    if (rule.kind === 'regex') {
      return `${rule.id} :: /${rule.pattern}/${rule.flags}`;
    }
    return `${rule.id} :: params_object`;
  }).join('\n');

  const client = new OpenAI({ apiKey });

  const systemPrompt = [
    'You generate validation rules for Image Studio prompts.',
    'Return ONLY valid JSON with shape: { "rules": PromptValidationRule[] }.',
    'Rules must match this schema:',
    '- kind: "regex" or "params_object"',
    '- id: string (unique, use prefix "learned.")',
    '- enabled: boolean',
    '- severity: "error" | "warning" | "info"',
    '- title: string',
    '- description: string | null',
    '- pattern: string (regex) and flags: string (regex only)',
    '- message: string',
    '- similar: array of { pattern, flags?, suggestion, comment? }',
    '- autofix: { enabled: boolean, operations: [ { kind: "replace", pattern, flags?, replacement, comment? } | { kind: "params_json", comment? } ] }',
    'Guidelines:',
    '- Derive rules from the provided prompt (valid and invalid patterns).',
    '- Favor regex rules; only use params_object if needed.',
    '- For invalid patterns, include similar patterns + autofix replacements.',
    '- Avoid duplicates or overlaps with existing rules.',
    `- Maximum ${parsed.data.limit} rules.`,
  ].join('\n');

  const userPrompt = [
    'Prompt to analyze:',
    parsed.data.prompt,
    '',
    'Existing rules (avoid duplicates):',
    existingSummary || '(none)',
  ].join('\n');

  const response = await client.chat.completions.create({
    model,
    temperature: studioSettings.promptExtraction.gpt.temperature ?? 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    throw internalError('Model did not return valid JSON.', { raw });
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw internalError('Invalid response shape.');
  }

  const rules = Array.isArray((json as { rules?: unknown }).rules)
    ? ((json as { rules: unknown[] }).rules as PromptValidationRule[])
    : [];

  const parseResult = parsePromptValidationRules(JSON.stringify(rules));
  if (!parseResult.ok) {
    throw internalError(parseResult.error || 'Failed to parse prompt validation rules.');
  }

  const existingIds = new Set(existingRules.map((rule: PromptValidationRule) => rule.id));
  const existingSigs = new Set(existingRules.map((rule: PromptValidationRule) => ruleSignature(rule)));

  const filtered = parseResult.rules
    .filter((rule: PromptValidationRule) => !existingIds.has(rule.id))
    .filter((rule: PromptValidationRule) => !existingSigs.has(ruleSignature(rule)))
    .slice(0, parsed.data.limit);

  return NextResponse.json({ rules: filtered });
}
