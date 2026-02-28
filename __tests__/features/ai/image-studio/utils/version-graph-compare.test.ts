import { describe, expect, it } from 'vitest';

import { compareGenerationParams } from '@/shared/lib/ai/image-studio/utils/version-graph-compare';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

// ── Factory ──────────────────────────────────────────────────────────────────

const createSlot = (
  overrides: Partial<ImageStudioSlotRecord> & { id: string }
): ImageStudioSlotRecord => ({
  createdAt: '',
  updatedAt: null,
  projectId: 'project-1',
  name: overrides.id,
  folderPath: null,
  metadata: null,
  ...overrides,
});

// ── compareGenerationParams ──────────────────────────────────────────────────

describe('compareGenerationParams', () => {
  it('returns no rows when neither slot has params', () => {
    const slotA = createSlot({ id: 'a' });
    const slotB = createSlot({ id: 'b' });
    const rows = compareGenerationParams(slotA, slotB);
    expect(rows).toHaveLength(0);
  });

  it('returns rows with isDifferent=false when params match', () => {
    const slotA = createSlot({
      id: 'a',
      metadata: {
        generationParams: { prompt: 'hello world', model: 'gpt-4o' },
      },
    });
    const slotB = createSlot({
      id: 'b',
      metadata: {
        generationParams: { prompt: 'hello world', model: 'gpt-4o' },
      },
    });
    const rows = compareGenerationParams(slotA, slotB);

    const promptRow = rows.find((r) => r.field === 'Prompt');
    expect(promptRow).toBeDefined();
    expect(promptRow!.isDifferent).toBe(false);
    expect(promptRow!.valueA).toBe('hello world');
    expect(promptRow!.valueB).toBe('hello world');

    const modelRow = rows.find((r) => r.field === 'Model');
    expect(modelRow).toBeDefined();
    expect(modelRow!.isDifferent).toBe(false);
  });

  it('marks different prompts as isDifferent=true', () => {
    const slotA = createSlot({
      id: 'a',
      metadata: {
        generationParams: { prompt: 'a cat' },
      },
    });
    const slotB = createSlot({
      id: 'b',
      metadata: {
        generationParams: { prompt: 'a dog' },
      },
    });
    const rows = compareGenerationParams(slotA, slotB);

    const promptRow = rows.find((r) => r.field === 'Prompt')!;
    expect(promptRow.isDifferent).toBe(true);
    expect(promptRow.valueA).toBe('a cat');
    expect(promptRow.valueB).toBe('a dog');
  });

  it('shows null for missing params on one side', () => {
    const slotA = createSlot({
      id: 'a',
      metadata: {
        generationParams: { prompt: 'test', model: 'gpt-4o' },
      },
    });
    const slotB = createSlot({ id: 'b' }); // no metadata
    const rows = compareGenerationParams(slotA, slotB);

    const promptRow = rows.find((r) => r.field === 'Prompt')!;
    expect(promptRow.valueA).toBe('test');
    expect(promptRow.valueB).toBeNull();
    expect(promptRow.isDifferent).toBe(true);
  });

  it('includes role as Type field', () => {
    const slotA = createSlot({
      id: 'a',
      metadata: { role: 'generation' },
    });
    const slotB = createSlot({
      id: 'b',
      metadata: { role: 'merge' },
    });
    const rows = compareGenerationParams(slotA, slotB);

    const typeRow = rows.find((r) => r.field === 'Type')!;
    expect(typeRow.valueA).toBe('generation');
    expect(typeRow.valueB).toBe('merge');
    expect(typeRow.isDifferent).toBe(true);
  });

  it('filters out rows where both values are null', () => {
    const slotA = createSlot({
      id: 'a',
      metadata: { generationParams: { prompt: 'test' } },
    });
    const slotB = createSlot({
      id: 'b',
      metadata: { generationParams: { prompt: 'test' } },
    });
    const rows = compareGenerationParams(slotA, slotB);

    // Should not have Model, Timestamp, Run ID, Output # rows since both null
    const fieldNames = rows.map((r) => r.field);
    expect(fieldNames).toContain('Prompt');
    expect(fieldNames).not.toContain('Timestamp');
    expect(fieldNames).not.toContain('Run ID');
  });
});
