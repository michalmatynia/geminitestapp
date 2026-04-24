// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';

import { buildTriggerContext } from './trigger-event-context';

const TRIGGER_NODE: AiNode = {
  id: 'node-trigger-1',
  instanceId: 'node-trigger-1',
  nodeTypeId: 'nt-trigger',
  type: 'trigger',
  title: 'Trigger',
  description: '',
  position: { x: 0, y: 0 },
  inputs: [],
  outputs: ['trigger'],
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
};

const createTriggerNode = (entitySnapshotMode?: 'auto' | 'always' | 'never'): AiNode => ({
  ...TRIGGER_NODE,
  ...(entitySnapshotMode
    ? {
        config: {
          trigger: {
            event: 'manual',
            contextMode: 'trigger_only',
            entitySnapshotMode,
          },
        },
      }
    : {}),
});

describe('buildTriggerContext', () => {
  // ── core fields ──────────────────────────────────────────────────────────

  it('includes entityId, entityType, and trigger event id', () => {
    const ctx = buildTriggerContext({
      triggerNode: TRIGGER_NODE,
      triggerEventId: 'manual',
      entityType: 'product',
      entityId: 'product-1',
    });

    expect(ctx['entityId']).toBe('product-1');
    expect(ctx['entityType']).toBe('product');
    expect((ctx['event'] as Record<string, unknown>)['id']).toBe('manual');
    expect((ctx['event'] as Record<string, unknown>)['nodeId']).toBe('node-trigger-1');
  });

  it('sets entityId to null when not provided', () => {
    const ctx = buildTriggerContext({
      triggerNode: TRIGGER_NODE,
      triggerEventId: 'manual',
      entityType: 'product',
    });
    expect(ctx['entityId']).toBeNull();
  });

  // ── source field ─────────────────────────────────────────────────────────

  it('populates source.pathId from pathInfo.id', () => {
    const ctx = buildTriggerContext({
      triggerNode: TRIGGER_NODE,
      triggerEventId: 'manual',
      entityType: 'product',
      pathInfo: { id: 'path-abc', name: 'My Path' },
    });
    const source = ctx['source'] as Record<string, unknown>;
    expect(source['pathId']).toBe('path-abc');
    expect(source['pathName']).toBe('My Path');
  });

  it('defaults source.pathName to "AI Trigger Button" when pathInfo has no name', () => {
    const ctx = buildTriggerContext({
      triggerNode: TRIGGER_NODE,
      triggerEventId: 'manual',
      entityType: 'product',
      pathInfo: { id: 'path-abc' },
    });
    const source = ctx['source'] as Record<string, unknown>;
    expect(source['pathName']).toBe('AI Trigger Button');
  });

  it('passes source.location from the source arg', () => {
    const ctx = buildTriggerContext({
      triggerNode: TRIGGER_NODE,
      triggerEventId: 'manual',
      entityType: 'product',
      source: { location: 'product_modal', tab: 'product' },
    });
    const source = ctx['source'] as Record<string, unknown>;
    expect(source['location']).toBe('product_modal');
  });

  it('sets source.location to null when not provided', () => {
    const ctx = buildTriggerContext({
      triggerNode: TRIGGER_NODE,
      triggerEventId: 'manual',
      entityType: 'product',
    });
    const source = ctx['source'] as Record<string, unknown>;
    expect(source['location']).toBeNull();
  });

  it('defaults source.tab to entityType when not provided', () => {
    const ctx = buildTriggerContext({
      triggerNode: TRIGGER_NODE,
      triggerEventId: 'manual',
      entityType: 'note',
    });
    const source = ctx['source'] as Record<string, unknown>;
    expect(source['tab']).toBe('note');
  });

  // ── entity snapshot embedding ────────────────────────────────────────────

  it('embeds a sanitized entity snapshot for product_row when entityId is present', () => {
    const ctx = buildTriggerContext({
      triggerNode: TRIGGER_NODE,
      triggerEventId: 'manual',
      entityType: 'product',
      entityId: 'product-1',
      entityJson: { id: 'product-1', name_en: 'Test', imageBase64s: ['data:image/png;base64,abc'] },
      source: { location: 'product_row' },
    });
    const entity = ctx['entity'] as Record<string, unknown> | null;
    const entityJson = ctx['entityJson'] as Record<string, unknown> | null;

    expect(entity).not.toBeNull();
    expect(entity?.['id']).toBe('product-1');
    expect(entity?.['imageBase64s']).toBeUndefined();
    expect(entityJson).toEqual(entity);
    expect(ctx['productId']).toBe('product-1');
  });

  it('embeds sanitized entity snapshot for product_modal', () => {
    const ctx = buildTriggerContext({
      triggerNode: TRIGGER_NODE,
      triggerEventId: 'manual',
      entityType: 'product',
      entityId: 'product-1',
      entityJson: { id: 'product-1', name_en: 'Test', imageBase64s: ['data:image/png;base64,abc'] },
      source: { location: 'product_modal' },
    });
    const entity = ctx['entity'] as Record<string, unknown> | null;
    const entityJson = ctx['entityJson'] as Record<string, unknown> | null;
    expect(entity).not.toBeNull();
    expect(entity?.['id']).toBe('product-1');
    expect(entity?.['imageBase64s']).toBeUndefined();
    expect(entityJson).toEqual(entity);
    expect(ctx['productId']).toBe('product-1');
  });

  it('embeds sanitized entity snapshot for product_marketplace_copy_row', () => {
    const ctx = buildTriggerContext({
      triggerNode: TRIGGER_NODE,
      triggerEventId: 'manual',
      entityType: 'product',
      entityId: 'product-1',
      entityJson: {
        id: 'product-1',
        name_en: 'Test',
        imageBase64s: ['data:image/png;base64,abc'],
      },
      source: { location: 'product_marketplace_copy_row' },
    });
    const entity = ctx['entity'] as Record<string, unknown> | null;
    const entityJson = ctx['entityJson'] as Record<string, unknown> | null;

    expect(entity).not.toBeNull();
    expect(entity?.['id']).toBe('product-1');
    expect(entity?.['imageBase64s']).toBeUndefined();
    expect(entityJson).toEqual(entity);
    expect(ctx['productId']).toBe('product-1');
  });

  it('embeds sanitized entity snapshot for product_parameter_row', () => {
    const ctx = buildTriggerContext({
      triggerNode: TRIGGER_NODE,
      triggerEventId: 'manual',
      entityType: 'product',
      entityId: 'product-1',
      entityJson: {
        id: 'product-1',
        name_en: 'Test',
        imageBase64s: ['data:image/png;base64,abc'],
      },
      source: { location: 'product_parameter_row' },
    });
    const entity = ctx['entity'] as Record<string, unknown> | null;
    const entityJson = ctx['entityJson'] as Record<string, unknown> | null;

    expect(entity).not.toBeNull();
    expect(entity?.['id']).toBe('product-1');
    expect(entity?.['imageBase64s']).toBeUndefined();
    expect(entityJson).toEqual(entity);
    expect(ctx['productId']).toBe('product-1');
  });

  it('sets entity to null when entityJson is not provided', () => {
    const ctx = buildTriggerContext({
      triggerNode: TRIGGER_NODE,
      triggerEventId: 'manual',
      entityType: 'product',
      entityId: 'product-1',
      source: { location: 'product_modal' },
    });
    expect(ctx['entity']).toBeNull();
  });

  it('does not embed entity snapshots when trigger.entitySnapshotMode is never', () => {
    const ctx = buildTriggerContext({
      triggerNode: createTriggerNode('never'),
      triggerEventId: 'manual',
      entityType: 'product',
      entityId: 'product-1',
      entityJson: { id: 'product-1', name_en: 'Test' },
      source: { location: 'product_modal' },
    });

    expect(ctx['entity']).toBeNull();
    expect(ctx['entityJson']).toBeUndefined();
    expect(ctx['productId']).toBeUndefined();
  });

  it('always embeds entity snapshots when trigger.entitySnapshotMode is always', () => {
    const ctx = buildTriggerContext({
      triggerNode: createTriggerNode('always'),
      triggerEventId: 'manual',
      entityType: 'product',
      entityId: 'product-1',
      entityJson: { id: 'product-1', name_en: 'Test' },
      source: { location: 'product_list' },
    });

    expect(ctx['entity']).toEqual({ id: 'product-1', name_en: 'Test' });
    expect(ctx['entityJson']).toEqual(ctx['entity']);
    expect(ctx['productId']).toBe('product-1');
  });

  // ── extras field ─────────────────────────────────────────────────────────

  it('includes triggerLabel in extras', () => {
    const ctx = buildTriggerContext({
      triggerNode: TRIGGER_NODE,
      triggerEventId: 'manual',
      entityType: 'product',
      triggerLabel: 'Queue Description',
    });
    const extras = ctx['extras'] as Record<string, unknown>;
    expect(extras['triggerLabel']).toBe('Queue Description');
  });

  it('merges caller-provided extras with triggerLabel', () => {
    const ctx = buildTriggerContext({
      triggerNode: TRIGGER_NODE,
      triggerEventId: 'manual',
      entityType: 'product',
      triggerLabel: 'Run',
      extras: { mode: 'click', customKey: 'value' },
    });
    const extras = ctx['extras'] as Record<string, unknown>;
    expect(extras['triggerLabel']).toBe('Run');
    expect(extras['mode']).toBe('click');
    expect(extras['customKey']).toBe('value');
  });

  it('includes a timestamp field', () => {
    const ctx = buildTriggerContext({
      triggerNode: TRIGGER_NODE,
      triggerEventId: 'manual',
      entityType: 'product',
    });
    expect(typeof ctx['timestamp']).toBe('string');
    expect(new Date(ctx['timestamp'] as string).getTime()).toBeGreaterThan(0);
  });
});
