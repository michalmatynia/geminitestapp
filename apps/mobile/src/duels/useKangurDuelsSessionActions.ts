import { useState } from 'react';
import { shareKangurDuelInvite } from './duelInviteShare';
import { normalizeSeriesBestOf } from './utils/duels-ui';
import type { UseKangurMobileDuelSessionResult } from './useKangurMobileDuelSession';
import type { UseKangurMobileDuelsLobbyResult } from './useKangurMobileDuelsLobby';
import type { KangurMobileLocale, KangurMobileLocalizedValue } from '../i18n/kangurMobileI18n';

type DuelCopy = (value: KangurMobileLocalizedValue<string>) => string;

export function useKangurDuelsSessionActions(
  duel: UseKangurMobileDuelSessionResult,
  lobby: UseKangurMobileDuelsLobbyResult,
  locale: KangurMobileLocale,
  copy: DuelCopy,
  activeLearnerId: string | null,
  openSession: (id: string) => void,
) {
  const [inviteShareError, setInviteShareError] = useState<string | null>(null);

  const handleRematch = async (): Promise<void> => {
    if (duel.session === null || duel.isSpectating) return;

    const nextSeriesBestOf = normalizeSeriesBestOf(duel.session.series?.bestOf);
    const overrides = {
      difficulty: duel.session.difficulty,
      operation: duel.session.operation,
      seriesBestOf: nextSeriesBestOf,
    } as const;

    if (duel.session.visibility === 'private') {
      const opponentLearnerId =
        duel.session.players.find((player) => player.learnerId !== activeLearnerId)
          ?.learnerId ?? null;

      if (opponentLearnerId !== null) {
        const nextSessionId = await lobby.createPrivateChallenge(opponentLearnerId, overrides);
        if (nextSessionId !== null) openSession(nextSessionId);
      }
      return;
    }

    const nextSessionId =
      duel.session.mode === 'quick_match'
        ? await lobby.createQuickMatch(overrides)
        : await lobby.createPublicChallenge(overrides);
    if (nextSessionId !== null) openSession(nextSessionId);
  };

  const handleInviteShare = async (): Promise<void> => {
    if (duel.session === null || duel.player === null || duel.isSpectating) return;

    setInviteShareError(null);
    try {
      await shareKangurDuelInvite({
        locale,
        sessionId: duel.session.id,
        sharerDisplayName: duel.player.displayName,
      });
    } catch (error) {
      setInviteShareError(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : copy({
              de: 'Der Einladungslink konnte nicht geteilt werden.',
              en: 'Could not share the invite link.',
              pl: 'Nie udało się udostępnić linku do zaproszenia.',
            }),
      );
    }
  };

  return {
    inviteShareError,
    setInviteShareError,
    handleRematch,
    handleInviteShare,
  };
}
