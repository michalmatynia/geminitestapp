import 'server-only';

import {
  DOC_ASSERTION_BLOCK_REGEX,
} from '../docs-registry-adapter.constants';
import {
  docAssertionSchema,
  type AiPathsDocAssertion,
  type AiPathsDocAssertionConditionInput,
} from '../docs-registry-adapter.types';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const extractAiPathsAssertionsFromMarkdown = (
  markdown: string,
  sourcePath: string,
  sourceHash: string
): { assertions: AiPathsDocAssertion[]; warnings: string[] } => {
  const assertions: AiPathsDocAssertion[] = [];
  const warnings: string[] = [];
  const matches = Array.from(markdown.matchAll(DOC_ASSERTION_BLOCK_REGEX));

  matches.forEach((match: RegExpMatchArray, index: number) => {
    const raw = (match[1] ?? '').trim();
    if (!raw) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      void ErrorSystem.captureException(error);
      warnings.push(`${sourcePath}: assertion block ${index + 1} is invalid JSON.`);
      return;
    }
    const result = docAssertionSchema.safeParse(parsed);
    if (!result.success) {
      warnings.push(`${sourcePath}: assertion block ${index + 1} failed schema validation.`);
      return;
    }
    const value = result.data;
    assertions.push({
      id: value.id,
      title: value.title,
      module: value.module,
      severity: value.severity ?? 'warning',
      ...(value.description ? { description: value.description } : {}),
      ...(value.recommendation ? { recommendation: value.recommendation } : {}),
      ...(value.appliesToNodeTypes?.length ? { appliesToNodeTypes: value.appliesToNodeTypes } : {}),
      ...(value.appliesToStages?.length ? { appliesToStages: value.appliesToStages } : {}),
      ...(value.sequenceHint !== undefined ? { sequenceHint: value.sequenceHint } : {}),
      ...(value.weight !== undefined ? { weight: value.weight } : {}),
      ...(value.forceProbabilityIfFailed !== undefined
        ? { forceProbabilityIfFailed: value.forceProbabilityIfFailed }
        : {}),
      ...(value.conditionMode ? { conditionMode: value.conditionMode } : {}),
      ...(value.docsBindings?.length ? { docsBindings: value.docsBindings } : {}),
      ...(value.version ? { version: value.version } : {}),
      ...(value.tags?.length ? { tags: value.tags } : {}),
      ...(value.deprecates?.length ? { deprecates: value.deprecates } : {}),
      sourcePath,
      sourceType: 'markdown_assertion',
      sourceHash,
      confidence: value.confidence ?? 0.9,
      conditions: value.conditions as AiPathsDocAssertionConditionInput[],
    });
  });

  return { assertions, warnings };
};
