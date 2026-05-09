import {
  type KangurLearnerProfile,
  type KangurLearnerStatus,
} from '@kangur/contracts/kangur';
import { type KangurAiTutorLearnerMood } from '@/features/kangur/shared/contracts/kangur-ai-tutor-mood';

export const KANGUR_LEARNERS_SETTINGS_KEY = 'kangur_learners.v1';
export const KANGUR_LEARNERS_COLLECTION = 'kangur_learners';
export const KANGUR_LEARNERS_LOGIN_NAME_UNIQUE_INDEX = 'kangur_learners_login_name_unique';
export const DEFAULT_DUEL_SEARCH_CONTAINS_CAP = 3;
export const MAX_DUEL_SEARCH_CONTAINS_CAP = 20;

export type StoredKangurLearnerProfile = KangurLearnerProfile & {
  passwordHash: string;
};

export type MongoKangurLearnerDocument = {
  _id: string;
  id?: string;
  ownerUserId: string;
  displayName: string;
  age?: number | null;
  avatarId?: string | null;
  loginName: string;
  status: KangurLearnerStatus;
  legacyUserKey: string | null;
  aiTutor?: KangurAiTutorLearnerMood;
  createdAt: string;
  updatedAt: string;
  passwordHash: string;
};
