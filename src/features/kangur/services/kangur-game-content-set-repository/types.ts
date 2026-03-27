import type {
  KangurGameContentSet,
  KangurGameContentSetId,
} from '@/shared/contracts/kangur-game-instances';
import type { KangurGameId } from '@/shared/contracts/kangur-games';

export type KangurGameContentSetListInput = {
  contentSetId?: KangurGameContentSetId;
  gameId?: KangurGameId;
};

export type KangurGameContentSetRepository = {
  listContentSets: (input?: KangurGameContentSetListInput) => Promise<KangurGameContentSet[]>;
  replaceContentSetsForGame: (
    gameId: KangurGameId,
    contentSets: KangurGameContentSet[]
  ) => Promise<KangurGameContentSet[]>;
};
