import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  loadKangurRegistryBaseDataMock,
  buildKangurLearnerSnapshotRuntimeDocumentMock,
  buildKangurLoginActivityRuntimeDocumentMock,
  buildKangurLessonContextRuntimeDocumentMock,
  buildKangurTestContextRuntimeDocumentMock,
  buildKangurAssignmentContextRuntimeDocumentMock,
} = vi.hoisted(() => ({
  loadKangurRegistryBaseDataMock: vi.fn(),
  buildKangurLearnerSnapshotRuntimeDocumentMock: vi.fn(),
  buildKangurLoginActivityRuntimeDocumentMock: vi.fn(),
  buildKangurLessonContextRuntimeDocumentMock: vi.fn(),
  buildKangurTestContextRuntimeDocumentMock: vi.fn(),
  buildKangurAssignmentContextRuntimeDocumentMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  loadKangurRegistryBaseData: loadKangurRegistryBaseDataMock,
  buildKangurLearnerSnapshotRuntimeDocument:
    buildKangurLearnerSnapshotRuntimeDocumentMock,
  buildKangurLoginActivityRuntimeDocument:
    buildKangurLoginActivityRuntimeDocumentMock,
  buildKangurLessonContextRuntimeDocument: buildKangurLessonContextRuntimeDocumentMock,
  buildKangurTestContextRuntimeDocument: buildKangurTestContextRuntimeDocumentMock,
  buildKangurAssignmentContextRuntimeDocument:
    buildKangurAssignmentContextRuntimeDocumentMock,
}));

import { kangurRuntimeContextProvider } from '@/features/ai/ai-context-registry/services/runtime-providers/kangur';
import {
  createKangurAssignmentContextRef,
  createKangurLearnerSnapshotRef,
  createKangurLessonContextRef,
  createKangurLoginActivityRef,
  createKangurTestContextRef,
} from '@/features/kangur/context-registry/refs';

const createRuntimeDocument = (entityType: string, id: string) => ({
  id,
  kind: 'runtime_document' as const,
  entityType,
  title: id,
  summary: id,
  status: 'active',
  tags: ['kangur', 'test'],
  relatedNodeIds: [],
  sections: [],
  provenance: {
    providerId: 'kangur',
    source: 'test',
  },
});

describe('kangurRuntimeContextProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const baseData = {
      learnerId: 'learner-1',
      snapshot: {
        averageAccuracy: 74,
      },
    };

    loadKangurRegistryBaseDataMock.mockResolvedValue(baseData);
    buildKangurLearnerSnapshotRuntimeDocumentMock.mockImplementation(async ({ learnerId }) =>
      createRuntimeDocument('kangur_learner_snapshot', `runtime:kangur:learner:${learnerId}`)
    );
    buildKangurLoginActivityRuntimeDocumentMock.mockImplementation(async ({ learnerId }) =>
      createRuntimeDocument(
        'kangur_login_activity',
        `runtime:kangur:login-activity:${learnerId}`
      )
    );
    buildKangurLessonContextRuntimeDocumentMock.mockImplementation(
      async ({ learnerId, lessonId }) =>
        createRuntimeDocument(
          'kangur_lesson_context',
          `runtime:kangur:lesson:${learnerId}:${lessonId}`
        )
    );
    buildKangurTestContextRuntimeDocumentMock.mockImplementation(
      async ({ learnerId, suiteId, questionId, answerRevealed }) =>
        createRuntimeDocument(
          'kangur_test_context',
          `runtime:kangur:test:${learnerId}:${suiteId}:${questionId ?? 'summary'}:${answerRevealed ? 'revealed' : 'active'}`
        )
    );
    buildKangurAssignmentContextRuntimeDocumentMock.mockImplementation(
      async ({ learnerId, assignmentId }) =>
        createRuntimeDocument(
          'kangur_assignment_context',
          `runtime:kangur:assignment:${learnerId}:${assignmentId}`
        )
    );
  });

  it('infers Kangur runtime refs from the lightweight tutor descriptor', () => {
    const input = {
      kangurRuntime: {
        learnerId: 'learner-1',
        surface: 'lesson',
        contentId: 'adding',
        assignmentId: 'assignment-1',
      },
    };

    expect(kangurRuntimeContextProvider.canInferRefs(input)).toBe(true);
    expect(kangurRuntimeContextProvider.inferRefs(input)).toEqual([
      createKangurLearnerSnapshotRef('learner-1'),
      createKangurLoginActivityRef('learner-1'),
      createKangurLessonContextRef('learner-1', 'adding'),
      createKangurAssignmentContextRef('learner-1', 'assignment-1'),
    ]);
  });

  it('includes question identity and reveal state when inferring test refs', () => {
    const input = {
      kangurRuntime: {
        learnerId: 'learner-1',
        surface: 'test',
        contentId: 'suite-2026',
        questionId: 'q-7',
        answerRevealed: true,
      },
    };

    expect(kangurRuntimeContextProvider.inferRefs(input)).toEqual([
      createKangurLearnerSnapshotRef('learner-1'),
      createKangurLoginActivityRef('learner-1'),
      createKangurTestContextRef({
        learnerId: 'learner-1',
        suiteId: 'suite-2026',
        questionId: 'q-7',
        answerRevealed: true,
      }),
    ]);
  });

  it('loads canonical Kangur data once per learner and reuses it across resolved refs', async () => {
    const refs = [
      createKangurLearnerSnapshotRef('learner-1'),
      createKangurLoginActivityRef('learner-1'),
      createKangurLessonContextRef('learner-1', 'adding'),
      createKangurAssignmentContextRef('learner-1', 'assignment-1'),
    ];

    const documents = await kangurRuntimeContextProvider.resolveRefs(refs);

    expect(loadKangurRegistryBaseDataMock).toHaveBeenCalledTimes(1);
    expect(loadKangurRegistryBaseDataMock).toHaveBeenCalledWith('learner-1');
    expect(buildKangurLearnerSnapshotRuntimeDocumentMock).toHaveBeenCalledWith({
      learnerId: 'learner-1',
      data: expect.objectContaining({
        learnerId: 'learner-1',
      }),
    });
    expect(buildKangurLessonContextRuntimeDocumentMock).toHaveBeenCalledWith({
      learnerId: 'learner-1',
      lessonId: 'adding',
      data: expect.objectContaining({
        learnerId: 'learner-1',
      }),
    });
    expect(buildKangurLoginActivityRuntimeDocumentMock).toHaveBeenCalledWith({
      learnerId: 'learner-1',
      data: expect.objectContaining({
        learnerId: 'learner-1',
      }),
    });
    expect(buildKangurAssignmentContextRuntimeDocumentMock).toHaveBeenCalledWith({
      learnerId: 'learner-1',
      assignmentId: 'assignment-1',
      data: expect.objectContaining({
        learnerId: 'learner-1',
      }),
    });
    expect(documents).toEqual([
      expect.objectContaining({
        entityType: 'kangur_learner_snapshot',
      }),
      expect.objectContaining({
        entityType: 'kangur_login_activity',
      }),
      expect.objectContaining({
        entityType: 'kangur_lesson_context',
      }),
      expect.objectContaining({
        entityType: 'kangur_assignment_context',
      }),
    ]);
  });
});
