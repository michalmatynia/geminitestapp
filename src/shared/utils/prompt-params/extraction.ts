import { ExtractParamsResult } from '@/shared/contracts/prompt-engine';

import { normalizeParamsObject } from './normalization';
import { findMatchingBrace, stripJsComments, removeTrailingCommas } from './scanner';
import { isObjectRecord } from '../object-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

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

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (!isObjectRecord(parsed)) {
      return { ok: false, error: 'Parsed params must be a JSON object.' };
    }
    return {
      ok: true,
      params: parsed,
      objectStart,
      objectEnd: objectEndInclusive + 1,
      rawObjectText,
    };
  } catch (error) {
    logClientCatch(error, {
      source: 'prompt-params.extraction',
      action: 'extractParamsFromPrompt.parseRawJson',
      promptLength: prompt.length,
    });
    try {
      const normalized = normalizeParamsObject(withoutComments);
      const normalizedJson = removeTrailingCommas(normalized);
      const parsed = JSON.parse(normalizedJson) as unknown;
      if (!isObjectRecord(parsed)) {
        return { ok: false, error: 'Parsed params must be a JSON object.' };
      }
      return {
        ok: true,
        params: parsed,
        objectStart,
        objectEnd: objectEndInclusive + 1,
        rawObjectText,
      };
    } catch (error) {
      logClientCatch(error, {
        source: 'prompt-params.extraction',
        action: 'extractParamsFromPrompt.parseNormalizedJson',
        promptLength: prompt.length,
      });
      return {
        ok: false,
        error: 'Failed to parse params (expected JSON-like object with quoted keys/strings).',
      };
    }
  }
}
