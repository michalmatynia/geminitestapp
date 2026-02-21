import { describe, expect, it } from 'vitest';

import {
  aiTriggerButtonCreateSchema,
  aiTriggerButtonUpdateSchema,
  parseAiTriggerButtonsRaw,
} from '@/features/ai/ai-paths/validations/trigger-buttons';

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

  it('maps legacy icon field to iconId for backward compatibility', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        {
          id: 'btn-legacy-icon',
          name: 'Legacy',
          icon: 'sparkles',
        },
      ])
    );

    expect(parsed[0]?.iconId).toBe('sparkles');
  });

  it('falls back to legacy top-level label when name is missing', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        {
          id: 'btn-legacy-label',
          label: 'Legacy Label',
        },
      ])
    );

    expect(parsed[0]?.name).toBe('Legacy Label');
    expect(parsed[0]?.display.label).toBe('Legacy Label');
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

  it('prefers display.label when stored name is an opaque id', () => {
    const parsed = parseAiTriggerButtonsRaw(
      JSON.stringify([
        {
          id: 'btn-opaque-name',
          name: '90f4a2f8-3f12-44cc-a32f-f2e54ed5c68f',
          display: { label: 'Friendly Trigger Name', showLabel: true },
        },
      ])
    );

    expect(parsed[0]?.name).toBe('Friendly Trigger Name');
    expect(parsed[0]?.display.label).toBe('Friendly Trigger Name');
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
});
