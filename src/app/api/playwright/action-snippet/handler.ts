import { type NextRequest, NextResponse } from 'next/server';

import {
  type PlaywrightActionSequenceSnippetEntry,
  type PlaywrightActionSequenceSnippetRequest,
  type PlaywrightActionSequenceSnippetResponse,
  type PlaywrightStep,
} from '@/shared/contracts/playwright-steps';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { STEP_REGISTRY } from '@/shared/lib/browser-execution/step-registry';
import {
  createPlaywrightStepCodeSnapshot,
  getPlaywrightStepInputBindings,
} from '@/shared/lib/playwright/step-code-preview';
import {
  createRuntimeStepSemanticSnippet,
  getRuntimeStepSelectorKeys,
} from '@/shared/lib/playwright/product-scan-runtime-step-snippets';

const previewStep = (
  step: PlaywrightStep,
  labelPrefix: string
): PlaywrightActionSequenceSnippetEntry => {
  const inputBindings = getPlaywrightStepInputBindings(step);
  const snapshot = createPlaywrightStepCodeSnapshot({ ...step, inputBindings });

  return {
    id: step.id,
    label: `${labelPrefix}${step.name}`,
    source: labelPrefix ? 'step_set_step' : 'direct_step',
    semanticSnippet: snapshot.semanticSnippet,
    resolvedSnippet: snapshot.resolvedSnippet,
    moduleKey: snapshot.moduleKey,
    registryConnected: snapshot.selectorBindings.some((binding) => binding.connected),
    unresolvedBindings: snapshot.unresolvedBindings,
  };
};

const previewRuntimeStep = (
  blockId: string,
  runtimeStepId: string,
  label: string
): PlaywrightActionSequenceSnippetEntry => {
  const semanticSnippet =
    createRuntimeStepSemanticSnippet(runtimeStepId) ??
    `await runtimeSteps[${JSON.stringify(runtimeStepId)}](context);`;
  const selectorKeys = getRuntimeStepSelectorKeys(runtimeStepId);

  return {
    id: blockId,
    label,
    source: 'runtime_step',
    semanticSnippet,
    resolvedSnippet: semanticSnippet,
    moduleKey: `runtime.${runtimeStepId}`,
    registryConnected: selectorKeys.length > 0,
    unresolvedBindings: [],
  };
};

const commentEntry = (
  id: string,
  label: string,
  source: PlaywrightActionSequenceSnippetEntry['source'],
  comment: string
): PlaywrightActionSequenceSnippetEntry => ({
  id,
  label,
  source,
  semanticSnippet: comment,
  resolvedSnippet: comment,
  moduleKey: null,
  registryConnected: false,
  unresolvedBindings: [],
});

const resolveRuntimeStepLabel = (
  runtimeStepId: string,
  labels: Record<string, string> | undefined
): string | null => {
  const provided = labels?.[runtimeStepId]?.trim();
  if (provided) return provided;
  if (runtimeStepId in STEP_REGISTRY) {
    return STEP_REGISTRY[runtimeStepId as keyof typeof STEP_REGISTRY].label;
  }
  return null;
};

const buildEntries = (
  body: PlaywrightActionSequenceSnippetRequest
): PlaywrightActionSequenceSnippetEntry[] => {
  const entries: PlaywrightActionSequenceSnippetEntry[] = [];

  body.blocks.forEach((block, blockIndex) => {
    const blockLabel = block.label ?? `Block ${blockIndex + 1}`;

    if (!block.enabled) {
      entries.push(
        commentEntry(
          block.id,
          blockLabel,
          'disabled',
          `// Disabled block ${blockIndex + 1}: ${blockLabel}`
        )
      );
      return;
    }

    if (block.kind === 'step') {
      const step = body.steps.find((candidate) => candidate.id === block.refId);
      entries.push(
        step
          ? previewStep(step, '')
          : commentEntry(block.id, blockLabel, 'missing', `// Missing direct step: ${block.refId}`)
      );
      return;
    }

    if (block.kind === 'step_set') {
      const stepSet = body.stepSets.find((candidate) => candidate.id === block.refId);
      if (!stepSet) {
        entries.push(
          commentEntry(block.id, blockLabel, 'missing', `// Missing step set: ${block.refId}`)
        );
        return;
      }

      stepSet.stepIds.forEach((stepId, stepIndex) => {
        const step = body.steps.find((candidate) => candidate.id === stepId);
        entries.push(
          step
            ? previewStep(step, `${stepSet.name} / `)
            : commentEntry(
                `${block.id}:${stepId}:${stepIndex}`,
                `${stepSet.name} / missing step`,
                'missing',
                `// Missing step ${stepIndex + 1} in ${stepSet.name}: ${stepId}`
              )
        );
      });
      return;
    }

    if (block.kind === 'runtime_step') {
      const label = resolveRuntimeStepLabel(block.refId, body.runtimeStepLabels);
      entries.push(
        label
          ? previewRuntimeStep(block.id, block.refId, label)
          : commentEntry(block.id, blockLabel, 'missing', `// Missing runtime step: ${block.refId}`)
      );
    }
  });

  return entries;
};

export async function postHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as PlaywrightActionSequenceSnippetRequest;
  const entries = buildEntries(body);
  const generatedAt = new Date().toISOString();
  const snapshot = {
    language: 'playwright-ts' as const,
    semanticSnippet: entries
      .map((entry, index) => `// ${index + 1}. ${entry.label}\n${entry.semanticSnippet}`)
      .join('\n\n'),
    resolvedSnippet: entries
      .map((entry, index) => `// ${index + 1}. ${entry.label}\n${entry.resolvedSnippet}`)
      .join('\n\n'),
    unresolvedBindings: Array.from(
      new Set(
        entries.flatMap((entry) =>
          entry.unresolvedBindings.map((binding) => `${entry.label}: ${binding}`)
        )
      )
    ),
    generatedAt,
  };
  const warnings: PlaywrightActionSequenceSnippetResponse['warnings'] = [
    ...entries
      .filter((entry) => entry.source === 'missing')
      .map((entry) => ({
        id: entry.id,
        label: entry.label,
        message: 'Referenced action block target is missing.',
      })),
    ...snapshot.unresolvedBindings.map((binding, index) => ({
      id: `unresolved:${index}`,
      label: binding,
      message: 'Action sequence contains an unresolved step binding.',
    })),
  ];

  return NextResponse.json({
    actionName: body.actionName?.trim() || 'Action sequence',
    entries,
    snapshot,
    warnings,
  } satisfies PlaywrightActionSequenceSnippetResponse);
}
