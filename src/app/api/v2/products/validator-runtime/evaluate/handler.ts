import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';
import { resolveProductEditorContextRegistryEnvelope } from '@/features/products/context-registry/server';
import { buildProductEditorContextRegistrySystemPrompt } from '@/features/products/context-registry/system-prompt';
import { parseRuntimeConfigForEvaluation } from '@/features/products/server';
import { isPatternLocaleMatch } from '@/features/products/validation-engine/core';
import { contextRegistryConsumerEnvelopeSchema } from '@/shared/contracts/ai-context-registry';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { listValidationPatternsCached } from '@/shared/lib/products/services/validation-pattern-runtime-cache';
import {
  isPatternEnabledForValidationScope,
  normalizeProductValidationInstanceScope,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import {
  assertRuntimePayloadBounds,
  buildRuntimeFieldEntries,
  evaluatePatternsForField,
  type RuntimeFieldEntry,
  type RuntimeFieldIssue,
  type RuntimeSettingsCache,
} from './handler.helpers';

export const evaluateRuntimeSchema = z.object({
  values: z.record(z.string(), z.unknown()),
  latestProductValues: z.record(z.string(), z.unknown()).nullable().optional(),
  patternIds: z.array(z.string().trim().min(1)).optional(),
  validationScope: z.enum(['draft_template', 'product_create', 'product_edit']).optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.nullable().optional(),
});

export async function postHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as z.infer<typeof evaluateRuntimeSchema>;
  assertRuntimePayloadBounds(body.values, body.patternIds);
  const contextRegistry = await resolveProductEditorContextRegistryEnvelope(
    body.contextRegistry ?? null,
    contextRegistryEngine.resolveRefs.bind(contextRegistryEngine)
  );
  const values = body.values;
  const latestProductValues = body.latestProductValues ?? null;
  const validationScope = normalizeProductValidationInstanceScope(
    body.validationScope ?? 'product_create'
  );
  const allPatterns = await listValidationPatternsCached();
  const requestedPatternIds =
    body.patternIds !== undefined && body.patternIds.length > 0 ? new Set(body.patternIds) : null;
  const runtimePatterns = allPatterns.filter((pattern: ProductValidationPattern) => {
    if (pattern.enabled === false) return false;
    if (!pattern.runtimeEnabled || pattern.runtimeType === 'none') return false;
    if (requestedPatternIds !== null && !requestedPatternIds.has(pattern.id)) return false;
    if (!isPatternEnabledForValidationScope(pattern.appliesToScopes, validationScope)) {
      return false;
    }
    return true;
  });

  const runtimeFieldEntries = buildRuntimeFieldEntries(values);
  const fieldEntriesByTarget = new Map<RuntimeFieldEntry['target'], RuntimeFieldEntry[]>();
  for (const entry of runtimeFieldEntries) {
    const current = fieldEntriesByTarget.get(entry.target) ?? [];
    current.push(entry);
    fieldEntriesByTarget.set(entry.target, current);
  }

  const runtimeSettingsCache: RuntimeSettingsCache = {
    contextRegistryPrompt: buildProductEditorContextRegistrySystemPrompt(
      contextRegistry?.resolved ?? null
    ),
  };

  const issues: Record<string, RuntimeFieldIssue[]> = {};
  for (const pattern of runtimePatterns) {
    const runtimeConfig = parseRuntimeConfigForEvaluation({
      runtimeType: pattern.runtimeType,
      runtimeConfig: pattern.runtimeConfig,
    });
    if (runtimeConfig === null) continue;

    const candidateEntries = (fieldEntriesByTarget.get(pattern.target) ?? []).filter(
      (entry: RuntimeFieldEntry) => isPatternLocaleMatch(pattern.locale, entry.locale)
    );
    for (const entry of candidateEntries) {
      const issue = await evaluatePatternsForField({
        pattern,
        entry,
        values,
        latestProductValues,
        validationScope,
        runtimeConfig,
        runtimeSettingsCache,
      });

      if (issue !== null) {
        issues[entry.fieldName] ??= [];
        issues[entry.fieldName].push(issue);
      }
    }
  }

  return NextResponse.json({
    issues,
    evaluatedPatternCount: runtimePatterns.length,
  });
}
