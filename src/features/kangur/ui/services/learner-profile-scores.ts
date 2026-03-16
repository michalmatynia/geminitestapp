import type { KangurScorePort, KangurScoreRecord } from '@/features/kangur/services/ports';
import { resolveKangurScoreSubject, type KangurLessonSubject } from '@/shared/contracts/kangur';

export const LEARNER_PROFILE_SCORE_FETCH_LIMIT = 120;

type LoadScopedKangurScoresInput = {
  learnerId?: string | null;
  playerName?: string | null;
  createdBy?: string | null;
  subject?: KangurLessonSubject;
  limit?: number;
  fallbackToAll?: boolean;
};

type LoadLearnerProfileScoresInput = {
  learnerId?: string | null;
  userName: string;
  userEmail: string;
  subject?: KangurLessonSubject;
  limit?: number;
};

const sortScoresByCreatedDateDesc = (left: KangurScoreRecord, right: KangurScoreRecord): number =>
  new Date(right.created_date).getTime() - new Date(left.created_date).getTime();

const dedupeScoresById = (scores: KangurScoreRecord[]): KangurScoreRecord[] => {
  const uniqueRows = new Map<string, KangurScoreRecord>();
  scores.forEach((score) => uniqueRows.set(score.id, score));
  return Array.from(uniqueRows.values()).sort(sortScoresByCreatedDateDesc);
};

export const loadScopedKangurScores = async (
  scorePort: KangurScorePort,
  input: LoadScopedKangurScoresInput
): Promise<KangurScoreRecord[]> => {
  const learnerId = input.learnerId?.trim() ?? '';
  const playerName = input.playerName?.trim() ?? '';
  const createdBy = input.createdBy?.trim() ?? '';
  const subject = input.subject;
  const limit = input.limit ?? LEARNER_PROFILE_SCORE_FETCH_LIMIT;
  if (learnerId.length === 0 && playerName.length === 0 && createdBy.length === 0) {
    if (!input.fallbackToAll) {
      return [];
    }

    const rows = await scorePort.filter(
      subject ? { subject } : {},
      '-created_date',
      limit
    );
    return [...rows]
      .filter((score) =>
        subject ? resolveKangurScoreSubject(score) === subject : true
      )
      .sort(sortScoresByCreatedDateDesc);
  }

  const [rowsByLearner, rowsByEmail, rowsByName] = await Promise.all([
    learnerId.length > 0
      ? scorePort.filter(
          { learner_id: learnerId, ...(subject ? { subject } : {}) },
          '-created_date',
          limit
        )
      : Promise.resolve([]),
    createdBy.length > 0
      ? scorePort.filter(
          { created_by: createdBy, ...(subject ? { subject } : {}) },
          '-created_date',
          limit
        )
      : Promise.resolve([]),
    playerName.length > 0
      ? scorePort.filter(
          { player_name: playerName, ...(subject ? { subject } : {}) },
          '-created_date',
          limit
        )
      : Promise.resolve([]),
  ]);

  const filtered = subject
    ? [...rowsByLearner, ...rowsByEmail, ...rowsByName].filter(
        (score) => resolveKangurScoreSubject(score) === subject
      )
    : [...rowsByLearner, ...rowsByEmail, ...rowsByName];
  return dedupeScoresById(filtered);
};

export const loadLearnerProfileScores = async (
  scorePort: KangurScorePort,
  input: LoadLearnerProfileScoresInput
): Promise<KangurScoreRecord[]> =>
  loadScopedKangurScores(scorePort, {
    learnerId: input.learnerId,
    playerName: input.userName,
    createdBy: input.userEmail,
    subject: input.subject,
    limit: input.limit,
  });
