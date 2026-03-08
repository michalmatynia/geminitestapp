import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiPathsValidationRule } from '@/shared/lib/ai-paths';

import { ValidationRulesEditor } from '../ValidationRulesEditor';

const validationRulesEditorMocks = vi.hoisted(() => ({
  useAdminAiPathsValidationContextMock: vi.fn(),
}));

vi.mock('../../../context/AdminAiPathsValidationContext', () => ({
  useAdminAiPathsValidationContext:
    validationRulesEditorMocks.useAdminAiPathsValidationContextMock as typeof import('../../../context/AdminAiPathsValidationContext').useAdminAiPathsValidationContext,
}));

const buildRule = (overrides: Partial<AiPathsValidationRule> = {}): AiPathsValidationRule =>
  ({
    id: 'rule-1',
    title: 'Rule 1',
    description: 'Rule description',
    enabled: true,
    severity: 'warning',
    module: 'custom',
    sequence: 10,
    conditionMode: 'all',
    conditions: [
      {
        id: 'cond-1',
        operator: 'exists',
        field: 'config.value',
      },
    ],
    ...overrides,
  }) as AiPathsValidationRule;

describe('ValidationRulesEditor stage controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults stage selection to graph_parse when appliesToStages is not set', () => {
    validationRulesEditorMocks.useAdminAiPathsValidationContextMock.mockReturnValue({
      rulesDraft: '[]',
      setRulesDraft: vi.fn(),
      rulesDraftError: null,
      handleApplyRulesDraft: vi.fn(),
      filteredRules: [buildRule()],
      handleToggleRuleEnabled: vi.fn(),
      handleRuleSequenceBlur: vi.fn(),
      handleRuleStageToggle: vi.fn(),
    });

    render(<ValidationRulesEditor />);

    const parseCheckbox = screen.getByRole('checkbox', { name: 'Parse' });
    expect(parseCheckbox).toHaveAttribute('data-state', 'checked');

    const nodePostCheckbox = screen.getByRole('checkbox', { name: 'Node Post' });
    expect(nodePostCheckbox).toHaveAttribute('data-state', 'unchecked');
  });

  it('invokes stage toggle handler when stage checkbox is clicked', () => {
    const handleRuleStageToggle = vi.fn();
    validationRulesEditorMocks.useAdminAiPathsValidationContextMock.mockReturnValue({
      rulesDraft: '[]',
      setRulesDraft: vi.fn(),
      rulesDraftError: null,
      handleApplyRulesDraft: vi.fn(),
      filteredRules: [buildRule({ id: 'rule-stage-toggle' })],
      handleToggleRuleEnabled: vi.fn(),
      handleRuleSequenceBlur: vi.fn(),
      handleRuleStageToggle,
    });

    render(<ValidationRulesEditor />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Node Post' }));

    expect(handleRuleStageToggle).toHaveBeenCalledWith(
      'rule-stage-toggle',
      'node_post_execute',
      true
    );
  });
});
