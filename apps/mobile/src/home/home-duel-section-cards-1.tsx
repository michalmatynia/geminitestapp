import type { KangurDuelLeaderboardEntry, KangurDuelLobbyEntry, KangurDuelLobbyPresenceEntry, KangurDuelOpponentEntry } from "@kangur/contracts/kangur-duels";
import { Text, View } from "react-native";
import { type Href } from "expo-router";
import { createKangurDuelsHref } from "../duels/duelsHref";
import { type useKangurMobileI18n, type KangurMobileLocale } from "../i18n/kangurMobileI18n";
import { formatKangurMobileScoreOperation } from "../scores/mobileScoreSummary";
import { OutlineLink, PrimaryButton } from "./homeScreenPrimitives";
import {
  formatHomeRelativeAge,
  getHomeDuelDifficultyLabel,
  getHomeDuelModeLabel,
  getHomeDuelSeriesLabel,
  getHomeDuelStatusLabel,
} from "./homeScreenLabels";

type HomeCopy = ReturnType<typeof useKangurMobileI18n>["copy"];
const DUELS_ROUTE = createKangurDuelsHref();
import type { KangurDuelLeaderboardEntry, KangurDuelLobbyEntry, KangurDuelLobbyPresenceEntry, KangurDuelOpponentEntry } from '@kangur/contracts/kangur-duels';
import { Text, View } from 'react-native';

import { createKangurDuelsHref } from '../duels/duelsHref';
import { type useKangurMobileI18n, type KangurMobileLocale } from '../i18n/kangurMobileI18n';
import { formatKangurMobileScoreOperation } from '../scores/mobileScoreSummary';
import { OutlineLink, PrimaryButton } from './homeScreenPrimitives';
import {
  formatHomeRelativeAge,
  getHomeDuelDifficultyLabel,
  getHomeDuelModeLabel,
  getHomeDuelSeriesLabel,
  getHomeDuelStatusLabel,
} from './homeScreenLabels';

type HomeCopy = ReturnType<typeof useKangurMobileI18n>['copy'];

const DUELS_ROUTE = createKangurDuelsHref();

function DuelInviteCardActions({
  invite,
  copy,
}: {
  invite: KangurDuelLobbyEntry;
  copy: HomeCopy;
}): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'column', gap: 8 }}>
      <OutlineLink
        href={createKangurDuelsHref({ joinSessionId: invite.sessionId })}
        hint={copy({
          de: `Nimmt die Einladung von ${invite.host.displayName} an.`,
          en: `Accepts the invite from ${invite.host.displayName}.`,
          pl: `Przyjmuje zaproszenie od ${invite.host.displayName}.`,
        })}
        label={`${copy({ de: 'Beitreten', en: 'Join', pl: 'Dołącz' })}: ${invite.host.displayName}`}
      />
      <OutlineLink
        href={DUELS_ROUTE}
        hint={copy({ de: 'Öffnet die Duell-Lobby.', en: 'Opens the duels lobby.', pl: 'Otwiera lobby pojedynków.' })}
        label={copy({ de: 'Lobby öffnen', en: 'Open lobby', pl: 'Otwórz lobby' })}
      />
    </View>
  );
}

export function DuelInviteCard({
  copy,
  invite,
  locale,
}: {
  copy: HomeCopy;
  invite: KangurDuelLobbyEntry;
  locale: KangurMobileLocale;
}): React.JSX.Element {
  return (
    <View style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 20, borderWidth: 1, gap: 8, padding: 14 }}>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>{invite.host.displayName}</Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {getHomeDuelModeLabel(invite.mode, locale)} • {formatKangurMobileScoreOperation(invite.operation, locale)} •{' '}
        {copy({ de: 'Stufe', en: 'level', pl: 'poziom' })} {getHomeDuelDifficultyLabel(invite.difficulty, locale)}
      </Text>
      <Text style={{ color: '#64748b' }}>
        {copy({
          de: `${invite.questionCount} Fragen • ${invite.timePerQuestionSec}s pro Frage • aktualisiert ${formatHomeRelativeAge(invite.updatedAt, locale)}`,
          en: `${invite.questionCount} questions • ${invite.timePerQuestionSec}s per question • updated ${formatHomeRelativeAge(invite.updatedAt, locale)}`,
          pl: `${invite.questionCount} pytań • ${invite.timePerQuestionSec}s na pytanie • aktualizacja ${formatHomeRelativeAge(invite.updatedAt, locale)}`,
        })}
      </Text>
      {invite.series ? <Text style={{ color: '#4338ca', lineHeight: 20 }}>{getHomeDuelSeriesLabel(invite.series, locale)}</Text> : null}
      <DuelInviteCardActions invite={invite} copy={copy} />
    </View>
  );
}

