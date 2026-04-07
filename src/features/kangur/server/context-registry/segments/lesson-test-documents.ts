import {
  KANGUR_CONTEXT_ROOT_IDS,
  KANGUR_RUNTIME_ENTITY_TYPES,
} from '@/features/kangur/context-registry/refs';
import {
  hasFullyPublishedQuestionSetForSuite,
  getPublishedQuestionsForSuite,
} from '@/features/kangur/test-suites/questions';
import { isLiveKangurTestSuite } from '@/features/kangur/test-suites';
import type {
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';
import type {
  KangurLessonMasteryEntry,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { KangurRegistryBaseData } from '../kangur-registry-types';
import {
  toAssignmentAction,
  toAssignmentItem,
  formatAssignmentSummary,
  buildOrderedLessonsForNavigation,
} from '../kangur-registry-transformers';
import {
  buildLessonNavigationSummary,
  buildLessonDocumentSnippets,
  buildLessonDocumentSnippetCards,
  findRelevantLessonAssignment,
} from '../kangur-registry-resolvers';
import {
  buildQuestionChoiceItems,
  buildQuestionChoiceSummary,
} from './test-summaries';
import { loadKangurRegistryBaseData } from './loaders';

export const buildKangurLessonContextRuntimeDocument = async (input: {
  learnerId: string;
  lessonId: string;
  context?: Pick<KangurAiTutorConversationContext, 'assignmentId'>;
  data?: KangurRegistryBaseData;
}): Promise<ContextRuntimeDocument | null> => {
  const data = input.data ?? (await loadKangurRegistryBaseData(input.learnerId));
  const lesson = data.lessonsById.get(input.lessonId) ?? null;
  if (!lesson) {
    return null;
  }
  const mastery: KangurLessonMasteryEntry | null =
    data.progress.lessonMastery[lesson.componentId] ?? null;
  const relevantAssignment = findRelevantLessonAssignment(lesson, data.evaluatedAssignments, input.context);
  const document = data.lessonDocuments[lesson.id] ?? null;
  const documentSnippets = buildLessonDocumentSnippets(document);
  const documentSnippetCards = buildLessonDocumentSnippetCards(document);
  const orderedLessons = buildOrderedLessonsForNavigation(data.lessons, data.evaluatedAssignments);
  const lessonIndex = orderedLessons.findIndex((candidate) => candidate.id === lesson.id);
  const previousLesson = lessonIndex > 0 ? orderedLessons[lessonIndex - 1] ?? null : null;
  const nextLesson =
    lessonIndex >= 0 && lessonIndex < orderedLessons.length - 1
      ? orderedLessons[lessonIndex + 1] ?? null
      : null;
  const navigationSummary = buildLessonNavigationSummary(previousLesson, nextLesson);
  const masterySummary = mastery
    ? `${lesson.title} mastery ${mastery.masteryPercent}% after ${mastery.attempts} attempts.`
    : `No mastery data yet for ${lesson.title}.`;
  const assignmentSummary = relevantAssignment
    ? formatAssignmentSummary(relevantAssignment, data.snapshot.averageAccuracy)
    : null;
  return {
    id: `runtime:kangur:lesson:${input.learnerId}:${input.lessonId}`,
    kind: 'runtime_document',
    entityType: KANGUR_RUNTIME_ENTITY_TYPES.lessonContext,
    title: lesson.title,
    summary: assignmentSummary ?? lesson.description,
    status: lesson.enabled ? 'active' : 'disabled',
    tags: ['kangur', 'lesson', 'ai-tutor'],
    relatedNodeIds: [...KANGUR_CONTEXT_ROOT_IDS.lessonContext],
    timestamps: {
      updatedAt: document?.updatedAt ?? mastery?.lastCompletedAt ?? null,
    },
    facts: {
      learnerId: input.learnerId,
      lessonId: lesson.id,
      lessonComponentId: lesson.componentId,
      title: lesson.title,
      description: lesson.description,
      masterySummary,
      ...(mastery
        ? {
          masteryPercent: mastery.masteryPercent,
          lessonAttempts: mastery.attempts,
          lessonCompletions: mastery.completions,
          lastCompletedAt: mastery.lastCompletedAt,
        }
        : {}),
      ...(assignmentSummary ? { assignmentSummary } : {}),
      ...(relevantAssignment
        ? {
          assignmentId: relevantAssignment.id,
          assignmentTitle: relevantAssignment.title,
          assignmentAction: toAssignmentAction(
            relevantAssignment,
            data.snapshot.averageAccuracy
          ),
        }
        : {}),
      ...(documentSnippets.length > 0
        ? { documentSummary: documentSnippets.join(' ') }
        : {}),
      ...(documentSnippetCards.length > 0
        ? { documentSnippetCards }
        : {}),
      ...(previousLesson
        ? {
          previousLessonId: previousLesson.id,
          previousLessonTitle: previousLesson.title,
        }
        : {}),
      ...(nextLesson
        ? {
          nextLessonId: nextLesson.id,
          nextLessonTitle: nextLesson.title,
        }
        : {}),
      ...(navigationSummary ? { navigationSummary } : {}),
    },
    sections: [
      {
        id: 'lesson_overview',
        kind: 'text',
        title: 'Lesson overview',
        text: [lesson.title, lesson.description].filter(Boolean).join('. '),
      },
      {
        id: 'lesson_mastery',
        kind: 'items',
        title: 'Lesson mastery',
        items: [
          {
            masteryPercent: mastery?.masteryPercent ?? null,
            attempts: mastery?.attempts ?? 0,
            completions: mastery?.completions ?? 0,
            lastCompletedAt: mastery?.lastCompletedAt ?? null,
          },
        ],
      },
      {
        id: 'lesson_assignment',
        kind: 'items',
        title: 'Related assignment',
        items: relevantAssignment
          ? [toAssignmentItem(relevantAssignment, data.snapshot.averageAccuracy)]
          : [],
      },
      {
        id: 'lesson_document',
        kind: 'text',
        title: 'Lesson content summary',
        text: documentSnippets.join('
'),
      },
      {
        id: 'lesson_navigation',
        kind: 'items',
        title: 'Lesson navigation',
        items: [
          ...(previousLesson
            ? [
              {
                direction: 'previous',
                lessonId: previousLesson.id,
                lessonComponentId: previousLesson.componentId,
                title: previousLesson.title,
              },
            ]
            : []),
          ...(nextLesson
            ? [
              {
                direction: 'next',
                lessonId: nextLesson.id,
                lessonComponentId: nextLesson.componentId,
                title: nextLesson.title,
              },
            ]
            : []),
        ],
      },
    ],
    provenance: {
      providerId: 'kangur',
      source: 'kangur-runtime-context',
    },
  };
};

export const buildKangurTestContextRuntimeDocument = async (input: {
  learnerId: string;
  suiteId: string;
  questionId?: string | null;
  answerRevealed?: boolean;
  data?: KangurRegistryBaseData;
}): Promise<ContextRuntimeDocument | null> => {
  const data = input.data ?? (await loadKangurRegistryBaseData(input.learnerId));
  const suite = data.testSuitesById.get(input.suiteId) ?? null;
  if (!suite || !isLiveKangurTestSuite(suite)) {
    return null;
  }
  if (!hasFullyPublishedQuestionSetForSuite(data.questionStore, suite.id)) {
    return null;
  }
  const questions = getPublishedQuestionsForSuite(data.questionStore, suite.id);
  if (questions.length === 0) {
    return null;
  }
  const currentQuestion = input.questionId
    ? questions.find((question) => question.id === input.questionId) ?? null
    : null;
  const currentQuestionIndex = currentQuestion
    ? questions.findIndex((question) => question.id === currentQuestion.id)
    : -1;
  const questionProgressLabel =
    currentQuestionIndex >= 0
      ? `Pytanie ${currentQuestionIndex + 1}/${questions.length}`
      : `Ukończono ${questions.length}/${questions.length}`;
  const answerRevealed = input.answerRevealed ?? false;
  return {
    id: `runtime:kangur:test:${input.learnerId}:${suite.id}:${input.questionId?.trim() || 'summary'}:${answerRevealed ? 'revealed' : 'active'}`,
    kind: 'runtime_document',
    entityType: KANGUR_RUNTIME_ENTITY_TYPES.testContext,
    title: suite.title,
    summary:
      currentQuestion && currentQuestionIndex >= 0
        ? `Active test question ${currentQuestionIndex + 1}/${questions.length}.`
        : suite.description || `Finished test suite with ${questions.length} questions.`,
    status: currentQuestion ? 'in_progress' : 'summary',
    tags: ['kangur', 'test', 'ai-tutor'],
    relatedNodeIds: [...KANGUR_CONTEXT_ROOT_IDS.testContext],
    facts: {
      learnerId: input.learnerId,
      suiteId: suite.id,
      title: suite.title,
      description: suite.description,
      questionId: currentQuestion?.id ?? null,
      currentQuestion: currentQuestion?.prompt ?? null,
      questionProgressLabel,
      answerRevealed,
      ...(currentQuestion
        ? {
          questionPointValue: currentQuestion.pointValue,
          questionChoicesSummary: buildQuestionChoiceSummary(currentQuestion),
        }
        : {}),
      ...(answerRevealed && currentQuestion
        ? {
          correctChoiceLabel: currentQuestion.correctChoiceLabel,
          correctChoiceText:
            currentQuestion.choices.find(
              (choice) => choice.label === currentQuestion.correctChoiceLabel
            )?.text ?? null,
        }
        : {}),
      ...(answerRevealed && currentQuestion?.explanation
        ? { revealedExplanation: currentQuestion.explanation }
        : {}),
    },
    sections: [
      {
        id: 'test_overview',
        kind: 'text',
        title: 'Test overview',
        text: [suite.title, suite.description].filter(Boolean).join('. '),
      },
      {
        id: 'current_question',
        kind: 'text',
        title: 'Current question',
        text: currentQuestion?.prompt ?? '',
      },
      {
        id: 'question_choices',
        kind: 'items',
        title: 'Question choices',
        items: currentQuestion ? buildQuestionChoiceItems(currentQuestion, answerRevealed) : [],
      },
      {
        id: 'question_review',
        kind: 'text',
        title: 'Question review',
        text:
          answerRevealed && currentQuestion
            ? [
              currentQuestion.explanation,
              `Correct choice: ${currentQuestion.correctChoiceLabel}.`,
            ]
              .filter(Boolean)
              .join(' ')
            : '',
      },
    ],
    provenance: {
      providerId: 'kangur',
      source: 'kangur-runtime-context',
    },
  };
};
