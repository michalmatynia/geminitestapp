import type React from 'react';
import { useState } from 'react';
import { shareKangurDuelInvite } from './duelInviteShare';
import { normalizeSeriesBestOf } from './utils/duels-ui';
import type { UseKangurMobileDuelSessionResult } from './useKangurMobileDuelSession';
import type { UseKangurMobileDuelsLobbyResult } from './useKangurMobileDuelsLobby';
import type { KangurMobileLocale, KangurMobileLocalizedValue } from '../i18n/kangurMobileI18n';

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

function resolveRematchOverrides(session: any) {
  return {
    difficulty: session.difficulty,
    operation: session.operation,
    seriesBestOf: normalizeSeriesBestOf(session.series?.bestOf),
  } as const;
}

export function useKangurDuelsSessionActions({
  duel,
  lobby,
  locale,
  copy,
  activeLearnerId,
  openSession,
}: UseKangurDuelsSessionActionsOptions): UseKangurDuelsSessionActionsResult {
  const [inviteShareError, setInviteShareError] = useState<string | null>(null);

  const handleRematch = async (): Promise<void> => {
    if (duel.session === null || duel.isSpectating) return;
    const overrides = resolveRematchOverrides(duel.session);

    if (duel.session.visibility === 'private') {
      const opponentId = duel.session.players.find((p) => p.learnerId !== activeLearnerId)?.learnerId ?? null;
      if (opponentId !== null) {
        const next = await lobby.createPrivateChallenge(opponentId, overrides);
        if (next !== null) openSession(next);
      }
      return;
    }

    const next = duel.session.mode === 'quick_match'
        ? await lobby.createQuickMatch(overrides)
        : await lobby.createPublicChallenge(overrides);
    if (next !== null) openSession(next);
  };

  const handleInviteShare = async (): Promise<void> => {
    if (duel.session === null || duel.player === null || duel.isSpectating) return;
    setInviteShareError(null);
    try {
      await shareKangurDuelInvite({ locale, sessionId: duel.session.id, sharerDisplayName: duel.player.displayName });
    } catch (err) {
      setInviteShareError(err instanceof Error && err.message.trim() !== '' ? err.message : copy({ de: 'Der Einladungslink konnte nicht geteilt werden.', en: 'Could not share the invite link.', pl: 'Nie udało się udostępnić linku do zaproszenia.' }));
    }
  };

  return { inviteShareError, setInviteShareError, handleRematch, handleInviteShare };
}
