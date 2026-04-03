import { describe, expect, it } from 'vitest';

import {
  buildKangurAiTutorContextRegistryRefs,
  createKangurTestContextRef,
  parseKangurRuntimeRef,
} from './refs';

describe('kangur context-registry refs', () => {
  it('builds lesson refs plus assignment refs without duplicates', () => {
    const refs = buildKangurAiTutorContextRegistryRefs({
      learnerId: 'learner-1',
      context: {
        surface: 'lesson',
        contentId: 'lesson-7',
        assignmentId: 'assignment-9',
        questionId: null,
        answerRevealed: false,
      },
    });

    expect(refs.map((ref) => ref.id)).toEqual([
      'runtime:kangur:learner:learner-1',
      'runtime:kangur:login-activity:learner-1',
      'runtime:kangur:lesson:learner-1:lesson-7',
      'runtime:kangur:assignment:learner-1:assignment-9',
    ]);
  });

  it('builds test refs with summary fallback and revealed state', () => {
    const ref = createKangurTestContextRef({
      learnerId: 'learner 1',
      suiteId: 'suite/2',
      questionId: '   ',
      answerRevealed: true,
    });

    expect(ref.id).toBe('runtime:kangur:test:learner%201:suite%2F2:summary:revealed');
    expect(parseKangurRuntimeRef(ref)).toEqual({
      kind: 'test',
      learnerId: 'learner 1',
      suiteId: 'suite/2',
      questionId: null,
      answerRevealed: true,
    });
  });

  it('ignores blank content ids and still includes base refs', () => {
    const refs = buildKangurAiTutorContextRegistryRefs({
      learnerId: 'learner-2',
      context: {
        surface: 'test',
        contentId: '   ',
        assignmentId: '   ',
        questionId: 'question-1',
        answerRevealed: true,
      },
    });

    expect(refs.map((ref) => ref.id)).toEqual([
      'runtime:kangur:learner:learner-2',
      'runtime:kangur:login-activity:learner-2',
    ]);
  });
});
