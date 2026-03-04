import { describe, expect, it } from 'vitest';

import { ERROR_CATEGORY } from '@/shared/contracts/observability';
import { validationError } from '@/shared/errors/app-error';
import { classifyError, getSuggestedActions } from '@/shared/errors/error-classifier';

describe('error-classifier', () => {
  it('classifies validation AppError before message keyword matching', () => {
    const error = validationError('Agent persona settings contain deprecated AI snapshot keys.');

    expect(classifyError(error)).toBe(ERROR_CATEGORY.VALIDATION);
  });

  it('does not suggest AI prompt fixes for validation AppError containing "AI" text', () => {
    const error = validationError('Agent persona settings contain deprecated AI snapshot keys.');
    const actions = getSuggestedActions(classifyError(error), error);

    expect(actions[0]?.label).toBe('Update Persona Settings');
    expect(actions.some((action) => action.label === 'Adjust Prompt')).toBe(false);
  });

  it('suggests dedicated image studio action for deprecated snapshot settings payloads', () => {
    const error = validationError('Image Studio settings contain deprecated AI snapshot keys.');
    const actions = getSuggestedActions(classifyError(error), error);

    expect(actions[0]?.label).toBe('Update Image Studio Settings');
    expect(actions.some((action) => action.label === 'Adjust Prompt')).toBe(false);
  });

  it('falls back to generic settings-contract guidance for unknown deprecated snapshot sources', () => {
    const error = validationError('Some module contains deprecated AI snapshot keys.');
    const actions = getSuggestedActions(classifyError(error), error);

    expect(actions[0]?.label).toBe('Check Settings Contract');
    expect(actions.some((action) => action.label === 'Adjust Prompt')).toBe(false);
  });
});
