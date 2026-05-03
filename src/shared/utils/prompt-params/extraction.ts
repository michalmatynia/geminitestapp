import { type ExtractParamsResult } from '@/shared/contracts/prompt-engine';

import { normalizeParamsObject } from './normalization';
import { findMatchingBrace, stripJsComments, removeTrailingCommas } from './scanner-utils';
import { isObjectRecord } from '../object-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

const parseJsonParams = (jsonText: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    return isObjectRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

type ExtractionContext = {
  prompt: string;
  objectStart: number;
  objectEndInclusive: number;
  rawObjectText: string;
  withoutComments: string;
};

const attemptNormalizedParse = (
  ctx: ExtractionContext,
  firstError: unknown
): ExtractParamsResult => {
  logClientCatch(firstError, {
    source: 'prompt-params.extraction',
    action: 'extractParamsFromPrompt.parseRawJson',
    promptLength: ctx.prompt.length,
  });

  try {
    const normalized = normalizeParamsObject(ctx.withoutComments);
    const normalizedJson = removeTrailingCommas(normalized);
    const parsed = parseJsonParams(normalizedJson);

    if (parsed !== null) {
      return {
        ok: true,
        params: parsed,
        objectStart: ctx.objectStart,
        objectEnd: ctx.objectEndInclusive + 1,
        rawObjectText: ctx.rawObjectText,
      };
    }
    return {
      ok: false,
      error: 'Failed to parse params (expected JSON-like object with quoted keys/strings).',
    };
  } catch (secondError) {
    logClientCatch(secondError, {
      source: 'prompt-params.extraction',
      action: 'extractParamsFromPrompt.parseNormalizedJson',
      promptLength: ctx.prompt.length,
    });
    return {
      ok: false,
      error: 'Failed to parse params (expected JSON-like object with quoted keys/strings).',
    };
  }
};

export function extractParamsFromPrompt(prompt: string): ExtractParamsResult {
  const match = /\bparams\b\s*[:=]\s*\{/i.exec(prompt);
  if (!match) {
    return {
      ok: false,
      error: 'Could not find `params = { ... }` (or `params: { ... }`) in the prompt.',
    };
  }

  const objectStart = prompt.indexOf('{', match.index);
  if (objectStart === -1) return { ok: false, error: 'Could not locate params object start.' };

  const objectEndInclusive = findMatchingBrace(prompt, objectStart);
  if (objectEndInclusive === -1) {
    return { ok: false, error: 'Could not find the end of the params object (unbalanced braces).' };
  }

  const rawObjectText = prompt.slice(objectStart, objectEndInclusive + 1);
  const withoutComments = stripJsComments(rawObjectText);
  const jsonText = removeTrailingCommas(withoutComments);

  const ctx: ExtractionContext = {
    prompt,
    objectStart,
    objectEndInclusive,
    rawObjectText,
    withoutComments,
  };

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (isObjectRecord(parsed)) {
      return {
        ok: true,
        params: parsed,
        objectStart,
        objectEnd: objectEndInclusive + 1,
        rawObjectText,
      };
    }
    return attemptNormalizedParse(ctx, new Error('Parsed params must be a JSON object.'));
  } catch (error) {
    return attemptNormalizedParse(ctx, error);
  }
}