function OutgoingChallengeCardActions({
  entry,
  copy,
  isSharing,
  onShare,
}: {
  entry: KangurDuelLobbyEntry;
  copy: HomeCopy;
  isSharing: boolean;
  onShare: () => Promise<void>;
}): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'column', gap: 8 }}>
      <PrimaryButton
        disabled={isSharing}
        hint={copy({
          de: 'Teilt den direkten Einladungslink erneut.',
          en: 'Reshares the direct invite link.',
          pl: 'Udostępnia ponownie bezpośredni link do zaproszenia.',
        })}
        label={
          isSharing
            ? copy({ de: 'Link wird geteilt...', en: 'Sharing link...', pl: 'Udostępnianie linku...' })
            : copy({ de: 'Link teilen', en: 'Share link', pl: 'Udostępnij link' })
        }
        onPress={onShare}
      />
      <OutlineLink
        href={createKangurDuelsHref({ sessionId: entry.sessionId })}
        hint={copy({ de: 'Öffnet die private Duellsitzung.', en: 'Opens the private duel session.', pl: 'Otwiera prywatną sesję pojedynku.' })}
        label={copy({ de: 'Duell öffnen', en: 'Open duel', pl: 'Otwórz pojedynek' })}
      />
    </View>
  );
}

export function OutgoingChallengeCard({
  copy,
  entry,
  isSharing,
  locale,
  onShare,
}: {
  copy: HomeCopy;
  entry: KangurDuelLobbyEntry;
  isSharing: boolean;
  locale: KangurMobileLocale;
  onShare: () => Promise<void>;
}): React.JSX.Element {
  return (
    <View style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 20, borderWidth: 1, gap: 8, padding: 14 }}>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>{copy({ de: 'Private Herausforderung', en: 'Private challenge', pl: 'Prywatne wyzwanie' })}</Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {getHomeDuelModeLabel(entry.mode, locale)} • {formatKangurMobileScoreOperation(entry.operation, locale)} •{' '}
        {copy({ de: 'Stufe', en: 'level', pl: 'poziom' })} {getHomeDuelDifficultyLabel(entry.difficulty, locale)}
      </Text>
      <Text style={{ color: '#64748b' }}>
        {copy({
          de: `${entry.questionCount} Fragen • ${entry.timePerQuestionSec}s pro Frage • aktualisiert ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
          en: `${entry.questionCount} questions • ${entry.timePerQuestionSec}s per question • updated ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
          pl: `${entry.questionCount} pytań • ${entry.timePerQuestionSec}s na pytanie • aktualizacja ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
        })}
      </Text>
      {entry.series ? <Text style={{ color: '#4338ca', lineHeight: 20 }}>{getHomeDuelSeriesLabel(entry.series, locale)}</Text> : null}
      <OutgoingChallengeCardActions entry={entry} copy={copy} isSharing={isSharing} onShare={onShare} />
    </View>
  );
}

function ActiveRivalCardStatus({
  entry,
  copy,
  locale,
  isCurrentLearner,
}: {
  entry: KangurDuelLobbyPresenceEntry;
  copy: HomeCopy;
  locale: KangurMobileLocale;
  isCurrentLearner: boolean;
}): React.JSX.Element {
  return (
    <>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
        {entry.displayName}
        {isCurrentLearner
          ? copy({
              de: ' · Du',
              en: ' · You',
              pl: ' · Ty',
            })
          : ''}
      </Text>
      <Text style={{ color: '#64748b' }}>
        {copy({
          de: `Zuletzt aktiv ${formatHomeRelativeAge(entry.lastSeenAt, locale)}`,
          en: `Last active ${formatHomeRelativeAge(entry.lastSeenAt, locale)}`,
          pl: `Ostatnia aktywność ${formatHomeRelativeAge(entry.lastSeenAt, locale)}`,
        })}
      </Text>
    </>
  );
}

export function ActiveRivalCard({
  copy,
  entry,
  isCurrentLearner,
  isActionPending,
  isPending,
  locale,
  onChallenge,
}: {
  copy: HomeCopy;
  entry: KangurDuelLobbyPresenceEntry;
  isCurrentLearner: boolean;
  isActionPending: boolean;
  isPending: boolean;
  locale: KangurMobileLocale;
  onChallenge: (() => Promise<void>) | null;
}): React.JSX.Element {
  return (
    <View
      style={{
        backgroundColor: isCurrentLearner ? '#eff6ff' : '#f8fafc',
        borderColor: isCurrentLearner ? '#bfdbfe' : '#e2e8f0',
        borderRadius: 20,
        borderWidth: 1,
        gap: 8,
        padding: 14,
      }}
    >
      <ActiveRivalCardStatus entry={entry} copy={copy} locale={locale} isCurrentLearner={isCurrentLearner} />
      {!isCurrentLearner && onChallenge !== null ? (
        <PrimaryButton
          disabled={isActionPending}
          hint={copy({
            de: `Sendet sofort eine private Herausforderung an ${entry.displayName}.`,
            en: `Sends an immediate private challenge to ${entry.displayName}.`,
            pl: `Od razu wysyła prywatne wyzwanie do ${entry.displayName}.`,
          })}
          label={
            isPending
              ? copy({
                  de: 'Herausforderung wird gesendet...',
                  en: 'Sending challenge...',
                  pl: 'Wysyłanie wyzwania...',
                })
              : `${copy({
                  de: 'Herausfordern',
                  en: 'Challenge',
                  pl: 'Wyzwij',
                })}: ${entry.displayName}`
          }
          onPress={onChallenge}
        />
      ) : null}
    </View>
  );
}

function RecentOpponentCardActions({
  entry,
  copy,
  isPending,
  onRematch,
}: {
  entry: KangurDuelOpponentEntry;
  copy: HomeCopy;
  isPending: boolean;
  onRematch: () => Promise<void>;
}): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'column', gap: 8 }}>
      <PrimaryButton
        disabled={isPending}
        hint={copy({
          de: `Sendet einen schnellen privaten Rückkampf an ${entry.displayName}.`,
          en: `Sends a quick private rematch to ${entry.displayName}.`,
          pl: `Wysyła szybki prywatny rewanż do ${entry.displayName}.`,
        })}
        label={
          isPending
            ? copy({
                de: 'Rückkampf wird gesendet...',
                en: 'Sending rematch...',
                pl: 'Wysyłanie rewanżu...',
              })
            : copy({
                de: 'Schneller Rückkampf',
                en: 'Quick rematch',
                pl: 'Szybki rewanż',
              })
        }
        onPress={onRematch}
      />
      <OutlineLink
        href={DUELS_ROUTE}
        hint={copy({
          de: 'Öffnet die Duell-Lobby.',
          en: 'Opens the duels lobby.',
          pl: 'Otwiera lobby pojedynków.',
        })}
        label={copy({
          de: 'Lobby öffnen',
          en: 'Open lobby',
          pl: 'Otwórz lobby',
        })}
      />
    </View>
  );
}

export function RecentOpponentCard({
  copy,
  entry,
  isPending,
  locale,
  onRematch,
}: {
  copy: HomeCopy;
  entry: KangurDuelOpponentEntry;
  isPending: boolean;
  locale: KangurMobileLocale;
  onRematch: () => Promise<void>;
}): React.JSX.Element {
