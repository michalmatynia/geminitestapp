import type { LogicalPatternCell, LogicalPatternTile } from '../logical-patterns-workshop-data';
import type { MultiSlottedRoundStateDto } from '../round-state-contracts';

export type RoundState = MultiSlottedRoundStateDto<LogicalPatternTile>;
export type BlankCell = Extract<LogicalPatternCell, { type: 'blank' }>;
