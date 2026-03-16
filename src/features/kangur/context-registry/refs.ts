import type { ContextRegistryRef } from '@/shared/contracts/ai-context-registry';
import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';

export const KANGUR_RUNTIME_PROVIDER_ID = 'kangur';
export const KANGUR_RUNTIME_REF_PREFIX = 'runtime:kangur:';

export const KANGUR_CONTEXT_ROOT_IDS = {
  learnerSnapshot: [
    'page:kangur-learner-profile',
    'collection:kangur-progress',
    'collection:kangur-scores',
    'collection:kangur-assignments',
  ],
  loginActivity: ['collection:kangur-login-activity', 'action:kangur-ai-tutor-chat'],
  lessonContext: [
    'page:kangur-lessons',
    'collection:kangur-lessons',
    'collection:kangur-assignments',
    'action:kangur-ai-tutor-chat',
    'policy:kangur-ai-tutor-socratic',
  ],
  testContext: [
    'page:kangur-tests',
    'collection:kangur-test-suites',
    'action:kangur-ai-tutor-chat',
    'policy:kangur-ai-tutor-socratic',
    'policy:kangur-ai-tutor-test-guardrails',
  ],
  assignmentContext: [
    'page:kangur-parent-dashboard',
    'page:kangur-lessons',
    'page:kangur-game',
    'collection:kangur-assignments',
    'action:kangur-ai-tutor-chat',
  ],
} as const;

export const KANGUR_RUNTIME_ENTITY_TYPES = {
  learnerSnapshot: 'kangur_learner_snapshot',
  loginActivity: 'kangur_login_activity',
  lessonContext: 'kangur_lesson_context',
  testContext: 'kangur_test_context',
  assignmentContext: 'kangur_assignment_context',
} as const;

type KangurRuntimeRefParts =
  | { kind: 'learner'; learnerId: string }
  | { kind: 'loginActivity'; learnerId: string }
  | { kind: 'lesson'; learnerId: string; lessonId: string }
  | {
      kind: 'test';
      learnerId: string;
      suiteId: string;
      questionId: string | null;
      answerRevealed: boolean;
    }
  | { kind: 'assignment'; learnerId: string; assignmentId: string };

const encodeSegment = (value: string): string => encodeURIComponent(value.trim());
const decodeSegment = (value: string): string => decodeURIComponent(value);

const createRuntimeDocumentRef = (
  id: string,
  entityType: string
): ContextRegistryRef => ({
  id,
  kind: 'runtime_document',
  providerId: KANGUR_RUNTIME_PROVIDER_ID,
  entityType,
});

export const createKangurLearnerSnapshotRef = (learnerId: string): ContextRegistryRef =>
  createRuntimeDocumentRef(
    `${KANGUR_RUNTIME_REF_PREFIX}learner:${encodeSegment(learnerId)}`,
    KANGUR_RUNTIME_ENTITY_TYPES.learnerSnapshot
  );

export const createKangurLoginActivityRef = (learnerId: string): ContextRegistryRef =>
  createRuntimeDocumentRef(
    `${KANGUR_RUNTIME_REF_PREFIX}login-activity:${encodeSegment(learnerId)}`,
    KANGUR_RUNTIME_ENTITY_TYPES.loginActivity
  );

export const createKangurLessonContextRef = (
  learnerId: string,
  lessonId: string
): ContextRegistryRef =>
  createRuntimeDocumentRef(
    `${KANGUR_RUNTIME_REF_PREFIX}lesson:${encodeSegment(learnerId)}:${encodeSegment(lessonId)}`,
    KANGUR_RUNTIME_ENTITY_TYPES.lessonContext
  );

export const createKangurTestContextRef = (input: {
  learnerId: string;
  suiteId: string;
  questionId?: string | null;
  answerRevealed?: boolean | null;
}): ContextRegistryRef =>
  createRuntimeDocumentRef(
    `${KANGUR_RUNTIME_REF_PREFIX}test:${encodeSegment(input.learnerId)}:${encodeSegment(input.suiteId)}:${encodeSegment(input.questionId?.trim() || 'summary')}:${input.answerRevealed ? 'revealed' : 'active'}`,
    KANGUR_RUNTIME_ENTITY_TYPES.testContext
  );

