/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  findOne: vi.fn(),
  getMongoDb: vi.fn(),
  getProductDataProvider: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

vi.mock('@/shared/lib/products/services/product-provider', () => ({
  getProductDataProvider: mocks.getProductDataProvider,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: mocks.captureException,
  },
}));

import { PRODUCT_VALIDATOR_DECISION_LOG_SETTING_KEY } from '@/shared/lib/products/constants';
import {
  appendProductValidationDecision,
  appendProductValidationDecisionsBatch,
} from './validator-decision-log-service';

const settingFilter = {
  $or: [
    { _id: PRODUCT_VALIDATOR_DECISION_LOG_SETTING_KEY },
    { key: PRODUCT_VALIDATOR_DECISION_LOG_SETTING_KEY },
  ],
};

describe('validator-decision-log-service', () => {
  beforeEach(() => {
    mocks.captureException.mockReset();
    mocks.findOne.mockReset();
    mocks.getProductDataProvider.mockReset().mockResolvedValue('mongodb');
    mocks.updateOne.mockReset().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    mocks.getMongoDb.mockReset().mockResolvedValue({
      collection: (name: string) => {
        if (name !== 'settings') return {};
        return {
          findOne: mocks.findOne,
          updateOne: mocks.updateOne,
        };
      },
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T20:00:00.000Z'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('appends a single normalized decision record ahead of existing entries', async () => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'browser-uuid'),
    });
    mocks.findOne.mockResolvedValueOnce({
      value: JSON.stringify([
        {
          id: 'existing',
          action: 'accept',
          productId: null,
          draftId: null,
          patternId: 'pattern-old',
          fieldName: 'name_en',
          denyBehavior: null,
          message: null,
          replacementValue: null,
          sessionId: null,
          userId: null,
          createdAt: '2026-03-25T10:00:00.000Z',
        },
      ]),
    });

    const record = await appendProductValidationDecision({
      action: 'replace',
      productId: ' product-1 ',
      draftId: '  ',
      patternId: ' pattern-1 ',
      fieldName: ' name_en ',
      denyBehavior: 'warn_and_allow',
      message: '  Needs cleanup  ',
      replacementValue: '  Alpha  ',
      sessionId: ' session-1 ',
      userId: ' user-1 ',
    });

    expect(record).toEqual({
      id: 'browser-uuid',
      action: 'replace',
      productId: 'product-1',
      draftId: null,
      patternId: 'pattern-1',
      fieldName: 'name_en',
      denyBehavior: 'warn_and_allow',
      message: 'Needs cleanup',
      replacementValue: 'Alpha',
      sessionId: 'session-1',
      userId: 'user-1',
      createdAt: '2026-03-25T20:00:00.000Z',
    });
    expect(mocks.findOne).toHaveBeenCalledWith(settingFilter);
    expect(mocks.updateOne).toHaveBeenCalledWith(
      settingFilter,
      {
        $set: {
          key: PRODUCT_VALIDATOR_DECISION_LOG_SETTING_KEY,
          value: JSON.stringify([
            {
              id: 'browser-uuid',
              action: 'replace',
              productId: 'product-1',
              draftId: null,
              patternId: 'pattern-1',
              fieldName: 'name_en',
              denyBehavior: 'warn_and_allow',
              message: 'Needs cleanup',
              replacementValue: 'Alpha',
              sessionId: 'session-1',
              userId: 'user-1',
              createdAt: '2026-03-25T20:00:00.000Z',
            },
            {
              id: 'existing',
              action: 'accept',
              productId: null,
              draftId: null,
              patternId: 'pattern-old',
              fieldName: 'name_en',
              denyBehavior: null,
              message: null,
              replacementValue: null,
              sessionId: null,
              userId: null,
              createdAt: '2026-03-25T10:00:00.000Z',
            },
          ]),
          updatedAt: new Date('2026-03-25T20:00:00.000Z'),
        },
        $setOnInsert: {
          createdAt: new Date('2026-03-25T20:00:00.000Z'),
        },
      },
      { upsert: true }
    );
  });

  it('falls back cleanly when the stored decision log is invalid json', async () => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'invalid-json-uuid'),
    });
    mocks.findOne.mockResolvedValueOnce({ value: '{not-json' });

    const record = await appendProductValidationDecision({
      action: 'deny',
      patternId: 'pattern-2',
      fieldName: 'price',
    });

    expect(record).toEqual(
      expect.objectContaining({
        id: 'invalid-json-uuid',
        action: 'deny',
        patternId: 'pattern-2',
        fieldName: 'price',
      })
    );
    expect(mocks.captureException).toHaveBeenCalledTimes(1);
    expect(mocks.updateOne).toHaveBeenCalledWith(
      settingFilter,
      expect.objectContaining({
        $set: expect.objectContaining({
          key: PRODUCT_VALIDATOR_DECISION_LOG_SETTING_KEY,
          value: JSON.stringify([record]),
        }),
      }),
      { upsert: true }
    );
  });

  it('appends decision batches and enforces the max entry cap', async () => {
    vi.stubGlobal('crypto', {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce('batch-1')
        .mockReturnValueOnce('batch-2'),
    });

    const existing = Array.from({ length: 1999 }, (_, index) => ({
      id: `existing-${index}`,
      action: 'accept',
      productId: null,
      draftId: null,
      patternId: `pattern-${index}`,
      fieldName: 'name_en',
      denyBehavior: null,
      message: null,
      replacementValue: null,
      sessionId: null,
      userId: null,
      createdAt: `2026-03-24T10:00:${String(index % 60).padStart(2, '0')}.000Z`,
    }));
    mocks.findOne.mockResolvedValueOnce({
      value: JSON.stringify(existing),
    });

    const records = await appendProductValidationDecisionsBatch([
      {
        action: 'deny',
        patternId: 'pattern-new-1',
        fieldName: 'price',
      },
      {
        action: 'accept',
        productId: ' product-2 ',
        patternId: 'pattern-new-2',
        fieldName: 'stock',
        message: '  ok  ',
      },
    ]);

    const updateCall = mocks.updateOne.mock.calls[0];
    const writtenPayload = JSON.parse(updateCall?.[1]?.$set?.value as string) as Array<{
      id: string;
      productId: string | null;
      patternId: string;
      fieldName: string;
      message: string | null;
      createdAt: string;
    }>;

    expect(records).toEqual([
      expect.objectContaining({
        id: 'batch-1',
        action: 'deny',
        patternId: 'pattern-new-1',
        fieldName: 'price',
        createdAt: '2026-03-25T20:00:00.000Z',
      }),
      expect.objectContaining({
        id: 'batch-2',
        action: 'accept',
        productId: 'product-2',
        patternId: 'pattern-new-2',
        fieldName: 'stock',
        message: 'ok',
        createdAt: '2026-03-25T20:00:00.000Z',
      }),
    ]);
    expect(writtenPayload).toHaveLength(2000);
    expect(writtenPayload[0]?.id).toBe('batch-1');
    expect(writtenPayload[1]?.id).toBe('batch-2');
    expect(writtenPayload.at(-1)?.id).toBe('existing-1997');
  });
});
