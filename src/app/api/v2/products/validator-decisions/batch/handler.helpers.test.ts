import { describe, expect, it } from 'vitest';

import {
  buildBatchProductValidationDecisionInputs,
  parseBatchDecisionBody,
} from './handler.helpers';

describe('validator-decisions batch handler helpers', () => {
  it('parses a valid batch payload and applies schema defaults', () => {
    expect(
      parseBatchDecisionBody({
        decisions: [
          {
            patternId: 'pattern-1',
            fieldName: 'name_en',
          },
        ],
      })
    ).toEqual({
      decisions: [
        {
          action: 'accept',
          patternId: 'pattern-1',
          fieldName: 'name_en',
        },
      ],
    });
  });

  it('throws a validation error for invalid batch payloads', () => {
    expect(() =>
      parseBatchDecisionBody({
        decisions: [],
      })
    ).toThrow('Validation failed');

    try {
      parseBatchDecisionBody({
        decisions: [],
      });
    } catch (error) {
      expect(error).toMatchObject({
        code: 'VALIDATION_ERROR',
        httpStatus: 400,
      });
    }
  });

  it('maps optional batch decision fields to nullable append inputs', () => {
    expect(
      buildBatchProductValidationDecisionInputs(
        {
          decisions: [
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
          ],
        },
        undefined
      )
    ).toEqual([
      {
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
      },
    ]);
  });
});
