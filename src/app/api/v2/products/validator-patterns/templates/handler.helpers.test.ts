import { describe, expect, it, vi } from 'vitest';

import {
  applyValidatorTemplatePatterns,
  buildValidatorTemplateOutcome,
  findMatchingValidatorTemplatePattern,
  VALIDATOR_TEMPLATE_AUDIT_OPTIONS,
} from './handler.helpers';

describe('validator-patterns templates handler helpers', () => {
  it('finds matching patterns and builds structured outcomes', () => {
    const templatePattern = {
      buildPayload: () => ({ label: 'Template' }),
      matchesExisting: (pattern: { label: string }) => pattern.label === 'Template',
    };

    expect(
      findMatchingValidatorTemplatePattern([{ label: 'Other' }, { label: 'Template' }], templatePattern)
    ).toEqual({ label: 'Template' });
    expect(
      buildValidatorTemplateOutcome('created', {
        id: 'pattern-1',
        target: 'name',
        label: 'Template',
      })
    ).toEqual({
      action: 'created',
      target: 'name',
      patternId: 'pattern-1',
      label: 'Template',
    });
  });

  it('creates unmatched template patterns and updates matched ones with template audit options', async () => {
    const repo = {
      createPattern: vi.fn(async () => ({
        id: 'created-pattern',
        target: 'name',
        label: 'Created Label',
      })),
      updatePattern: vi.fn(async () => ({
        id: 'existing-pattern',
        target: 'category',
        label: 'Updated Label',
      })),
    };

    const outcomes = await applyValidatorTemplatePatterns({
      repo,
      existingPatterns: [{ id: 'existing-pattern', kind: 'existing' }],
      templatePatterns: [
        {
          buildPayload: () => ({ label: 'Create Me' }),
          matchesExisting: () => false,
        },
        {
          buildPayload: () => ({ label: 'Update Me' }),
          matchesExisting: (pattern: { kind?: string }) => pattern.kind === 'existing',
        },
      ],
    });

    expect(repo.createPattern).toHaveBeenCalledWith(
      { label: 'Create Me' },
      VALIDATOR_TEMPLATE_AUDIT_OPTIONS
    );
    expect(repo.updatePattern).toHaveBeenCalledWith(
      'existing-pattern',
      { label: 'Update Me' },
      VALIDATOR_TEMPLATE_AUDIT_OPTIONS
    );
    expect(outcomes).toEqual([
      {
        action: 'created',
        target: 'name',
        patternId: 'created-pattern',
        label: 'Created Label',
      },
      {
        action: 'updated',
        target: 'category',
        patternId: 'existing-pattern',
        label: 'Updated Label',
      },
    ]);
  });
});
