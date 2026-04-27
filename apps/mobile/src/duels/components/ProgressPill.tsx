import type { KangurDuelSession, KangurDuelPlayer } from '@kangur/contracts/kangur-duels';
import React from 'react';
import { KangurMobilePill as Pill } from '../../shared/KangurMobileUi';
import { formatQuestionProgress, formatSpectatorQuestionProgress } from "../utils/duels-ui";

interface ProgressPillProps {
  duel: { player?: KangurDuelPlayer };
  session: KangurDuelSession;
  locale: string;
}

export function ProgressPill({ duel, session, locale }: ProgressPillProps): React.JSX.Element {
  return (
    <Pill
      label={
        duel.player !== undefined
          ? formatQuestionProgress(session, duel.player, locale)
          : formatSpectatorQuestionProgress(session, locale)
      }
      tone={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', textColor: '#1d4ed8' }}
    />
  );
}
