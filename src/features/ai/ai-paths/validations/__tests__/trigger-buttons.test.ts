import { describe, expect, it } from 'vitest';

import {
  aiTriggerButtonCreateSchema,
  aiTriggerButtonUpdateSchema,
  parseAiTriggerButtonsRaw,
} from '@/features/ai/ai-paths/validations/trigger-buttons';

const expectStoredPayloadToThrow = (payload: unknown): void => {
  expect(() => parseAiTriggerButtonsRaw(JSON.stringify(payload))).toThrow();
};

describe('trigger button validation', () => {
  it('defaults enabled to true on create payloads', () => {
    const parsed = aiTriggerButtonCreateSchema.parse({
      name: 'Run Path',
      locations: ['product_modal'],
    });

    expect(parsed.enabled).toBe(true);
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

  it('normalizes missing enabled field to true when reading stored buttons', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        {
          id: 'btn-1',
          name: 'Run Path',
        },
      ])
    );

    expect(parsed[0]?.enabled).toBe(true);
  });

  it('rejects legacy isActive when reading stored buttons', () => {
    expectStoredPayloadToThrow([
      {
        id: 'btn-legacy-inactive',
        name: 'Legacy Inactive',
        isActive: false,
      },
    ]);
  });

  it('preserves enabled=false when reading stored buttons', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        {
          id: 'btn-2',
          name: 'Hidden Path',
          enabled: false,
          locations: ['product_modal'],
        },
      ])
    );

    expect(parsed[0]?.enabled).toBe(false);
  });

  it('rejects conflicting enabled/isActive flags instead of repairing them', () => {
    expectStoredPayloadToThrow([
      {
        id: 'btn-conflict',
        name: 'Conflicting Flags',
        enabled: false,
        isActive: true,
        locations: ['product_modal'],
      },
    ]);
  });

  it('rejects legacy icon field instead of mapping it to iconId', () => {
    expectStoredPayloadToThrow([
      {
        id: 'btn-legacy-icon',
        name: 'Legacy',
        icon: 'sparkles',
      },
    ]);
  });

  it('rejects legacy top-level label when canonical name is missing', () => {
    expectStoredPayloadToThrow([
      {
        id: 'btn-legacy-label',
        label: 'Legacy Label',
      },
    ]);
  });

  it('infers display.label from button name', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        {
          id: 'btn-display-label',
          name: 'Display Label',
          display: { label: 'Old Label' },
        },
      ])
    );

    expect(parsed[0]?.display.label).toBe('Display Label');
  });

  it('maps icon display mode into showLabel=false', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        {
          id: 'btn-icon-mode',
          name: 'Icon Mode',
          display: 'icon',
        },
      ])
    );

    expect(parsed[0]?.display.showLabel).toBe(false);
  });

  it('maps legacy label display mode into showLabel=true', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        {
          id: 'btn-legacy-display',
          name: 'Legacy Display',
          display: 'label',
        },
      ])
    );

    expect(parsed[0]?.display.showLabel).toBe(true);
  });

  it('preserves canonical stored name even when display.label differs', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        {
          id: 'btn-opaque-name',
          name: '90f4a2f8-3f12-44cc-a32f-f2e54ed5c68f',
          display: { label: 'Friendly Trigger Name', showLabel: true },
        },
      ])
    );

    expect(parsed[0]?.name).toBe('90f4a2f8-3f12-44cc-a32f-f2e54ed5c68f');
    expect(parsed[0]?.display.label).toBe('90f4a2f8-3f12-44cc-a32f-f2e54ed5c68f');
  });

  it('parses string enabled values without dropping the record', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        {
          id: 'btn-enabled-string',
          name: 'Enabled String',
          enabled: 'false',
        },
      ])
    );

    expect(parsed[0]?.enabled).toBe(false);
  });

  it('filters invalid locations and keeps valid ones', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        {
          id: 'btn-locations',
          name: 'Locations',
          locations: ['product_modal', 'invalid_location', 'product_modal'],
        },
      ])
    );

    expect(parsed[0]?.locations).toEqual(['product_modal']);
  });

  it('preserves stored pathId', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        {
          id: 'btn-path-id',
          name: 'Run Target Path',
          pathId: 'path_desc_name',
        },
      ])
    );

    expect(parsed[0]?.pathId).toBe('path_desc_name');
  });

  it('rejects legacy pathIds when pathId is missing', () => {
    expectStoredPayloadToThrow([
      {
        id: 'btn-path-ids',
        name: 'Run Target Path',
        pathIds: ['path_one', 'path_two'],
      },
    ]);
  });
});
