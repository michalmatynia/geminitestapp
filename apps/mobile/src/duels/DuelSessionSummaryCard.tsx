import { Text, View } from 'react-native';

import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard as Card,
} from '../shared/KangurMobileUi';
import {
  ActionButton,
} from './duels-primitives';
import {
  resolveWinnerSummary,
} from '../utils/duels-ui';
import { type UseKangurMobileDuelSessionResult as DuelSessionState } from './useKangurMobileDuelSession';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];

type DuelSessionSummaryCardProps = {
  copy: DuelCopy;
  duel: DuelSessionState;
  isFinishedSession: boolean;
  isLobbyActionPending: boolean;
  locale: DuelLocale;
  onHandleRematch: () => Promise<void>;
  onOpenLobby: () => void;
};

function RematchSection({
  copy,
  isLobbyActionPending,
  onHandleRematch,
  onOpenLobby,
}: {
  copy: DuelCopy;
  isLobbyActionPending: boolean;
  onHandleRematch: () => Promise<void>;
  onOpenLobby: () => void;
}): React.JSX.Element {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
        {copy({
          de: 'Das Rückspiel behält denselben Modus, dieselbe Rechenart, denselben Schwierigkeitsgrad und dasselbe Serienformat.',
          en: 'The rematch will keep the same mode, operation, difficulty, and series format.',
          pl: 'Rewanż zachowa ten sam tryb, działanie, poziom i format serii.',
        })}
      </Text>
      <ActionButton
        disabled={isLobbyActionPending}
        label={copy({
          de: 'Rückspiel starten',
          en: 'Play rematch',
          pl: 'Zagraj rewanż',
        })}
        onPress={onHandleRematch}
        stretch
      />
      <ActionButton
        label={copy({
          de: 'Zurück zur Lobby',
          en: 'Back to lobby',
          pl: 'Wróć do lobby',
        })}
        onPress={onOpenLobby}
        stretch
        tone='secondary'
      />
    </View>
  );
}

export function DuelSessionSummaryCard({
  copy,
  duel,
  isFinishedSession,
  isLobbyActionPending,
  locale,
  onHandleRematch,
  onOpenLobby,
}: DuelSessionSummaryCardProps): React.JSX.Element {
  const { session } = duel;

  if (!isFinishedSession || session === null) {
    return <></>;
  }

  return (
    <Card>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {copy({
          de: 'Zusammenfassung',
          en: 'Summary',
          pl: 'Podsumowanie',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {resolveWinnerSummary(session.players, locale)}
      </Text>
      {!duel.isSpectating && duel.isAuthenticated ? (
        <RematchSection
          copy={copy}
          isLobbyActionPending={isLobbyActionPending}
          onHandleRematch={onHandleRematch}
          onOpenLobby={onOpenLobby}
        />
      ) : (
        <ActionButton
          label={copy({
            de: 'Zurück zur Lobby',
            en: 'Back to lobby',
            pl: 'Wróć do lobby',
          })}
          onPress={onOpenLobby}
          stretch
        />
      )}
    </Card>
  );
}
