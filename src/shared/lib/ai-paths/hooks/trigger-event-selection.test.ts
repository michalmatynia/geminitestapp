import { describe, expect, it } from 'vitest';

import { selectTriggerCandidates, type TriggerSelectionCandidate } from './trigger-event-selection';

const cfg = (id: string, isActive = true): TriggerSelectionCandidate => ({ id, isActive });

describe('selectTriggerCandidates', () => {
  // ── preferred path found ──────────────────────────────────────────────────

  it('selects the preferred path when it is found in candidates', () => {
    const candidates = [cfg('path-a'), cfg('path-b'), cfg('path-c')];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: 'path-b',
      activePathId: null,
    });
    expect(result.selectedConfig?.id).toBe('path-b');
    expect(result.missingPreferredPathId).toBeNull();
    expect(result.usedSingleActiveFallback).toBe(false);
  });

  it('selects the preferred path even when it is inactive', () => {
    const candidates = [cfg('path-a', false), cfg('path-b')];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: 'path-a',
      activePathId: null,
    });
    expect(result.selectedConfig?.id).toBe('path-a');
    expect(result.missingPreferredPathId).toBeNull();
    expect(result.usedSingleActiveFallback).toBe(false);
  });

  // ── preferred path missing — single active fallback ───────────────────────

  it('falls back to the sole active candidate when preferred path is missing', () => {
    const candidates = [cfg('path-a', false), cfg('path-b')];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: 'path-missing',
      activePathId: null,
    });
    expect(result.selectedConfig?.id).toBe('path-b');
    expect(result.missingPreferredPathId).toBe('path-missing');
    expect(result.usedSingleActiveFallback).toBe(true);
  });

  // ── preferred path missing — multiple active, ambiguous ───────────────────

  it('returns null when preferred path is missing and multiple active candidates exist', () => {
    const candidates = [cfg('path-a'), cfg('path-b')];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: 'path-missing',
      activePathId: null,
    });
    expect(result.selectedConfig).toBeNull();
    expect(result.missingPreferredPathId).toBe('path-missing');
    expect(result.usedSingleActiveFallback).toBe(false);
  });

  // ── no preferred path — activePathId resolution ───────────────────────────

  it('selects the path matching activePathId when no preferred path is set', () => {
    const candidates = [cfg('path-a'), cfg('path-b'), cfg('path-c')];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: null,
      activePathId: 'path-c',
    });
    expect(result.selectedConfig?.id).toBe('path-c');
    expect(result.missingPreferredPathId).toBeNull();
    expect(result.usedSingleActiveFallback).toBe(false);
  });

  it('returns null when multiple active candidates exist and none matches activePathId', () => {
    const candidates = [cfg('path-a'), cfg('path-b')];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: null,
      activePathId: 'path-x',
    });
    expect(result.selectedConfig).toBeNull();
    expect(result.missingPreferredPathId).toBeNull();
  });

  // ── no preferred path — single active or no active ────────────────────────

  it('returns the single active candidate when no preferred or matching active path exists', () => {
    const candidates = [cfg('path-a', false), cfg('path-b')];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: null,
      activePathId: 'path-x',
    });
    expect(result.selectedConfig?.id).toBe('path-b');
  });

  it('returns the first candidate when no active candidates exist', () => {
    const candidates = [cfg('path-a', false), cfg('path-b', false)];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: null,
      activePathId: null,
    });
    expect(result.selectedConfig?.id).toBe('path-a');
  });

  it('returns null for an empty candidates list', () => {
    const result = selectTriggerCandidates({
      triggerCandidates: [],
      preferredPathId: null,
      activePathId: null,
    });
    expect(result.selectedConfig).toBeNull();
  });

  // ── activeTriggerCandidates surface ───────────────────────────────────────

  it('exposes only active candidates in activeTriggerCandidates', () => {
    const candidates = [cfg('path-a', false), cfg('path-b'), cfg('path-c')];
    const result = selectTriggerCandidates({
      triggerCandidates: candidates,
      preferredPathId: null,
      activePathId: null,
    });
    expect(result.activeTriggerCandidates.map((c) => c.id)).toEqual(['path-b', 'path-c']);
  });
});
