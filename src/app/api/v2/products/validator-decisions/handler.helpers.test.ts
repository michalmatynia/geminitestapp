import { describe, expect, it } from 'vitest';

import {
  buildProductValidationDecisionInput,
  parseCreateDecisionBody,
} from './handler.helpers';

describe('validator-decisions handler helpers', () => {
  it('parses a valid decision payload and applies schema defaults', () => {
    expect(
      parseCreateDecisionBody({
        patternId: 'pattern-1',
        fieldName: 'name_en',
      })
    ).toEqual({
      action: 'deny',
      patternId: 'pattern-1',
      fieldName: 'name_en',
    });
  });

  it('throws a validation error for invalid payloads', () => {
    expect(() =>
      parseCreateDecisionBody({
        patternId: '',
        fieldName: '',
      })
    ).toThrow('Validation failed');

    try {
      parseCreateDecisionBody({
        patternId: '',
        fieldName: '',
      });
    } catch (error) {
      expect(error).toMatchObject({
        code: 'VALIDATION_ERROR',
        httpStatus: 400,
      });
    }
  });

  it('maps optional decision fields to nullable record inputs', () => {
    expect(
      buildProductValidationDecisionInput(
        {
          action: 'replace',
          productId: undefined,
          draftId: null,
          patternId: 'pattern-1',
          fieldName: 'name_en',
          denyBehavior: undefined,
          message: undefined,
          replacementValue: 'Updated',
          sessionId: undefined,
        },
        undefined
      )
    ).toEqual({
      action: 'replace',
      productId: null,
      draftId: null,
      patternId: 'pattern-1',
      fieldName: 'name_en',
      denyBehavior: null,
      message: null,
      replacementValue: 'Updated',
      sessionId: null,
      userId: null,
    });
  });
});
