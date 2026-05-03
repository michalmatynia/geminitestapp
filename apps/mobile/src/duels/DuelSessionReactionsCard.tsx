import React from 'react';
import { Text, View } from 'react-native';

import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { KangurMobileCard as Card } from '../shared/KangurMobileUi';
import { ActionButton, MessageCard } from './duels-primitives';
import type { KangurDuelReactionType } from '@kangur/contracts/kangur-duels';
import {
  DUEL_REACTION_OPTIONS,
} from './utils/duels-constants';
import {
  formatReactionLabel,
  formatRelativeAge,
} from './utils/duels-ui';
import { type UseKangurMobileDuelSessionResult as DuelSessionState } from './useKangurMobileDuelSession';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];

function ReactionRow({
  reaction,
  isSelf,
  locale,
}: {
  reaction: NonNullable<NonNullable<DuelSessionState['session']>['recentReactions']>[number];
  isSelf: boolean;
  locale: DuelLocale;
}): React.JSX.Element {
  return (
    <View
      key={reaction.id}
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: isSelf ? '#bfdbfe' : '#e2e8f0',
        backgroundColor: isSelf ? '#eff6ff' : '#f8fafc',
        gap: 6,
        padding: 12,
      }}
    >
      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
        {formatReactionLabel(reaction.type, locale)}
      </Text>
      <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
        {reaction.displayName} · {formatRelativeAge(reaction.createdAt, locale)}
      </Text>
    </View>
  );
}

function SendReactionsSection({
  isSpectating,
  isMutating,
  sendReaction,
  copy,
  locale,
}: {
  isSpectating: boolean;
  isMutating: boolean;
  sendReaction: DuelSessionState['sendReaction'];
  copy: DuelCopy;
  locale: DuelLocale;
}): React.JSX.Element {
  const subtitle = isSpectating
    ? copy({
        de: 'Sende eine schnelle Reaktion, während du das Duell beobachtest.',
        en: 'Send a quick reaction while watching the duel.',
        pl: 'Wyślij szybką reakcję podczas oglądania pojedynku.',
      })
    : copy({
        de: 'Sende eine schnelle Reaktion, ohne das Duell zu verlassen.',
        en: 'Send a quick reaction without leaving the duel.',
        pl: 'Wyślij szybką reakcję bez opuszczania pojedynku.',
      });

  return (
    <>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{subtitle}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {DUEL_REACTION_OPTIONS.map((type: KangurDuelReactionType) => (
          <ActionButton
            key={type}
            disabled={isMutating}
            label={formatReactionLabel(type, locale)}
            onPress={async () => {
              await sendReaction(type);
            }}
            tone='secondary'
          />
        ))}
      </View>
    </>
  );
}

function RecentReactionsList({
  reactions,
  playerLearnerId,
  locale,
}: {
  reactions: NonNullable<NonNullable<DuelSessionState['session']>['recentReactions']>;
  playerLearnerId: string | undefined;
  locale: DuelLocale;
}): React.JSX.Element {
  return (
    <View style={{ gap: 10 }}>
      {reactions
        .slice(-6)
        .reverse()
        .map((reaction) => (
          <ReactionRow
            key={reaction.id}
            isSelf={reaction.learnerId === playerLearnerId}
            locale={locale}
            reaction={reaction}
          />
        ))}
    </View>
  );
}

function FinishedMessage({ copy }: { copy: DuelCopy }): React.JSX.Element {
  return (
    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
      {copy({
        de: 'Die Sitzung ist beendet, aber die letzten Reaktionen bleiben weiter unten sichtbar.',
        en: 'The session is finished, but the latest reactions remain visible below.',
        pl: 'Sesja jest zakończona, ale ostatnie reakcje nadal widać poniżej.',
      })}
    </Text>
  );
}

function AuthRequiredMessage({ copy }: { copy: DuelCopy }): React.JSX.Element {
  return (
    <MessageCard
      title={copy({
        de: 'Reaktionen nur für angemeldete Nutzer',
        en: 'Reactions for signed-in users',
        pl: 'Reakcje dla zalogowanych',
      })}
      description={copy({
        de: 'Ein angemeldeter Lernender kann live mit Emojis auf den Duellverlauf reagieren.',
        en: 'A signed-in learner can react to the duel live with emoji.',
        pl: 'Zalogowany uczeń może reagować na przebieg pojedynku emotkami na żywo.',
      })}
    />
  );
}

function NoReactionsMessage({ copy }: { copy: DuelCopy }): React.JSX.Element {
  return (
    <MessageCard
      title={copy({
        de: 'Keine Reaktionen',
        en: 'No reactions',
        pl: 'Brak reakcji',
      })}
      description={copy({
        de: 'Nach dem ersten Emoji erscheint die Reaktionshistorie hier.',
        en: 'After the first emoji, the reaction history will appear here.',
        pl: 'Po pierwszej emotce historia reakcji pojawi się tutaj.',
      })}
    />
  );
}

export function DuelSessionReactionsCard({
  copy,
  duel,
  locale,
}: {
  copy: DuelCopy;
  duel: DuelSessionState;
  locale: DuelLocale;
}): React.JSX.Element {
  const { session } = duel;

  if (session === null) {
    return <></>;
  }

  const isFinished = session.status === 'completed' || session.status === 'aborted';

  let sectionContent: React.JSX.Element;
  if (isFinished) {
    sectionContent = <FinishedMessage copy={copy} />;
  } else if (!duel.isAuthenticated) {
    sectionContent = <AuthRequiredMessage copy={copy} />;
  } else {
    sectionContent = (
      <SendReactionsSection
        copy={copy}
        isMutating={duel.isMutating}
        isSpectating={duel.isSpectating}
        locale={locale}
        sendReaction={duel.sendReaction}
      />
    );
  }

  return (
    <Card>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {copy({
          de: 'Reaktionen',
          en: 'Reactions',
          pl: 'Reakcje',
        })}
      </Text>

      {sectionContent}

      {(session.recentReactions !== undefined && session.recentReactions.length > 0) ? (
        <RecentReactionsList
          locale={locale}
          playerLearnerId={duel.player?.learnerId}
          reactions={session.recentReactions}
        />
      ) : (
        <NoReactionsMessage copy={copy} />
      )}
    </Card>
  );
}