export const createKangurAssignmentContextRef = (
  learnerId: string,
  assignmentId: string
): ContextRegistryRef =>
  createRuntimeDocumentRef(
    `${KANGUR_RUNTIME_REF_PREFIX}assignment:${encodeSegment(learnerId)}:${encodeSegment(assignmentId)}`,
    KANGUR_RUNTIME_ENTITY_TYPES.assignmentContext
  );

export const isKangurRuntimeRef = (ref: ContextRegistryRef): boolean =>
  ref.kind === 'runtime_document' &&
  ref.id.startsWith(KANGUR_RUNTIME_REF_PREFIX) &&
  (!ref.providerId || ref.providerId === KANGUR_RUNTIME_PROVIDER_ID);

export const parseKangurRuntimeRef = (ref: ContextRegistryRef): KangurRuntimeRefParts | null => {
  if (!isKangurRuntimeRef(ref)) {
    return null;
  }

  const raw = ref.id.slice(KANGUR_RUNTIME_REF_PREFIX.length);
  const parts = raw.split(':');
  const kind = parts[0];

  if (kind === 'learner' && parts.length >= 2) {
    const learnerId = decodeSegment(parts[1] ?? '');
    return learnerId ? { kind: 'learner', learnerId } : null;
  }

  if (kind === 'login-activity' && parts.length >= 2) {
    const learnerId = decodeSegment(parts[1] ?? '');
    return learnerId ? { kind: 'loginActivity', learnerId } : null;
  }

  if (kind === 'lesson' && parts.length >= 3) {
    const learnerId = decodeSegment(parts[1] ?? '');
    const lessonId = decodeSegment(parts[2] ?? '');
    return learnerId && lessonId ? { kind: 'lesson', learnerId, lessonId } : null;
  }

  if (kind === 'test' && parts.length >= 5) {
    const learnerId = decodeSegment(parts[1] ?? '');
    const suiteId = decodeSegment(parts[2] ?? '');
    const questionIdRaw = decodeSegment(parts[3] ?? '');
    const state = parts[4] ?? 'active';
    if (!learnerId || !suiteId) {
      return null;
    }
    return {
      kind: 'test',
      learnerId,
      suiteId,
      questionId: questionIdRaw && questionIdRaw !== 'summary' ? questionIdRaw : null,
      answerRevealed: state === 'revealed',
    };
  }

  if (kind === 'assignment' && parts.length >= 3) {
    const learnerId = decodeSegment(parts[1] ?? '');
    const assignmentId = decodeSegment(parts[2] ?? '');
    return learnerId && assignmentId ? { kind: 'assignment', learnerId, assignmentId } : null;
  }

  return null;
};

export const buildKangurAiTutorContextRegistryRefs = (input: {
  learnerId: string;
  context: Pick<
    KangurAiTutorConversationContext,
    'surface' | 'contentId' | 'assignmentId' | 'questionId' | 'answerRevealed'
  > | null | undefined;
}): ContextRegistryRef[] => {
  const refs: ContextRegistryRef[] = [
    createKangurLearnerSnapshotRef(input.learnerId),
    createKangurLoginActivityRef(input.learnerId),
  ];
  const contentId = input.context?.contentId?.trim();
  const assignmentId = input.context?.assignmentId?.trim();

  if (input.context?.surface === 'lesson' && contentId) {
    refs.push(createKangurLessonContextRef(input.learnerId, contentId));
  }

  if (input.context?.surface === 'test' && contentId) {
    refs.push(
      createKangurTestContextRef({
        learnerId: input.learnerId,
        suiteId: contentId,
        questionId: input.context.questionId ?? null,
        answerRevealed: input.context.answerRevealed ?? false,
      })
    );
  }

  if (assignmentId) {
    refs.push(createKangurAssignmentContextRef(input.learnerId, assignmentId));
  }

  const seen = new Set<string>();
  return refs.filter((ref) => {
    if (seen.has(ref.id)) {
      return false;
    }
    seen.add(ref.id);
    return true;
  });
};
