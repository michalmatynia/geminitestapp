export type SlottedRoundStateDto<TToken, TSlotId extends string = string> = {
  pool: TToken[];
  slots: Record<TSlotId, TToken | null>;
};

export type SlottedRoundTokenExtractionDto<TToken, TSlotId extends string = string> = {
  token?: TToken;
  pool: TToken[];
  slots: Record<TSlotId, TToken | null>;
};

export type MultiSlottedRoundStateDto<TToken, TSlotId extends string = string> = {
  pool: TToken[];
  slots: Record<TSlotId, TToken[]>;
};

export type BinnedRoundStateDto<TToken, TBinId extends string = string> = {
  pool: TToken[];
  bins: Record<TBinId, TToken[]>;
};

export type PartialBinnedRoundStateDto<TToken, TBinId extends string = string> = {
  pool: TToken[];
  bins: Partial<Record<TBinId, TToken[]>>;
};

export type SingleSlotRoundStateDto<TToken> = {
  pool: TToken[];
  slot: TToken | null;
};
