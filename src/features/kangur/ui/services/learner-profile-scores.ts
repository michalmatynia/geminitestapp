import type { KangurScorePort, KangurScoreRecord } from '@/features/kangur/services/ports';

export const LEARNER_PROFILE_SCORE_FETCH_LIMIT = 120;

type LoadScopedKangurScoresInput = {
  playerName?: string | null;
  createdBy?: string | null;
  limit?: number;
  fallbackToAll?: boolean;
};

type LoadLearnerProfileScoresInput = {
  userName: string;
  userEmail: string;
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
  const playerName = input.playerName?.trim() ?? '';
  const createdBy = input.createdBy?.trim() ?? '';
  const limit = input.limit ?? LEARNER_PROFILE_SCORE_FETCH_LIMIT;
  if (playerName.length === 0 && createdBy.length === 0) {
    if (!input.fallbackToAll) {
      return [];
    }

    const rows = await scorePort.filter({}, '-created_date', limit);
    return [...rows].sort(sortScoresByCreatedDateDesc);
  }

  const [rowsByEmail, rowsByName] = await Promise.all([
    createdBy.length > 0
      ? scorePort.filter({ created_by: createdBy }, '-created_date', limit)
      : Promise.resolve([]),
    playerName.length > 0
      ? scorePort.filter({ player_name: playerName }, '-created_date', limit)
      : Promise.resolve([]),
  ]);

  return dedupeScoresById([...rowsByEmail, ...rowsByName]);
};

export const loadLearnerProfileScores = async (
  scorePort: KangurScorePort,
  input: LoadLearnerProfileScoresInput
): Promise<KangurScoreRecord[]> =>
  loadScopedKangurScores(scorePort, {
    playerName: input.userName,
    createdBy: input.userEmail,
    limit: input.limit,
  });
