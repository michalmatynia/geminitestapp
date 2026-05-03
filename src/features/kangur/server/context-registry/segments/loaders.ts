import { getKangurAssignmentRepository } from '@/features/kangur/services/kangur-assignment-repository';
import { evaluateKangurAssignment } from '@/features/kangur/services/kangur-assignments';
import { getKangurLearnerById } from '@/features/kangur/services/kangur-learner-repository';
import { getKangurLessonDocumentRepository } from '@/features/kangur/services/kangur-lesson-document-repository';
import { getKangurLessonRepository } from '@/features/kangur/services/kangur-lesson-repository';
import { getKangurProgressRepository } from '@/features/kangur/services/kangur-progress-repository';
import { getKangurScoreRepository } from '@/features/kangur/services/kangur-score-repository';
import {
  parseKangurTestQuestionStore,
} from '@/features/kangur/test-suites/questions';
import { parseKangurTestSuites } from '@/features/kangur/test-suites';
import {
  buildKangurLearnerProfileSnapshot,
  buildLessonMasteryInsights,
} from '@/features/kangur/ui/services/profile';
import {
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  KANGUR_TEST_SUITES_SETTING_KEY,
} from '@/features/kangur/shared/contracts/kangur-tests';
import { readKangurSettingValue } from '@/features/kangur/server';

import {
  KANGUR_AI_TUTOR_DAILY_GOAL_GAMES,
  KANGUR_AI_TUTOR_RECENT_SCORE_LIMIT,
  type KangurRegistryBaseData,
} from '../kangur-registry-types';
import {
  sortAssignments,
} from '../kangur-registry-transformers';

export const loadKangurRegistryBaseData = async (learnerId: string): Promise<KangurRegistryBaseData> => {
  const [
    learner,
    progressRepository,
    scoreRepository,
    assignmentRepository,
    lessonRepository,
    lessonDocumentRepository,
    rawTestSuites,
    rawTestQuestions,
  ] = await Promise.all([
    getKangurLearnerById(learnerId),
    getKangurProgressRepository(),
    getKangurScoreRepository(),
    getKangurAssignmentRepository(),
    getKangurLessonRepository(),
    getKangurLessonDocumentRepository(),
    readKangurSettingValue(KANGUR_TEST_SUITES_SETTING_KEY),
    readKangurSettingValue(KANGUR_TEST_QUESTIONS_SETTING_KEY),
  ]);
  const [progress, scores, assignments, lessons, lessonDocuments] = await Promise.all([
    progressRepository.getProgress(learnerId),
    scoreRepository.listScores({
      sort: '-created_date',
      limit: KANGUR_AI_TUTOR_RECENT_SCORE_LIMIT,
      filters: {
        learner_id: learnerId,
      },
    }),
    assignmentRepository.listAssignments({
      learnerKey: learnerId,
      includeArchived: false,
    }),
    lessonRepository.listLessons(),
    lessonDocumentRepository.listLessonDocuments(),
  ]);
  const testSuites = parseKangurTestSuites(rawTestSuites);
  const questionStore = parseKangurTestQuestionStore(rawTestQuestions);
  const snapshot = buildKangurLearnerProfileSnapshot({
    progress,
    scores,
    dailyGoalGames: KANGUR_AI_TUTOR_DAILY_GOAL_GAMES,
  });
  const evaluatedAssignments = assignments
    .map((assignment) =>
      evaluateKangurAssignment({
        assignment,
        progress,
        scores,
      })
    )
    .filter((assignment) => !assignment.archived)
    .sort(sortAssignments);
  return {
    learnerId,
    learnerDisplayName: learner?.displayName ?? null,
    ownerUserId: learner?.ownerUserId ?? null,
    progress,
    scores,
    snapshot,
    lessons,
    lessonsById: new Map(lessons.map((lesson) => [lesson.id, lesson])),
    lessonDocuments,
    testSuites,
    testSuitesById: new Map(testSuites.map((suite) => [suite.id, suite])),
    questionStore,
    evaluatedAssignments,
    activeAssignments: evaluatedAssignments.filter(
      (assignment) => assignment.progress.status !== 'completed'
    ),
    masteryInsights: buildLessonMasteryInsights(progress, 3),
  };
};
