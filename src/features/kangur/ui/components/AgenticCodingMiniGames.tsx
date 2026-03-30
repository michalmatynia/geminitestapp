import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

import { AGENTIC_CODING_GAMES } from './AgenticCodingMiniGames.config';
import { AgenticDrawGame } from './AgenticCodingMiniGames.draw';
import { AgenticSequenceGame } from './AgenticCodingMiniGames.sequence';
import { AgenticSortGame } from './AgenticCodingMiniGames.sort';
import { AgenticTrimGame } from './AgenticCodingMiniGames.trim';
import type { AgenticCodingGameId } from './AgenticCodingMiniGames.types';

type MiniGameProps = {
  gameId: AgenticCodingGameId;
  accent?: KangurAccent;
};

export function AgenticCodingMiniGame({ gameId, accent }: MiniGameProps): React.JSX.Element {
  const config = AGENTIC_CODING_GAMES[gameId];
  const resolvedAccent = accent ?? config.accent;

  if (config.mode === 'sequence') {
    return <AgenticSequenceGame accent={resolvedAccent} config={config} />;
  }
  if (config.mode === 'draw') {
    return <AgenticDrawGame accent={resolvedAccent} config={config} />;
  }
  if (config.mode === 'trim') {
    return <AgenticTrimGame accent={resolvedAccent} config={config} />;
  }
  return <AgenticSortGame accent={resolvedAccent} config={config} />;
}
