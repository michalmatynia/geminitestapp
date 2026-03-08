import 'server-only';

import type {
  ContextRegistryRef,
  ContextRuntimeDocument,
  RuntimeContextProvider,
} from '@/shared/contracts/ai-context-registry';
import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';
import {
  buildKangurAiTutorContextRegistryRefs,
  KANGUR_RUNTIME_PROVIDER_ID,
  parseKangurRuntimeRef,
} from '@/features/kangur/context-registry/refs';
import {
  buildKangurAssignmentContextRuntimeDocument,
  buildKangurLearnerSnapshotRuntimeDocument,
  buildKangurLessonContextRuntimeDocument,
  buildKangurTestContextRuntimeDocument,
  loadKangurRegistryBaseData,
} from '@/features/kangur/server';

const PROVIDER_VERSION = '1';

type KangurRuntimeProviderInput = {
  learnerId: string;
  context: Pick<
    KangurAiTutorConversationContext,
    'surface' | 'contentId' | 'assignmentId' | 'questionId' | 'answerRevealed'
  >;
};

const readKangurRuntimeInput = (
  input: Record<string, unknown> | null
): KangurRuntimeProviderInput | null => {
  if (
    !input ||
    typeof input['kangurRuntime'] !== 'object' ||
    Array.isArray(input['kangurRuntime'])
  ) {
    return null;
  }

  const raw = input['kangurRuntime'] as Record<string, unknown>;
  const learnerId =
    typeof raw['learnerId'] === 'string' && raw['learnerId'].trim().length > 0
      ? raw['learnerId'].trim()
      : null;
  const surface = raw['surface'];
  const contentId =
    typeof raw['contentId'] === 'string' && raw['contentId'].trim().length > 0
      ? raw['contentId'].trim()
      : undefined;
  const assignmentId =
    typeof raw['assignmentId'] === 'string' && raw['assignmentId'].trim().length > 0
      ? raw['assignmentId'].trim()
      : undefined;
  const questionId =
    typeof raw['questionId'] === 'string' && raw['questionId'].trim().length > 0
      ? raw['questionId'].trim()
      : undefined;

  if (!learnerId || (surface !== 'lesson' && surface !== 'test')) {
    return null;
  }

  return {
    learnerId,
    context: {
      surface,
      ...(contentId ? { contentId } : {}),
      ...(assignmentId ? { assignmentId } : {}),
      ...(questionId ? { questionId } : {}),
      ...(typeof raw['answerRevealed'] === 'boolean'
        ? { answerRevealed: raw['answerRevealed'] }
        : {}),
    },
  };
};

export const kangurRuntimeContextProvider: RuntimeContextProvider = {
  id: KANGUR_RUNTIME_PROVIDER_ID,
  canInferRefs(input: Record<string, unknown> | null): boolean {
    return readKangurRuntimeInput(input) !== null;
  },
  inferRefs(input: Record<string, unknown>): ContextRegistryRef[] {
    const runtimeInput = readKangurRuntimeInput(input);
    if (!runtimeInput) {
      return [];
    }

    return buildKangurAiTutorContextRegistryRefs(runtimeInput);
  },
  canResolveRef(ref: ContextRegistryRef): boolean {
    return parseKangurRuntimeRef(ref) !== null;
  },
  async resolveRefs(refs: ContextRegistryRef[]): Promise<ContextRuntimeDocument[]> {
    const grouped = new Map<string, ContextRegistryRef[]>();

    refs.forEach((ref) => {
      const parsed = parseKangurRuntimeRef(ref);
      if (!parsed) {
        return;
      }
      const key = parsed.learnerId;
      const current = grouped.get(key) ?? [];
      current.push(ref);
      grouped.set(key, current);
    });

    const dataByLearnerId = new Map<
      string,
      Awaited<ReturnType<typeof loadKangurRegistryBaseData>>
    >();
    await Promise.all(
      [...grouped.keys()].map(async (learnerId) => {
        dataByLearnerId.set(learnerId, await loadKangurRegistryBaseData(learnerId));
      })
    );

    const documents = await Promise.all(
      [...grouped.entries()].flatMap(([learnerId, learnerRefs]) =>
        learnerRefs.map(async (ref) => {
          const parsed = parseKangurRuntimeRef(ref);
          if (!parsed) {
            return null;
          }

          const data = dataByLearnerId.get(learnerId);
          if (!data) {
            return null;
          }

          switch (parsed.kind) {
            case 'learner':
              return await buildKangurLearnerSnapshotRuntimeDocument({
                learnerId: parsed.learnerId,
                data,
              });
            case 'lesson':
              return await buildKangurLessonContextRuntimeDocument({
                learnerId: parsed.learnerId,
                lessonId: parsed.lessonId,
                data,
              });
            case 'test':
              return await buildKangurTestContextRuntimeDocument({
                learnerId: parsed.learnerId,
                suiteId: parsed.suiteId,
                questionId: parsed.questionId,
                answerRevealed: parsed.answerRevealed,
                data,
              });
            case 'assignment':
              return await buildKangurAssignmentContextRuntimeDocument({
                learnerId: parsed.learnerId,
                assignmentId: parsed.assignmentId,
                data,
              });
            default:
              return null;
          }
        })
      )
    );

    return documents.filter((document): document is ContextRuntimeDocument => Boolean(document));
  },
  getVersion(): string {
    return PROVIDER_VERSION;
  },
};
