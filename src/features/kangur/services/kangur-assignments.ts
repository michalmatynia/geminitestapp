import type { KangurAssignment, KangurAssignmentCreateInput, KangurAssignmentCreateTarget, KangurAssignmentProgress, KangurAssignmentSnapshot, KangurAssignmentTarget } from '@kangur/contracts/kangur-assignments';
import type { KangurProgressState, KangurScore } from '@kangur/contracts/kangur';

type BuildStoredAssignmentTargetInput = {
  target: KangurAssignmentCreateTarget;
  progress: KangurProgressState;
};

type EvaluateAssignmentInput = {
  assignment: KangurAssignment;
  progress: KangurProgressState;
  scores: KangurScore[];
};

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const formatAccuracyTarget = (value: number | null): string =>
  value === null ? 'bez progu skuteczności' : `cel ${value}%`;

export const buildStoredKangurAssignmentTarget = ({
  target,
  progress,
}: BuildStoredAssignmentTargetInput): KangurAssignmentTarget => {
  if (target.type === 'lesson') {
    return {
      ...target,
      baselineCompletions: progress.lessonMastery[target.lessonComponentId]?.completions ?? 0,
    };
  }

  return target;
};

export const buildKangurAssignmentDedupeKey = (
  target: KangurAssignmentCreateInput['target'] | KangurAssignmentTarget
): string => {
  if (target.type === 'lesson') {
    return `lesson:${target.lessonComponentId}:${target.requiredCompletions}`;
  }

  return `practice:${target.operation}:${target.requiredAttempts}:${target.minAccuracyPercent ?? 'na'}`;
};

const evaluateLessonAssignment = (
  assignment: KangurAssignment,
  progress: KangurProgressState
): KangurAssignmentProgress => {
  if (assignment.target.type !== 'lesson') {
    throw new Error('Expected lesson assignment target.');
  }

  const mastery = progress.lessonMastery[assignment.target.lessonComponentId];
  const baselineCompletions = assignment.target.baselineCompletions;
  const currentCompletions = mastery?.completions ?? 0;
  const completionsAfterAssignment = Math.max(0, currentCompletions - baselineCompletions);
  const attemptsRequired = assignment.target.requiredCompletions;
  const percent = clampPercent((completionsAfterAssignment / attemptsRequired) * 100);
  const status =
    completionsAfterAssignment <= 0
      ? 'not_started'
      : completionsAfterAssignment >= attemptsRequired
        ? 'completed'
        : 'in_progress';

  return {
    status,
    percent,
    attemptsCompleted: Math.min(completionsAfterAssignment, attemptsRequired),
    attemptsRequired,
    lastActivityAt: mastery?.lastCompletedAt ?? null,
    completedAt: status === 'completed' ? (mastery?.lastCompletedAt ?? assignment.updatedAt) : null,
    summary:
      status === 'completed'
        ? `Ukończono ${attemptsRequired}/${attemptsRequired} powtórek tej lekcji.`
        : `Powtórki po przydziale: ${completionsAfterAssignment}/${attemptsRequired}.`,
  };
};

const evaluatePracticeAssignment = (
  assignment: KangurAssignment,
  scores: KangurScore[]
): KangurAssignmentProgress => {
  if (assignment.target.type !== 'practice') {
    throw new Error('Expected practice assignment target.');
  }
  const target = assignment.target;

  const assignedAtMs = Date.parse(assignment.createdAt);
  const matchingScores = scores
    .filter((score) => score.operation === target.operation)
    .filter((score) => Date.parse(score.created_date) >= assignedAtMs)
    .sort((left, right) => Date.parse(right.created_date) - Date.parse(left.created_date));

  const attemptsCompleted = matchingScores.length;
  const attemptsRequired = target.requiredAttempts;
  const bestAccuracy = matchingScores.reduce((best, score) => {
    const totalQuestions = Math.max(1, score.total_questions || 1);
    const accuracy = Math.round((score.correct_answers / totalQuestions) * 100);
    return Math.max(best, accuracy);
  }, 0);
  const attemptProgress = attemptsCompleted / attemptsRequired;
  const accuracyProgress =
    target.minAccuracyPercent === null
      ? attemptProgress
      : bestAccuracy / Math.max(1, target.minAccuracyPercent);
  const percent = clampPercent(Math.min(1, Math.max(attemptProgress, accuracyProgress)) * 100);
  const meetsAttempts = attemptsCompleted >= attemptsRequired;
  const meetsAccuracy =
    target.minAccuracyPercent === null || bestAccuracy >= target.minAccuracyPercent;
  const status =
    attemptsCompleted === 0
      ? 'not_started'
      : meetsAttempts && meetsAccuracy
        ? 'completed'
        : 'in_progress';

  return {
    status,
    percent,
    attemptsCompleted: Math.min(attemptsCompleted, attemptsRequired),
    attemptsRequired,
    lastActivityAt: matchingScores[0]?.created_date ?? null,
    completedAt:
      status === 'completed' ? (matchingScores[0]?.created_date ?? assignment.updatedAt) : null,
    summary:
      target.minAccuracyPercent === null
        ? `Sesje po przydziale: ${attemptsCompleted}/${attemptsRequired}.`
        : `Sesje: ${attemptsCompleted}/${attemptsRequired} · najlepsza skuteczność ${bestAccuracy}% · ${formatAccuracyTarget(
          target.minAccuracyPercent
        )}.`,
  };
};

export const evaluateKangurAssignment = ({
  assignment,
  progress,
  scores,
}: EvaluateAssignmentInput): KangurAssignmentSnapshot => {
  const assignmentProgress =
    assignment.target.type === 'lesson'
      ? evaluateLessonAssignment(assignment, progress)
      : evaluatePracticeAssignment(assignment, scores);

  return {
    ...assignment,
    progress: assignmentProgress,
  };
};
