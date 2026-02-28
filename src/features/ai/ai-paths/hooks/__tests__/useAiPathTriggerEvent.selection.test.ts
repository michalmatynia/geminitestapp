import { describe, expect, it } from 'vitest';

import { selectTriggerCandidates } from '@/shared/lib/ai-paths/hooks/useAiPathTriggerEvent';

type Candidate = {
  id: string;
  isActive?: boolean;
};

describe('selectTriggerCandidates', () => {
  it('excludes deactivated candidates from duplicate detection and default selection', () => {
    const candidates: Candidate[] = [
      { id: 'path-a', isActive: false },
      { id: 'path-b', isActive: true },
    ];

    const selection = selectTriggerCandidates<Candidate>({
      triggerCandidates: candidates,
      preferredPathId: null,
      activePathId: null,
    });

    expect(selection.activeTriggerCandidates.map((candidate: any) => candidate.id)).toEqual(['path-b']);
    expect(selection.selectedConfig?.id).toBe('path-b');
  });

  it('requires disambiguation when multiple active candidates exist and no active path is set', () => {
    const candidates: Candidate[] = [
      { id: 'path-a', isActive: true },
      { id: 'path-b', isActive: true },
      { id: 'path-c', isActive: false },
    ];

    const selection = selectTriggerCandidates<Candidate>({
      triggerCandidates: candidates,
      preferredPathId: null,
      activePathId: null,
    });

    expect(selection.activeTriggerCandidates).toHaveLength(2);
    expect(selection.selectedConfig).toBeNull();
  });

  it('honors bound preferred path without falling back to another active candidate', () => {
    const candidates: Candidate[] = [
      { id: 'path-a', isActive: false },
      { id: 'path-b', isActive: true },
    ];

    const selection = selectTriggerCandidates<Candidate>({
      triggerCandidates: candidates,
      preferredPathId: 'path-a',
      activePathId: null,
    });

    expect(selection.selectedConfig?.id).toBe('path-a');
  });

  it('returns null when preferred bound path is missing', () => {
    const candidates: Candidate[] = [{ id: 'path-a', isActive: true }];

    const selection = selectTriggerCandidates<Candidate>({
      triggerCandidates: candidates,
      preferredPathId: 'path-missing',
      activePathId: null,
    });

    expect(selection.selectedConfig).toBeNull();
  });

  it('selects the configured active path when it is active', () => {
    const candidates: Candidate[] = [
      { id: 'path-a', isActive: true },
      { id: 'path-b', isActive: true },
    ];

    const selection = selectTriggerCandidates<Candidate>({
      triggerCandidates: candidates,
      preferredPathId: null,
      activePathId: 'path-b',
    });

    expect(selection.selectedConfig?.id).toBe('path-b');
  });
});
