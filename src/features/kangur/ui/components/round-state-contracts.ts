type RecordSlottedRoundStateDto<
  TToken,
  TSlotValue,
  TSlotId extends string = string,
> = {
  pool: TToken[];
  slots: Record<TSlotId, TSlotValue>;
};

type BinnedRoundStateBaseDto<TToken, TBins> = {
  pool: TToken[];
  bins: TBins;
};

export type SlottedRoundStateDto<TToken, TSlotId extends string = string> =
  RecordSlottedRoundStateDto<TToken, TToken | null, TSlotId>;

export type SlottedRoundTokenExtractionDto<TToken, TSlotId extends string = string> = {
  token?: TToken;
  pool: TToken[];
  slots: Record<TSlotId, TToken | null>;
};

export type MultiSlottedRoundStateDto<TToken, TSlotId extends string = string> =
  RecordSlottedRoundStateDto<TToken, TToken[], TSlotId>;

export type BinnedRoundStateDto<TToken, TBinId extends string = string> = BinnedRoundStateBaseDto<
  TToken,
  Record<TBinId, TToken[]>
>;

export type PartialBinnedRoundStateDto<TToken, TBinId extends string = string> =
  BinnedRoundStateBaseDto<TToken, Partial<Record<TBinId, TToken[]>>>;

export type SingleSlotRoundStateDto<TToken> = {
  pool: TToken[];
  slot: TToken | null;
};
