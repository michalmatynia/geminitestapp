import { Text, View } from 'react-native';
import type {
  KangurDuelOperation,
  KangurDuelDifficulty,
} from '@kangur/contracts/kangur-duels';

import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard as Card,
  KangurMobileFilterChip,
} from '../shared/KangurMobileUi';
import {
  ActionButton,
  MessageCard,
} from './duels-primitives';
import {
  DIFFICULTY_OPTIONS,
  OPERATION_OPTIONS,
  SERIES_BEST_OF_OPTIONS,
  formatDifficultyLabel,
  formatOperationLabel,
  formatSeriesBestOfLabel,
} from '../utils/duels-ui';
import { type UseKangurMobileDuelsLobbyResult as DuelLobbyState } from './useKangurMobileDuelsLobby';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];

type DuelLobbyPlayPanelProps = {
  copy: DuelCopy;
  lobby: DuelLobbyState;
  locale: DuelLocale;
  onOpenSession: (sessionId: string) => void;
  loginStartCallToAction: React.JSX.Element;
};

type OperationSelectorProps = {
  lobby: DuelLobbyState;
  locale: DuelLocale;
  copy: DuelCopy;
};

function OperationSelector({
  lobby,
  locale,
  copy,
}: OperationSelectorProps): React.JSX.Element {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: '#0f172a', fontWeight: '700' }}>
        {copy({
          de: 'Rechenart',
          en: 'Operation',
          pl: 'Działanie',
        })}
      </Text>
      <View style={{ flexDirection: 'column', gap: 8 }}>
        {(OPERATION_OPTIONS as ReadonlyArray<KangurDuelOperation>).map((option) => (
          <KangurMobileFilterChip
            key={option}
            fullWidth
            label={formatOperationLabel(option, locale)}
            onPress={() => {
              lobby.setOperation(option);
            }}
            selected={lobby.operation === option}
          />
        ))}
      </View>
    </View>
  );
}

type DifficultySelectorProps = {
  lobby: DuelLobbyState;
  locale: DuelLocale;
  copy: DuelCopy;
};

function DifficultySelector({
  lobby,
  locale,
  copy,
}: DifficultySelectorProps): React.JSX.Element {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: '#0f172a', fontWeight: '700' }}>
        {copy({
          de: 'Schwierigkeit',
          en: 'Difficulty',
          pl: 'Poziom',
        })}
      </Text>
      <View style={{ flexDirection: 'column', gap: 8 }}>
        {(DIFFICULTY_OPTIONS as ReadonlyArray<KangurDuelDifficulty>).map((option) => (
          <KangurMobileFilterChip
            key={option}
            fullWidth
            label={formatDifficultyLabel(option, locale)}
            onPress={() => {
              lobby.setDifficulty(option);
            }}
            selected={lobby.difficulty === option}
          />
        ))}
      </View>
    </View>
  );
}

type FormatSelectorProps = {
  lobby: DuelLobbyState;
  locale: DuelLocale;
  copy: DuelCopy;
};

function FormatSelector({
  lobby,
  locale,
  copy,
}: FormatSelectorProps): React.JSX.Element {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: '#0f172a', fontWeight: '700' }}>
        {copy({
          de: 'Format',
          en: 'Format',
          pl: 'Format',
        })}
      </Text>
      <View style={{ flexDirection: 'column', gap: 8 }}>
        {SERIES_BEST_OF_OPTIONS.map((option) => (
          <KangurMobileFilterChip
            key={`series-best-of-${option}`}
            fullWidth
            label={formatSeriesBestOfLabel(option, locale)}
            onPress={() => {
              lobby.setSeriesBestOf(option);
            }}
            selected={lobby.seriesBestOf === option}
          />
        ))}
      </View>
      <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
        {lobby.seriesBestOf === 1
          ? copy({
              de: 'Neue Herausforderungen erstellen ein einzelnes Match.',
              en: 'New challenges will create a single match.',
              pl: 'Nowe wyzwania utworzą pojedynczy mecz.',
            })
          : copy({
              de: `Neue Herausforderungen erstellen ${formatSeriesBestOfLabel(lobby.seriesBestOf, locale)}.`,
              en: `New challenges will create ${formatSeriesBestOfLabel(lobby.seriesBestOf, locale)}.`,
              pl: `Nowe wyzwania utworzą ${formatSeriesBestOfLabel(lobby.seriesBestOf, locale)}.`,
            })}
      </Text>
    </View>
  );
}

type ActionButtonsProps = {
  lobby: DuelLobbyState;
  copy: DuelCopy;
  onOpenSession: (sessionId: string) => void;
  loginStartCallToAction: React.JSX.Element;
};

function ActionButtons({
  lobby,
  copy,
  onOpenSession,
  loginStartCallToAction,
}: ActionButtonsProps): React.JSX.Element {
  if (!lobby.isAuthenticated) {
    return loginStartCallToAction;
  }

  return (
    <View style={{ gap: 8 }}>
      <ActionButton
        disabled={lobby.isActionPending}
        label={copy({
          de: 'Schnelles Match',
          en: 'Quick match',
          pl: 'Szybki mecz',
        })}
        onPress={async () => {
          const nextSessionId = await lobby.createQuickMatch();
          if (nextSessionId !== null) {
            onOpenSession(nextSessionId);
          }
        }}
        stretch
      />
      <ActionButton
        disabled={lobby.isActionPending}
        label={copy({
          de: 'Öffentliche Herausforderung',
          en: 'Public challenge',
          pl: 'Publiczne wyzwanie',
        })}
        onPress={async () => {
          const nextSessionId = await lobby.createPublicChallenge();
          if (nextSessionId !== null) {
            onOpenSession(nextSessionId);
          }
        }}
        stretch
        tone='secondary'
      />
    </View>
  );
}

export function DuelLobbyPlayPanel({
  copy,
  lobby,
  locale,
  onOpenSession,
  loginStartCallToAction,
}: DuelLobbyPlayPanelProps): React.JSX.Element {
  return (
    <Card>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {copy({
          de: 'Spielbereich',
          en: 'Play panel',
          pl: 'Panel gry',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Wähle Rechenart, Spielmodus und Schwierigkeitsgrad für das neue Duell.',
          en: 'Choose the operation, mode, and difficulty for the new duel.',
          pl: 'Wybierz działanie, tryb działań i poziom trudności dla nowego pojedynku.',
        })}
      </Text>

      <OperationSelector copy={copy} locale={locale} lobby={lobby} />
      <DifficultySelector copy={copy} locale={locale} lobby={lobby} />
      <FormatSelector copy={copy} locale={locale} lobby={lobby} />

      {lobby.actionError !== null ? (
        <MessageCard
          title={copy({
            de: 'Aktion fehlgeschlagen',
            en: 'Action failed',
            pl: 'Akcja nie powiodła się',
          })}
          description={lobby.actionError}
          tone='error'
        />
      ) : null}

      <ActionButtons
        copy={copy}
        lobby={lobby}
        loginStartCallToAction={loginStartCallToAction}
        onOpenSession={onOpenSession}
      />
    </Card>
  );
}
