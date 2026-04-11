import { describe, expect, it } from 'vitest';

import {
  aiTriggerButtonCreateSchema,
  aiTriggerButtonUpdateSchema,
  parseAiTriggerButtonsRaw,
  parseAiTriggerButtonsRawWithReport,
} from '@/features/ai/ai-paths/validations/trigger-buttons';

const createCanonicalStoredButton = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  id: 'btn-1',
  name: 'Run Path',
  iconId: null,
  pathId: null,
  enabled: true,
  locations: ['product_modal'],
  mode: 'click',
  display: 'icon_label',
  createdAt: '2026-03-03T00:00:00.000Z',
  updatedAt: '2026-03-03T00:00:00.000Z',
  sortIndex: 0,
  ...overrides,
});

const expectStoredPayloadToReject = (payload: unknown): void => {
  expect(() => parseAiTriggerButtonsRaw(JSON.stringify(payload))).toThrowError(
    'Invalid AI trigger button record payload.'
  );
};

describe('trigger button validation', () => {
  it('defaults enabled to true on create payloads', () => {
    const parsed = aiTriggerButtonCreateSchema.parse({
      name: 'Run Path',
      locations: ['product_modal'],
    });

    expect(parsed.enabled).toBe(true);
  });

  it('accepts marketplace-copy row locations on create payloads', () => {
    const parsed = aiTriggerButtonCreateSchema.parse({
      name: 'Debrand Marketplace Copy',
      locations: ['product_marketplace_copy_row'],
    });

    expect(parsed.locations).toEqual(['product_marketplace_copy_row']);
  });

  it('keeps explicit enabled=false on create payloads', () => {
    const parsed = aiTriggerButtonCreateSchema.parse({
      name: 'Run Path',
      enabled: false,
      locations: ['product_modal'],
    });

    expect(parsed.enabled).toBe(false);
  });

  it('accepts enabled-only update patches', () => {
    const parsed = aiTriggerButtonUpdateSchema.parse({
      enabled: false,
    });

    expect(parsed.enabled).toBe(false);
    expect(parsed.pathId).toBeUndefined();
  });

  it('normalizes pathId in create payloads', () => {
    const parsed = aiTriggerButtonCreateSchema.parse({
      name: 'Run Path',
      pathId: '  path-name-description  ',
      locations: ['product_modal'],
    });

    expect(parsed.pathId).toBe('path-name-description');
  });

  it('accepts pathId updates', () => {
    const parsed = aiTriggerButtonUpdateSchema.parse({
      pathId: ' path-target ',
    });

    expect(parsed.pathId).toBe('path-target');
  });

  it('rejects stored records with missing canonical fields', () => {
    const { enabled, ...recordWithoutEnabled } = createCanonicalStoredButton();
    void enabled;
    expectStoredPayloadToReject([recordWithoutEnabled]);
  });

  it('rejects legacy isActive when reading stored buttons', () => {
    expectStoredPayloadToReject([
      createCanonicalStoredButton({
        id: 'btn-legacy-inactive',
        isActive: false,
      }),
    ]);
  });

  it('preserves enabled=false when reading stored buttons', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        createCanonicalStoredButton({
          id: 'btn-2',
          name: 'Hidden Path',
          enabled: false,
          sortIndex: 1,
        }),
      ])
    );

    expect(parsed[0]?.enabled).toBe(false);
  });

  it('rejects conflicting enabled/isActive flags instead of repairing them', () => {
    expectStoredPayloadToReject([
      createCanonicalStoredButton({
        id: 'btn-conflict',
        enabled: false,
        isActive: true,
      }),
    ]);
  });

  it('rejects legacy icon field instead of mapping it to iconId', () => {
    expectStoredPayloadToReject([
      createCanonicalStoredButton({
        id: 'btn-legacy-icon',
        icon: 'sparkles',
      }),
    ]);
  });

  it('rejects legacy top-level label when canonical name is missing', () => {
    const base = createCanonicalStoredButton({
      id: 'btn-legacy-label',
      label: 'Legacy Label',
    });
    const { name, ...recordWithoutName } = base;
    void name;
    expectStoredPayloadToReject([recordWithoutName]);
  });

  it('infers display.label from canonical display mode values', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        createCanonicalStoredButton({
          id: 'btn-display-label',
          name: 'Display Label',
          display: 'icon_label',
        }),
      ])
    );

    expect(parsed[0]?.display.label).toBe('Display Label');
  });

  it('maps icon display mode into showLabel=false', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        createCanonicalStoredButton({
          id: 'btn-icon-mode',
          name: 'Icon Mode',
          display: 'icon',
        }),
      ])
    );

    expect(parsed[0]?.display.showLabel).toBe(false);
  });

  it('rejects legacy label display mode', () => {
    expectStoredPayloadToReject([
      createCanonicalStoredButton({
        id: 'btn-legacy-display',
        display: 'label',
      }),
    ]);
  });

  it('rejects display object payloads', () => {
    expectStoredPayloadToReject([
      createCanonicalStoredButton({
        id: 'btn-display-object',
        display: { label: 'Canonical Display', showLabel: false },
      }),
    ]);
  });

  it('preserves canonical stored name for canonical display mode payloads', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        createCanonicalStoredButton({
          id: 'btn-opaque-name',
          name: '90f4a2f8-3f12-44cc-a32f-f2e54ed5c68f',
          display: 'icon_label',
        }),
      ])
    );

    expect(parsed[0]?.name).toBe('90f4a2f8-3f12-44cc-a32f-f2e54ed5c68f');
    expect(parsed[0]?.display.label).toBe('90f4a2f8-3f12-44cc-a32f-f2e54ed5c68f');
  });

  it('rejects non-boolean enabled values', () => {
    expectStoredPayloadToReject([
      createCanonicalStoredButton({
        id: 'btn-enabled-string',
        enabled: 'false',
      }),
    ]);
  });

  it('rejects invalid location values instead of filtering them', () => {
    expectStoredPayloadToReject([
      createCanonicalStoredButton({
        id: 'btn-locations',
        locations: ['product_modal', 'invalid_location', 'product_modal'],
      }),
    ]);
  });

  it('preserves stored pathId', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        createCanonicalStoredButton({
          id: 'btn-path-id',
          pathId: 'path_desc_name',
        }),
      ])
    );

    expect(parsed[0]?.pathId).toBe('path_desc_name');
  });

  it('rejects legacy pathIds when pathId is missing', () => {
    expectStoredPayloadToReject([
      createCanonicalStoredButton({
        id: 'btn-path-ids',
        pathIds: ['path_one', 'path_two'],
      }),
    ]);
  });

  it('rejects mixed payloads that include invalid rows', () => {
    expect(() =>
      parseAiTriggerButtonsRawWithReport(
        JSON.stringify([
          createCanonicalStoredButton({ id: 'btn-valid', sortIndex: 0 }),
          createCanonicalStoredButton({ id: 'btn-invalid', isActive: false }),
        ])
      )
    ).toThrowError('Invalid AI trigger button record payload.');
  });

  it('rejects invalid JSON payloads', () => {
    expect(() => parseAiTriggerButtonsRawWithReport('{"broken"')).toThrowError(
      'Invalid AI trigger button settings payload.'
    );
    expect(() => parseAiTriggerButtonsRaw('{"broken"')).toThrowError(
      'Invalid AI trigger button settings payload.'
    );
  });

  it('rejects non-array payloads', () => {
    expect(() => parseAiTriggerButtonsRawWithReport('{"not":"array"}')).toThrowError(
      'Invalid AI trigger button settings payload.'
    );
    expect(() => parseAiTriggerButtonsRaw('{"not":"array"}')).toThrowError(
      'Invalid AI trigger button settings payload.'
    );
  });
});
