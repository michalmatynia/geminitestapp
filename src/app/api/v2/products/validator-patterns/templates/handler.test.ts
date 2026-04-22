import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getValidationPatternRepositoryMock } = vi.hoisted(() => ({
  getValidationPatternRepositoryMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  getValidationPatternRepository: () => getValidationPatternRepositoryMock(),
}));

import { postValidatorTemplateHandler } from './handler';
import { parseDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';

describe('validator-patterns templates handler module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the supported handlers', () => {
    expect(typeof postValidatorTemplateHandler).toBe('function');
  });

  it('creates the category inference template with the expected category replacement wiring', async () => {
    const createPattern = vi.fn(async (input) => ({
      id: 'pattern-1',
      label: input.label,
      target: input.target,
    }));
    const updatePattern = vi.fn();

    getValidationPatternRepositoryMock.mockResolvedValue({
      listPatterns: vi.fn(async () => []),
      createPattern,
      updatePattern,
    });

    const response = await postValidatorTemplateHandler(
      {} as never,
      {} as never,
      { type: 'name-segment-category' }
    );

    expect(createPattern).toHaveBeenCalledTimes(1);
    expect(updatePattern).not.toHaveBeenCalled();

    const payload = createPattern.mock.calls[0]?.[0];
    const options = createPattern.mock.calls[0]?.[1];
    const recipe = parseDynamicReplacementRecipe(payload.replacementValue);

    expect(payload).toMatchObject({
      label: 'Name Segment #4 -> Category',
      target: 'category',
      regex: '^$',
      replacementEnabled: true,
      replacementAutoApply: true,
      replacementFields: ['categoryId'],
      launchEnabled: true,
      launchSourceMode: 'form_field',
      launchSourceField: 'nameEnSegment4',
      launchOperator: 'is_not_empty',
      semanticState: {
        version: 2,
        presetId: 'products.name-segment-category.v2',
        operation: 'infer_category_from_name_segment',
        sourceField: 'nameEnSegment4',
        targetField: 'categoryId',
      },
    });
    expect(recipe).toMatchObject({
      sourceMode: 'form_field',
      sourceField: 'nameEnSegment4',
      targetApply: 'replace_whole_field',
    });
    expect(options).toEqual({ semanticAuditSource: 'template' });

    await expect(response.json()).resolves.toEqual({
      outcomes: [
        {
          action: 'created',
          target: 'category',
          patternId: 'pattern-1',
          label: 'Name Segment #4 -> Category',
        },
      ],
    });
  });

  it('updates the legacy category template label instead of creating a duplicate', async () => {
    const createPattern = vi.fn();
    const updatePattern = vi.fn(async (_id, input) => ({
      id: 'pattern-legacy',
      label: input.label,
      target: input.target,
    }));

    getValidationPatternRepositoryMock.mockResolvedValue({
      listPatterns: vi.fn(async () => [
        {
          id: 'pattern-legacy',
          label: 'Name Segment: Category',
        },
      ]),
      createPattern,
      updatePattern,
    });

    const response = await postValidatorTemplateHandler(
      {} as never,
      {} as never,
      { type: 'name-segment-category' }
    );

    expect(createPattern).not.toHaveBeenCalled();
    expect(updatePattern).toHaveBeenCalledWith(
      'pattern-legacy',
      expect.objectContaining({
        label: 'Name Segment #4 -> Category',
        target: 'category',
      }),
      { semanticAuditSource: 'template' }
    );
    await expect(response.json()).resolves.toEqual({
      outcomes: [
        {
          action: 'updated',
          target: 'category',
          patternId: 'pattern-legacy',
          label: 'Name Segment #4 -> Category',
        },
      ],
    });
  });

  it('returns structured outcomes for the legacy dimensions template preset', async () => {
    const createPattern = vi.fn(async (input) => ({
      id: 'pattern-dimensions',
      label: input.label,
      target: input.target,
    }));

    getValidationPatternRepositoryMock.mockResolvedValue({
      listPatterns: vi.fn(async () => []),
      createPattern,
      updatePattern: vi.fn(),
    });

    const response = await postValidatorTemplateHandler(
      {} as never,
      {} as never,
      { type: 'name-segment-dimensions' }
    );

    expect(createPattern).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Name Segment: Dimensions',
        semanticState: expect.objectContaining({
          presetId: 'products.name-segment-dimensions.v2',
          operation: 'validate_name_contains_dimensions_token',
        }),
      }),
      { semanticAuditSource: 'template' }
    );
    await expect(response.json()).resolves.toEqual({
      outcomes: [
        {
          action: 'created',
          target: 'name',
          patternId: 'pattern-dimensions',
          label: 'Name Segment: Dimensions',
        },
      ],
    });
  });

  it('creates the StarGater producer template with producer replacement wiring', async () => {
    const createPattern = vi.fn(async (input) => ({
      id: 'pattern-producer',
      label: input.label,
      target: input.target,
    }));

    getValidationPatternRepositoryMock.mockResolvedValue({
      listPatterns: vi.fn(async () => []),
      createPattern,
      updatePattern: vi.fn(),
    });

    const response = await postValidatorTemplateHandler(
      {} as never,
      {} as never,
      { type: 'producer-stargater' }
    );

    expect(createPattern).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Producer -> StarGater.net',
        target: 'producer',
        regex: '^.*$',
        replacementEnabled: true,
        replacementAutoApply: true,
        replacementValue: 'StarGater.net',
        replacementFields: ['producerIds'],
      }),
      { semanticAuditSource: 'template' }
    );
    await expect(response.json()).resolves.toEqual({
      outcomes: [
        {
          action: 'created',
          target: 'producer',
          patternId: 'pattern-producer',
          label: 'Producer -> StarGater.net',
        },
      ],
    });
  });
});
