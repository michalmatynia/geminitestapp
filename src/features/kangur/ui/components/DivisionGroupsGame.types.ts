export type TokenItem = {
  id: string;
  emoji: string;
  style: string;
};

export type Round = {
  dividend: number;
  divisor: number;
  quotient: number;
  remainder: number;
  tokens: TokenItem[];
};

export type GroupZoneId = `group-${number}`;
export type ZoneId = 'pool' | 'remainder' | GroupZoneId;

export type DivisionGroupsGameProps = {
  finishLabelVariant?: 'lesson' | 'topics';
  onFinish: () => void;
};
