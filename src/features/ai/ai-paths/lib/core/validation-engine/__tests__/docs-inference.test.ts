import { describe, expect, it } from 'vitest';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

import { normalizeAiPathsValidationConfig } from '../defaults';
import {
  approveInferredAiPathsValidationRule,
  compileAiPathsValidationRulesFromDocsSnapshot,
} from '../docs-inference';
import { evaluateAiPathsValidationPreflight } from '../evaluator';

const buildTriggerNode = (eventValue: string): AiNode =>
  ({
    id: 'node-trigger',
    type: 'trigger',
    title: 'Trigger',
    description: 'Trigger node',
    position: { x: 100, y: 120 },
    data: {},
    inputs: ['context'],
    outputs: ['trigger', 'context'],
    createdAt: '2026-02-19T00:00:00.000Z',
    updatedAt: null,
    config: {
      trigger: {
        event: eventValue,
      },
    },
  }) as AiNode;

const emptyEdges: Edge[] = [];

describe('docs inference compiler', () => {
  it('compiles central-doc assertions into candidate rules with inference metadata', () => {
    const snapshot = {
      generatedAt: '2026-02-19T00:00:00.000Z',
      snapshotHash: 'snapshot-hash',
      sources: [
        {
          id: 'markdown:docs/ai-paths/node-validator-central-patterns.md',
          path: 'docs/ai-paths/node-validator-central-patterns.md',
          type: 'markdown_assertion',
          hash: 'source-hash',
          assertionCount: 1,
        },
      ],
      warnings: [],
      assertions: [
        {
          id: 'trigger.event.required',
          title: 'Trigger event required',
          module: 'trigger',
          severity: 'error',
          sourcePath: 'docs/ai-paths/node-validator-central-patterns.md',
          sourceType: 'markdown_assertion',
          sourceHash: 'source-hash',
          confidence: 0.9,
          sequenceHint: 20,
          appliesToNodeTypes: ['trigger'],
          tags: ['trigger', 'core'],
          deprecates: ['legacy.trigger.rule'],
          conditions: [
            {
              operator: 'non_empty',
              field: 'config.trigger.event',
            },
          ],
        },
      ],
    };

    const compiled = compileAiPathsValidationRulesFromDocsSnapshot(snapshot as any);
    expect(compiled).toHaveLength(1);
    expect(compiled[0]?.enabled).toBe(false);
    expect(compiled[0]?.inference?.sourceType).toBe('central_docs');
    expect(compiled[0]?.inference?.status).toBe('candidate');
    expect(compiled[0]?.inference?.['docsSnapshotHash']).toBe('snapshot-hash');
    expect(compiled[0]?.inference?.tags).toEqual(['trigger', 'core']);
    expect(compiled[0]?.inference?.deprecates).toEqual(['legacy.trigger.rule']);
    expect(compiled[0]?.conditions[0]?.id).toBeTruthy();
  });

  it('does not evaluate candidate central-doc rules until approved', () => {
    const snapshot = {
      generatedAt: '2026-02-19T00:00:00.000Z',
      snapshotHash: 'snapshot-hash',
      sources: [],
      warnings: [],
      assertions: [
        {
          id: 'trigger.event.required',
          title: 'Trigger event required',
          module: 'trigger',
          severity: 'error',
          sourcePath: 'docs/ai-paths/node-validator-central-patterns.md',
          sourceType: 'markdown_assertion',
          sourceHash: 'source-hash',
          confidence: 0.9,
          appliesToNodeTypes: ['trigger'],
          conditions: [
            {
              operator: 'non_empty',
              field: 'config.trigger.event',
            },
          ],
        },
      ],
    };
    const candidateRule = compileAiPathsValidationRulesFromDocsSnapshot(snapshot as any)[0];
    if (!candidateRule) {
      throw new Error('Expected compiled candidate rule.');
    }

    const candidateConfig = normalizeAiPathsValidationConfig({
      enabled: true,
      rules: [candidateRule],
    });
    const candidateReport = evaluateAiPathsValidationPreflight({
      nodes: [buildTriggerNode('')],
      edges: emptyEdges,
      config: candidateConfig,
    });
    expect(candidateReport.rulesEvaluated).toBe(0);
    expect(candidateReport.failedRules).toBe(0);
    expect(candidateReport.skippedRuleIds).toContain(candidateRule.id);

    const approvedRule = approveInferredAiPathsValidationRule(candidateRule, {
      approvedBy: 'test',
      approvedAt: '2026-02-19T00:00:00.000Z',
    });
    const approvedConfig = normalizeAiPathsValidationConfig({
      enabled: true,
      rules: [approvedRule],
    });
    const approvedReport = evaluateAiPathsValidationPreflight({
      nodes: [buildTriggerNode('')],
      edges: emptyEdges,
      config: approvedConfig,
    });
    expect(approvedReport.rulesEvaluated).toBe(1);
    expect(approvedReport.failedRules).toBe(1);
    expect(approvedReport.appliedRuleIds).toContain(approvedRule.id);
  });
});
