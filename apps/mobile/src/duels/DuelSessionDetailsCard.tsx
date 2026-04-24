import { Text, View } from 'react-native';

import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard as Card,
  KangurMobilePill as Pill,
} from '../shared/KangurMobileUi';
import {
  MessageCard,
} from './duels-primitives';
import {
  formatDifficultyLabel,
  formatModeLabel,
  formatOperationLabel,
  formatQuestionProgress,
  formatRoundProgressLabel,
  formatSeriesTitle,
  formatSpectatorQuestionProgress,
  formatStatusLabel,
  getStatusTone,
} from './duels-utils';
import { type UseKangurMobileDuelSessionResult as DuelSessionState } from './useKangurMobileDuelSession';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];

type DuelSessionDetailsCardProps = {
  copy: DuelCopy;
  duel: DuelSessionState;
  hasWaitingSession: boolean;
  locale: DuelLocale;
  roundProgress: {
    total: number;
    completed: number;
    percentage: number;
    percent: number;
  } | null;
  sessionTimelineItems: string[];
};

function SessionTimeline({
  copy,
  items,
}: {
  copy: DuelCopy;
  items: string[];
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 8,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Zeitachse der Sitzung',
          en: 'Session timeline',
          pl: 'Oś sesji',
        })}
      </Text>
      <View style={{ gap: 6 }}>
        {items.map((item) => (
          <Text
            key={item}
            style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}
          >
            {item}
          </Text>
        ))}
      </View>
    </View>
  );
}

function RoundProgressBar({
  locale,
  roundProgress,
  status,
}: {
  locale: DuelLocale;
  roundProgress: NonNullable<DuelSessionDetailsCardProps['roundProgress']>;
  status: string;
}): React.JSX.Element {
  const isFinished = status === 'completed' || status === 'aborted';

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {formatRoundProgressLabel(roundProgress, locale)}
      </Text>
      <View
        style={{
          height: 10,
          width: '100%',
          borderRadius: 999,
          backgroundColor: '#e2e8f0',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${roundProgress.percent}%`,
            borderRadius: 999,
            backgroundColor: isFinished ? '#16a34a' : '#1d4ed8',
          }}
        />
      </View>
    </View>
  );
}

function DetailsHeader({
  session,
  copy,
  locale,
}: {
  session: NonNullable<DuelSessionState['session']>;
  copy: DuelCopy;
  locale: DuelLocale;
}): React.JSX.Element {
  let infoLabel = '';
  if (locale === 'de') {
    infoLabel = `${session.questionCount} Fragen · ${session.timePerQuestionSec}s pro Antwort · ${formatDifficultyLabel(session.difficulty, locale)}`;
  } else if (locale === 'en') {
    infoLabel = `${session.questionCount} questions · ${session.timePerQuestionSec}s per answer · ${formatDifficultyLabel(session.difficulty, locale)}`;
  } else {
    infoLabel = `${session.questionCount} pytań · ${session.timePerQuestionSec}s na odpowiedź · ${formatDifficultyLabel(session.difficulty, locale)}`;
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: `Sitzung ${session.id}`,
          en: `Session ${session.id}`,
          pl: `Sesja ${session.id}`,
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
        {formatModeLabel(session.mode, locale)} ·{' '}
        {formatOperationLabel(session.operation, locale)}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {infoLabel}
      </Text>
    </View>
  );
}

function DetailsPills({
  duel,
  copy,
  locale,
}: {
  duel: DuelSessionState;
  copy: DuelCopy;
  locale: DuelLocale;
}): React.JSX.Element {
  const { session } = duel;
  if (!session) return <></>;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pill
        label={formatStatusLabel(session.status, locale)}
        tone={getStatusTone(session.status)}
      />
      <Pill
        label={
          session.visibility === 'private'
            ? copy({ de: 'Privat', en: 'Private', pl: 'Prywatny' })
            : copy({ de: 'Öffentlich', en: 'Public', pl: 'Publiczny' })
        }
        tone={{
          backgroundColor: '#f8fafc',
          borderColor: '#cbd5e1',
          textColor: '#475569',
        }}
      />
      <Pill
        label={
          duel.player
            ? formatQuestionProgress(session, duel.player, locale)
            : formatSpectatorQuestionProgress(session, locale)
        }
        tone={{
          backgroundColor: '#eff6ff',
          borderColor: '#bfdbfe',
          textColor: '#1d4ed8',
        }}
      />
      {(duel.isSpectating || duel.spectatorCount > 0) ? (
        <Pill
          label={copy({
            de: `Zuschauer ${duel.spectatorCount}`,
            en: `Audience ${duel.spectatorCount}`,
            pl: `Widownia ${duel.spectatorCount}`,
          })}
          tone={{
            backgroundColor: '#f5f3ff',
            borderColor: '#ddd6fe',
            textColor: '#6d28d9',
          }}
        />
      ) : null}
      {session.series ? (
        <Pill
          label={formatSeriesTitle(session.series, locale)}
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

export function DuelSessionDetailsCard({
  copy,
  duel,
  hasWaitingSession,
  locale,
  roundProgress,
  sessionTimelineItems,
}: DuelSessionDetailsCardProps): React.JSX.Element {
  const { session } = duel;
  if (session === null) {
    return <></>;
  }

  const renderSpectatorMessage = (): React.JSX.Element => (
    <MessageCard
      title={copy({
        de: 'Zuschauermodus',
        en: 'Spectator mode',
        pl: 'Tryb obserwatora',
      })}
      description={
        duel.isAuthenticated
          ? copy({
              de: 'Du beobachtest das öffentliche Duell. Du kannst Reaktionen senden, beantwortest aber keine Fragen.',
              en: 'You are watching the public duel. You can send reactions, but you do not answer questions.',
              pl: 'Obserwujesz publiczny pojedynek. Możesz wysyłać reakcje, ale nie odpowiadasz na pytania.',
            })
          : copy({
              de: 'Du beobachtest das öffentliche Duell. Melde dich an, wenn du Reaktionen senden möchtest.',
              en: 'You are watching the public duel. Sign in if you want to send reactions.',
              pl: 'Obserwujesz publiczny pojedynek. Zaloguj się, jeśli chcesz wysyłać reakcje.',
            })
      }
    />
  );

  return (
    <Card>
      <DetailsHeader copy={copy} locale={locale} session={session} />
      <DetailsPills copy={copy} duel={duel} locale={locale} />

      {roundProgress !== null && !hasWaitingSession ? (
        <RoundProgressBar
          locale={locale}
          roundProgress={roundProgress}
          status={session.status}
        />
      ) : null}

      {sessionTimelineItems.length > 0 ? (
        <SessionTimeline copy={copy} items={sessionTimelineItems} />
      ) : null}

      {duel.isSpectating ? renderSpectatorMessage() : null}

      {duel.actionError !== null ? (
        <MessageCard
          title={copy({
            de: 'Aktion fehlgeschlagen',
            en: 'Action failed',
            pl: 'Akcja nie powiodła się',
          })}
          description={duel.actionError}
          tone='error'
        />
      ) : null}
    </Card>
  );
}
