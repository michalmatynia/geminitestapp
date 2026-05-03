import { useState } from 'react';
import { shareKangurDuelInvite } from './duelInviteShare';
import { normalizeSeriesBestOf } from './utils/duels-ui';
import type { UseKangurMobileDuelSessionResult } from './useKangurMobileDuelSession';
import type { UseKangurMobileDuelsLobbyResult } from './useKangurMobileDuelsLobby';
import type { KangurMobileLocale, KangurMobileLocalizedValue } from '../i18n/kangurMobileI18n';
import type React from 'react';

type DuelCopy = (value: KangurMobileLocalizedValue<string>) => string;

export type UseKangurDuelsSessionActionsResult = {
  inviteShareError: string | null;
  setInviteShareError: React.Dispatch<React.SetStateAction<string | null>>;
  handleRematch: () => Promise<void>;
  handleInviteShare: () => Promise<void>;
};

export interface UseKangurDuelsSessionActionsOptions {
  duel: UseKangurMobileDuelSessionResult;
  lobby: UseKangurMobileDuelsLobbyResult;
  locale: KangurMobileLocale;
  copy: DuelCopy;
  activeLearnerId: string | null;
  openSession: (id: string) => void;
}

interface RematchOverrides {
  difficulty: KangurDuelDifficulty;
  operation: KangurDuelOperation;
  seriesBestOf: number;
}

function resolveRematchOverrides(session: KangurDuelSession): RematchOverrides {
  return {
    difficulty: session.difficulty,
    operation: session.operation,
    seriesBestOf: normalizeSeriesBestOf(session.series?.bestOf),
  };
}

import type { KangurDuelSession, KangurDuelDifficulty, KangurDuelOperation } from '@kangur/contracts/kangur-duels';

interface RematchOverrides {
  difficulty: KangurDuelDifficulty;
  operation: KangurDuelOperation;
  seriesBestOf: number;
}

interface RematchSessionOptions {
  duel: { session: KangurDuelSession };
  lobby: UseKangurMobileDuelsLobbyResult;
  overrides: RematchOverrides;
  activeLearnerId: string | null;
  openSession: (id: string) => void;
}

async function createRematchSession({
  duel,
  lobby,
  overrides,
  activeLearnerId,
  openSession,
}: RematchSessionOptions): Promise<void> {
  const session = duel.session;
  if (session.visibility === 'private') {
    const opponentId = session.players.find((p) => p.learnerId !== activeLearnerId)?.learnerId ?? null;
    if (opponentId !== null) {
      const next = await lobby.createPrivateChallenge(opponentId, overrides);
      if (next !== null) openSession(next);
    }
  } else {
    const next = session.mode === 'quick_match'
      ? await lobby.createQuickMatch(overrides)
      : await lobby.createPublicChallenge(overrides);
    if (next !== null) openSession(next);
  }
}

export function useKangurDuelsSessionActions(options: UseKangurDuelsSessionActionsOptions): UseKangurDuelsSessionActionsResult {
  const [inviteShareError, setInviteShareError] = useState<string | null>(null);

  const handleRematch = async (): Promise<void> => {
    if (options.duel.session === null || options.duel.isSpectating) return;
    const overrides: RematchOverrides = resolveRematchOverrides(options.duel.session);
    await createRematchSession({ 
      duel: options.duel, 
      lobby: options.lobby, 
      overrides, 
      activeLearnerId: options.activeLearnerId, 
      openSession: options.openSession 
    });
  };

  const handleInviteShare = async (): Promise<void> => {
    if (options.duel.session === null || options.duel.player === null || options.duel.isSpectating) return;
    setInviteShareError(null);
    try {
      await shareKangurDuelInvite({ locale: options.locale, sessionId: options.duel.session.id, sharerDisplayName: options.duel.player.displayName });
    } catch (err: unknown) {
      setInviteShareError(err instanceof Error && err.message.trim() !== '' ? err.message : options.copy({ de: 'Der Einladungslink konnte nicht geteilt werden.', en: 'Could not share the invite link.', pl: 'Nie udało się udostępnić linku do zaproszenia.' }));
    }
  };

  return { inviteShareError, setInviteShareError, handleRematch, handleInviteShare };
}
export {};
