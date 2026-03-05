import type {
  KangurScore as SharedKangurScore,
  KangurScoreCreateInput as SharedKangurScoreCreateInput,
} from '@/shared/contracts/kangur';

export type KangurRole = 'admin' | 'user';

export type KangurUser = {
  id: string;
  full_name: string;
  email: string | null;
  role: KangurRole;
};

export type KangurScoreRecord = SharedKangurScore;
export type KangurScoreCreateInput = SharedKangurScoreCreateInput;

export interface KangurAuthPort {
  me: () => Promise<KangurUser>;
  redirectToLogin: (returnUrl: string) => void;
  logout: (returnUrl?: string) => Promise<void>;
}

export interface KangurScorePort {
  create: (input: KangurScoreCreateInput) => Promise<KangurScoreRecord>;
  list: (sort?: string, limit?: number) => Promise<KangurScoreRecord[]>;
  filter: (
    criteria: Partial<KangurScoreRecord>,
    sort?: string,
    limit?: number
  ) => Promise<KangurScoreRecord[]>;
}

export interface KangurPlatform {
  auth: KangurAuthPort;
  score: KangurScorePort;
}
