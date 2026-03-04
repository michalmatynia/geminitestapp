import { describe, expect, it } from 'vitest';

import { ERROR_CATEGORY } from '@/shared/contracts/observability';
import { validationError } from '@/shared/errors/app-error';
import { classifyError, getSuggestedActions } from '@/shared/errors/error-classifier';

describe('error-classifier', () => {
  it('classifies validation AppError before message keyword matching', () => {
    const error = validationError(
      'Agent persona settings payload includes unsupported keys: plannerModel.'
    );

    expect(classifyError(error)).toBe(ERROR_CATEGORY.VALIDATION);
  });

  it('does not suggest AI prompt fixes for validation AppError containing "AI" text', () => {
    const error = validationError(
      'Agent persona settings payload includes unsupported keys: plannerModel.'
    );
    const actions = getSuggestedActions(classifyError(error), error);

    expect(actions[0]?.label).toBe('Update Persona Settings');
    expect(actions.some((action) => action.label === 'Adjust Prompt')).toBe(false);
  });

  it('suggests dedicated image studio action for unsupported-key settings payloads', () => {
    const error = validationError(
      'Image Studio settings payload includes unsupported keys: targetAi.openai.model.'
    );
    const actions = getSuggestedActions(classifyError(error), error);

    expect(actions[0]?.label).toBe('Update Image Studio Settings');
    expect(actions[0]?.description).toMatch(/unsupported model snapshot fields/i);
    expect(actions[0]?.description).not.toMatch(/legacy model snapshot fields/i);
    expect(actions.some((action) => action.label === 'Adjust Prompt')).toBe(false);
  });

  it('falls back to generic settings-contract guidance for unknown unsupported-key sources', () => {
    const error = validationError('Some module includes unsupported keys: oldModel.');
    const actions = getSuggestedActions(classifyError(error), error);

    expect(actions[0]?.label).toBe('Check Settings Contract');
    expect(actions.some((action) => action.label === 'Adjust Prompt')).toBe(false);
  });

  it('treats unsupported-key errors as validation even when thrown as plain Error', () => {
    const error = new Error('Agent persona settings payload includes unsupported keys: plannerModel.');
    const actions = getSuggestedActions(classifyError(error), error);

    expect(classifyError(error)).toBe(ERROR_CATEGORY.VALIDATION);
    expect(actions[0]?.label).toBe('Update Persona Settings');
    expect(actions.some((action) => action.label === 'Adjust Prompt')).toBe(false);
  });
});
