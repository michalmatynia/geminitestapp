import { beforeEach, describe, expect, it, vi } from 'vitest';

let telemetry: typeof import('@/shared/lib/observability/tanstack-telemetry');

describe('tanstack telemetry', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock('@/shared/lib/observability/tanstack-telemetry');
    telemetry = await import('@/shared/lib/observability/tanstack-telemetry');
    telemetry.tanstackTelemetryTestUtils.reset();
  });

  it('requires source/operation/resource metadata in non-production', () => {
    expect(() =>
      telemetry.resolveTanstackFactoryMeta({
        source: '',
        operation: 'list',
        resource: '',
      })
    ).toThrow('[tanstack-factory-v2] Missing required meta fields');
  });

  it('resolves defaults for optional metadata fields', () => {
    const resolved = telemetry.resolveTanstackFactoryMeta({
      source: 'products.hooks.useProducts',
      operation: 'list',
      resource: 'products',
      description: 'Loads products for the product list.',
    });

    expect(resolved.description).toBe('Loads products for the product list.');
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
    const resolved = telemetry.resolveTanstackFactoryMeta({
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
    const resolved = telemetry.resolveTanstackFactoryMeta({
      source: 'integrations.hooks.useIntegrations',
      operation: 'list',
      resource: 'integrations',
      description: 'Loads integration records.',
      queryKey: ['integrations'],
      domain: 'integrations',
    });
    const bag = telemetry.attachTanstackFactoryMeta(resolved, { keep: true });
    const extracted = telemetry.getTanstackFactoryMetaFromBag(bag);

    expect(extracted).not.toBeNull();
    expect(extracted?.source).toBe('integrations.hooks.useIntegrations');
    expect(extracted?.resource).toBe('integrations');
    expect(extracted?.description).toBe('Loads integration records.');
  });

  it('suppresses duplicate telemetry events in a short dedupe window', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(
      telemetry.emitTanstackTelemetry({
        entity: 'query',
        stage: 'start',
        meta: {
          source: 'products.hooks.useProducts',
          operation: 'list',
          resource: 'products',
          description: 'Loads products.',
          queryKey: ['products'],
          samplingRate: 1,
          domain: 'products',
        },
        key: ['products'],
      })
    ).toBe(true);

    expect(
      telemetry.emitTanstackTelemetry({
        entity: 'query',
        stage: 'start',
        meta: {
          source: 'products.hooks.useProducts',
          operation: 'list',
          resource: 'products',
          description: 'Loads products.',
          queryKey: ['products'],
          samplingRate: 1,
          domain: 'products',
        },
        key: ['products'],
      })
    ).toBe(false);

    randomSpy.mockRestore();
  });

  it('includes meta descriptions in queued telemetry events', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(
      telemetry.emitTanstackTelemetry({
        entity: 'query',
        stage: 'success',
        meta: {
          source: 'settings.hooks.useSettings',
          operation: 'list',
          resource: 'settings',
          description: 'Loads application settings.',
          queryKey: ['settings'],
          samplingRate: 1,
          domain: 'observability',
        },
        key: ['settings'],
      })
    ).toBe(true);

    expect(telemetry.tanstackTelemetryTestUtils.getQueuedEvents()[0]).toMatchObject({
      source: 'settings.hooks.useSettings',
      resource: 'settings',
      description: 'Loads application settings.',
    });

    randomSpy.mockRestore();
  });
});
