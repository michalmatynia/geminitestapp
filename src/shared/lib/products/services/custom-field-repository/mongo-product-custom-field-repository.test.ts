/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  customFieldDeleteOne: vi.fn(),
  customFieldInsertOne: vi.fn(),
  getMongoDb: vi.fn(),
  productUpdateMany: vi.fn(),
}));

vi.mock('crypto', () => ({
  randomUUID: () => 'custom-field-id',
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import { mongoProductCustomFieldRepository } from './mongo-product-custom-field-repository';

describe('mongoProductCustomFieldRepository product value propagation', () => {
  beforeEach(() => {
    mocks.customFieldDeleteOne.mockReset();
    mocks.customFieldInsertOne.mockReset().mockResolvedValue({ insertedId: 'mongo-id' });
    mocks.productUpdateMany.mockReset().mockResolvedValue({ modifiedCount: 2 });
    mocks.getMongoDb.mockReset().mockResolvedValue({
      collection: (name: string) => {
        if (name === 'product_custom_fields') {
          return {
            deleteOne: mocks.customFieldDeleteOne,
            insertOne: mocks.customFieldInsertOne,
          };
        }
        if (name === 'products') {
          return {
            updateMany: mocks.productUpdateMany,
          };
        }
        return {};
      },
    });
  });

  it('adds a default text value for a created custom field to every product', async () => {
    const now = new Date('2026-04-28T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const created = await mongoProductCustomFieldRepository.createCustomField({
      name: '  Care notes  ',
      type: 'text',
      options: [],
    });

    expect(created).toEqual(
      expect.objectContaining({
        id: 'custom-field-id',
        name: 'Care notes',
        type: 'text',
      })
    );
    expect(mocks.productUpdateMany).toHaveBeenCalledWith(
      { 'customFields.fieldId': { $ne: 'custom-field-id' } },
      [
        {
          $set: {
            customFields: {
              $concatArrays: [
                { $cond: [{ $isArray: '$customFields' }, '$customFields', []] },
                [{ fieldId: 'custom-field-id', textValue: '' }],
              ],
            },
            updatedAt: now,
          },
        },
      ]
    );

    vi.useRealTimers();
  });

  it('adds an empty selected-option list for a created checkbox custom field', async () => {
    await mongoProductCustomFieldRepository.createCustomField({
      name: 'Marketplace exclusions',
      type: 'checkbox_set',
      options: [{ id: 'tradera', label: 'Tradera' }],
    });

    expect(mocks.productUpdateMany).toHaveBeenCalledWith(
      { 'customFields.fieldId': { $ne: 'custom-field-id' } },
      [
        {
          $set: expect.objectContaining({
            customFields: {
              $concatArrays: [
                { $cond: [{ $isArray: '$customFields' }, '$customFields', []] },
                [{ fieldId: 'custom-field-id', selectedOptionIds: [] }],
              ],
            },
          }),
        },
      ]
    );
  });

  it('removes deleted custom field values from every product', async () => {
    const now = new Date('2026-04-28T11:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    await mongoProductCustomFieldRepository.deleteCustomField(' custom-field-id ');

    expect(mocks.customFieldDeleteOne).toHaveBeenCalledWith({
      $or: [{ _id: 'custom-field-id' }, { id: 'custom-field-id' }],
    });
    expect(mocks.productUpdateMany).toHaveBeenCalledWith(
      { 'customFields.fieldId': 'custom-field-id' },
      [
        {
          $set: {
            customFields: {
              $filter: {
                input: { $cond: [{ $isArray: '$customFields' }, '$customFields', []] },
                as: 'entry',
                cond: { $ne: ['$$entry.fieldId', 'custom-field-id'] },
              },
            },
            updatedAt: now,
          },
        },
      ]
    );

    vi.useRealTimers();
  });
});
