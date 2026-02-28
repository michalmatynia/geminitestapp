import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  attachTanstackFactoryMeta,
  emitTanstackTelemetry,
  getTanstackFactoryMetaFromBag,
  resolveTanstackFactoryMeta,
  tanstackTelemetryTestUtils,
} from '@/shared/lib/observability/tanstack-telemetry';

describe('tanstack telemetry', () => {
  beforeEach(() => {
    tanstackTelemetryTestUtils.reset();
    vi.restoreAllMocks();
  });

  it('requires source/operation/resource metadata in non-production', () => {
    expect(() =>
      resolveTanstackFactoryMeta({
        source: '',
        operation: 'list',
        resource: '',
      })
    ).toThrow('[tanstack-factory-v2] Missing required meta fields');
  });

  it('resolves defaults for optional metadata fields', () => {
    const resolved = resolveTanstackFactoryMeta({
      source: 'products.hooks.useProducts',
      operation: 'list',
      resource: 'products',
    });

    expect(resolved.criticality).toBe('normal');
    expect(resolved.domain).toBe('global');
    expect(resolved.samplingRate).toBeGreaterThanOrEqual(0);
    expect(resolved.samplingRate).toBeLessThanOrEqual(1);
    expect(resolved.tags).toEqual([]);
  });

  it('normalizes metadata fields to transport-safe limits', () => {
    const longText = 'x'.repeat(400);
    const tags = Array.from(
      { length: 40 },
      (_, index: number) => `tag-${index}-${'y'.repeat(140)}`
    );
    const resolved = resolveTanstackFactoryMeta({
      source: ` ${longText} `,
      operation: 'list',
      resource: ` ${longText} `,
      tags,
    });

    expect(resolved.source.length).toBeLessThanOrEqual(240);
    expect(resolved.resource.length).toBeLessThanOrEqual(240);
    expect(resolved.tags.length).toBeLessThanOrEqual(16);
    expect(resolved.tags.every((tag: string) => tag.length <= 120)).toBe(true);
  });

  it('attaches and extracts runtime metadata from react-query meta bag', () => {
    const resolved = resolveTanstackFactoryMeta({
      source: 'integrations.hooks.useIntegrations',
      operation: 'list',
      resource: 'integrations',
      queryKey: ['integrations'],
      domain: 'integrations',
    });
    const bag = attachTanstackFactoryMeta(resolved, { keep: true });
    const extracted = getTanstackFactoryMetaFromBag(bag);

    expect(extracted).not.toBeNull();
    expect(extracted?.source).toBe('integrations.hooks.useIntegrations');
    expect(extracted?.resource).toBe('integrations');
  });

  it('suppresses duplicate telemetry events in a short dedupe window', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(
      emitTanstackTelemetry({
        entity: 'query',
        stage: 'start',
        meta: {
          source: 'products.hooks.useProducts',
          operation: 'list',
          resource: 'products',
          queryKey: ['products'],
          samplingRate: 1,
          domain: 'products',
        },
        key: ['products'],
      })
    ).toBe(true);

    expect(
      emitTanstackTelemetry({
        entity: 'query',
        stage: 'start',
        meta: {
          source: 'products.hooks.useProducts',
          operation: 'list',
          resource: 'products',
          queryKey: ['products'],
          samplingRate: 1,
          domain: 'products',
        },
        key: ['products'],
      })
    ).toBe(false);

    randomSpy.mockRestore();
  });
});
