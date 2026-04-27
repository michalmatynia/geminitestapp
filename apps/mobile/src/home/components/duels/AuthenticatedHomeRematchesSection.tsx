import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKangurMobileI18n } from '../../../i18n/kangurMobileI18n';
import { useKangurMobileHomeDuelsRematches } from '../../useKangurMobileHomeDuelsRematches';
import { RecentOpponentCard } from '../../home-duel-section-cards';
import { PrimaryButton, OutlineLink, SectionCard } from '../../homeScreenPrimitives';
import { createKangurDuelsHref } from '../../../duels/duelsHref';
import { DeferredDuelSectionPlaceholder, DeferredDuelAdvancedSectionPlaceholder } from '../../HomeDuelSections';
import { formatKangurMobileScoreOperation } from '../../../scores/mobileScoreSummary';
import {
  MOBILE_DUEL_DEFAULT_DIFFICULTY,
  MOBILE_DUEL_DEFAULT_OPERATION,
  MOBILE_DUEL_DEFAULT_QUESTION_COUNT,
  MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC,
} from '../../../duels/mobileDuelDefaults';
import { getHomeDuelDifficultyLabel } from '../../homeScreenLabels';

const DUELS_ROUTE = createKangurDuelsHref();

type Props = {
  areDeferredHomeDuelAdvancedReady: boolean;
  areDeferredHomePanelsReady: boolean;
};

export function AuthenticatedHomeRematchesSection({
  areDeferredHomeDuelAdvancedReady,
  areDeferredHomePanelsReady,
}: Props): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const router = useRouter();
  const duelRematches = useKangurMobileHomeDuelsRematches({
    enabled: areDeferredHomeDuelAdvancedReady,
  });
  const openDuelSession = (sessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId }));
  };

  let content: React.ReactNode = null;

  if (!areDeferredHomePanelsReady) {
    content = <DeferredDuelSectionPlaceholder />;
  } else if (!areDeferredHomeDuelAdvancedReady) {
    content = <DeferredDuelAdvancedSectionPlaceholder />;
  } else if (duelRematches.isRestoringAuth || duelRematches.isLoading) {
    content = (
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Die letzten Rivalen werden geladen.',
          en: 'Loading recent opponents.',
          pl: 'Pobieramy ostatnich rywali.',
        })}
      </Text>
    );
  } else if (duelRematches.error !== null && duelRematches.error !== '') {
    content = (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
          {duelRematches.error}
        </Text>
        <PrimaryButton
          hint={copy({
            de: 'Aktualisiert die Liste der letzten Rivalen.',
            en: 'Refreshes the list of recent opponents.',
            pl: 'Odświeża listę ostatnich rywali.',
          })}
          label={copy({
            de: 'Rivalen aktualisieren',
            en: 'Refresh opponents',
            pl: 'Odśwież rywali',
          })}
          onPress={duelRematches.refresh}
        />
      </View>
    );
  } else if (duelRematches.opponents.length === 0) {
    content = (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Noch keine letzten Rivalen. Beende dein erstes Duell, damit hier schnelle Rückkämpfe erscheinen.',
            en: 'There are no recent opponents yet. Finish your first duel to unlock quick rematches here.',
            pl: 'Nie ma jeszcze ostatnich rywali. Zakończ pierwszy pojedynek, aby odblokować tutaj szybkie rewanże.',
          })}
        </Text>
        <OutlineLink
          href={DUELS_ROUTE}
          hint={copy({
            de: 'Öffnet die Duell-Lobby.',
            en: 'Opens the duels lobby.',
            pl: 'Otwiera lobby pojedynków.',
          })}
          label={copy({
            de: 'Duell-Lobby öffnen',
            en: 'Open duels lobby',
            pl: 'Otwórz lobby pojedynków',
          })}
        />
      </View>
    );
  } else {
    content = (
      <View style={{ gap: 12 }}>
        {duelRematches.actionError !== null && duelRematches.actionError !== '' ? (
          <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
            {duelRematches.actionError}
          </Text>
        ) : null}
        {duelRematches.opponents.map((entry) => (
          <RecentOpponentCard
            key={entry.learnerId}
            copy={copy}
            entry={entry}
            isPending={duelRematches.isActionPending}
            locale={locale}
            onRematch={async () => {
              const nextSessionId = await duelRematches.createRematch(
                entry.learnerId,
              );
              if (nextSessionId !== null && nextSessionId !== '') {
                openDuelSession(nextSessionId);
              }
            }}
          />
        ))}
      </View>
    );
  }

  return (
    <SectionCard
      title={copy({
        de: 'Letzte Rivalen',
        en: 'Recent opponents',
        pl: 'Ostatni rywale',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: `Der schnelle Rückkampf startet mit den Standardwerten: ${formatKangurMobileScoreOperation(
            MOBILE_DUEL_DEFAULT_OPERATION,
            locale,
          )}, ${getHomeDuelDifficultyLabel(
            MOBILE_DUEL_DEFAULT_DIFFICULTY,
            locale,
          )}, ${MOBILE_DUEL_DEFAULT_QUESTION_COUNT} Fragen mit ${MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC}s pro Frage.`,
          en: `Quick rematch starts with the default setup: ${formatKangurMobileScoreOperation(
            MOBILE_DUEL_DEFAULT_OPERATION,
            locale,
          )}, ${getHomeDuelDifficultyLabel(
            MOBILE_DUEL_DEFAULT_DIFFICULTY,
            locale,
          )}, ${MOBILE_DUEL_DEFAULT_QUESTION_COUNT} questions with ${MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC}s per question.`,
          pl: `Szybki rewanż startuje z domyślnym ustawieniem: ${formatKangurMobileScoreOperation(
            MOBILE_DUEL_DEFAULT_OPERATION,
            locale,
          )}, poziom ${getHomeDuelDifficultyLabel(
            MOBILE_DUEL_DEFAULT_DIFFICULTY,
            locale,
          )}, ${MOBILE_DUEL_DEFAULT_QUESTION_COUNT} pytań po ${MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC}s.`,
        })}
      </Text>
      {content}
    </SectionCard>
  );
}
