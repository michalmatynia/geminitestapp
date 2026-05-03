import type { KangurDuelDifficulty, KangurDuelMode, KangurDuelOperation, KangurDuelSeries, KangurDuelStatus } from '@kangur/contracts/kangur-duels';
import { Text, View } from 'react-native';

import { useKangurMobileI18n, type KangurMobileLocale } from '../../i18n/kangurMobileI18n';
import {
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';
import {
  formatDifficultyLabel,
  formatLobbySeriesSummary,
  formatModeLabel,
  formatOperationLabel,
  formatRelativeAge,
  formatSeriesTitle,
  getStatusTone,
} from '../utils/duels-ui';

type LobbyEntryCardProps = {
  action: React.ReactNode;
  actionLabel: string;
  description: string;
  entry: {
    createdAt: string;
    difficulty: KangurDuelDifficulty;
    host: {
      displayName: string;
      learnerId: string;
    };
    mode: KangurDuelMode;
    operation: KangurDuelOperation;
    questionCount: number;
    series?: KangurDuelSeries | null;
    sessionId: string;
    status: KangurDuelStatus;
    timePerQuestionSec: number;
    updatedAt: string;
  };
  locale: KangurMobileLocale;
};

function LobbyEntryPills({
  entry,
  locale,
}: {
  entry: LobbyEntryCardProps['entry'];
  locale: KangurMobileLocale;
}): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pill label={formatModeLabel(entry.mode, locale)} tone={getStatusTone(entry.status)} />
      <Pill
        label={formatOperationLabel(entry.operation, locale)}
        tone={{
          backgroundColor: '#eff6ff',
          borderColor: '#bfdbfe',
          textColor: '#1d4ed8',
        }}
      />
      <Pill
        label={formatDifficultyLabel(entry.difficulty, locale)}
        tone={{
          backgroundColor: '#fffbeb',
          borderColor: '#fde68a',
          textColor: '#b45309',
        }}
      />
      {entry.series ? (
        <Pill
          label={formatSeriesTitle(entry.series, locale)}
          tone={{
            backgroundColor: '#f5f3ff',
            borderColor: '#ddd6fe',
            textColor: '#6d28d9',
          }}
        />
      ) : null}
    </View>
  );
}

export function LobbyEntryCard({
  action,
  actionLabel,
  description,
  entry,
  locale,
}: LobbyEntryCardProps): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const relativeAgeLabel = formatRelativeAge(entry.updatedAt, locale);
  const lobbyEntrySummary = copy({
    de: `${entry.questionCount} Fragen · ${entry.timePerQuestionSec}s pro Frage · aktualisiert ${relativeAgeLabel}`,
    en: `${entry.questionCount} questions · ${entry.timePerQuestionSec}s per question · updated ${relativeAgeLabel}`,
    pl: `${entry.questionCount} pytań · ${entry.timePerQuestionSec}s na pytanie · aktualizacja ${relativeAgeLabel}`,
  });

  return (
    <View
      style={{
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ gap: 8 }}>
        <Text style={{ color: '#0f172a', fontSize: 17, fontWeight: '800' }}>
          {entry.host.displayName}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {description}
        </Text>
      </View>

      <LobbyEntryPills entry={entry} locale={locale} />

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {lobbyEntrySummary}
      </Text>
      {entry.series ? (
        <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
          {formatLobbySeriesSummary(entry.series, locale)}
        </Text>
      ) : null}

      <View style={{ gap: 8 }}>
        {action}
        <Text style={{ color: '#64748b', fontSize: 12 }}>{actionLabel}</Text>
      </View>
    </View>
  );
}
