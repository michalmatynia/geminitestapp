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

type RematchesSectionProps = {
  areDeferredHomeDuelAdvancedReady: boolean;
  areDeferredHomePanelsReady: boolean;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: string;
};

function RematchesLoading({ copy }: { copy: RematchesSectionProps['copy'] }): React.JSX.Element {
  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Die letzten Rivalen werden geladen.',
        en: 'Loading recent opponents.',
        pl: 'Pobieramy ostatnich rywali.',
      })}
    </Text>
  );
}

function RematchesError({ copy, error, refresh }: { copy: RematchesSectionProps['copy']; error: string; refresh: () => void }): React.JSX.Element {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{error}</Text>
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
        onPress={refresh}
      />
    </View>
  );
}

function RematchesEmpty({ copy }: { copy: RematchesSectionProps['copy'] }): React.JSX.Element {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Noch keine letzten Rivalen. Beende dein erstes Duell.',
          en: 'There are no recent opponents yet. Finish your first duel.',
          pl: 'Nie ma jeszcze ostatnich rywali. Zakończ pierwszy pojedynek.',
        })}
      </Text>
      <OutlineLink
        href={DUELS_ROUTE}
        hint={copy({ de: 'Öffnet die Duell-Lobby.', en: 'Opens the duels lobby.', pl: 'Otwiera lobby pojedynków.' })}
        label={copy({ de: 'Duell-Lobby öffnen', en: 'Open duels lobby', pl: 'Otwórz lobby pojedynków' })}
      />
    </View>
  );
}

function RematchesList({
  opponents,
  copy,
  locale,
  actionError,
  isActionPending,
  onRematch,
}: {
  opponents: ReturnType<typeof useKangurMobileHomeDuelsRematches>['opponents'];
  copy: RematchesSectionProps['copy'];
  locale: string;
  actionError: string | null;
  isActionPending: boolean;
  onRematch: (learnerId: string) => void;
}): React.JSX.Element {
  return (
    <View style={{ gap: 12 }}>
      {actionError !== null && actionError !== '' && <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{actionError}</Text>}
      {opponents.map((entry) => (
        <RecentOpponentCard
          key={entry.learnerId}
          copy={copy}
          entry={entry}
          isPending={isActionPending}
          locale={locale}
          onRematch={() => onRematch(entry.learnerId)}
        />
      ))}
    </View>
  );
}

export function AuthenticatedHomeRematchesSection({
  areDeferredHomeDuelAdvancedReady,
  areDeferredHomePanelsReady,
}: Omit<RematchesSectionProps, 'copy' | 'locale'>): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const router = useRouter();
  const duelRematches = useKangurMobileHomeDuelsRematches({ enabled: areDeferredHomeDuelAdvancedReady });
  const openDuelSession = (sessionId: string): void => router.replace(createKangurDuelsHref({ sessionId }));

  let content: React.ReactNode = null;
  if (!areDeferredHomePanelsReady) content = <DeferredDuelSectionPlaceholder />;
  else if (!areDeferredHomeDuelAdvancedReady) content = <DeferredDuelAdvancedSectionPlaceholder />;
  else if (duelRematches.isRestoringAuth || duelRematches.isLoading) content = <RematchesLoading copy={copy} />;
  else if (duelRematches.error !== null && duelRematches.error !== '') {
    const handleRefresh = (): void => {
      void duelRematches.refresh();
    };
    content = <RematchesError copy={copy} error={duelRematches.error} refresh={handleRefresh} />;
  }
  else if (duelRematches.opponents.length === 0) content = <RematchesEmpty copy={copy} />;
  else {
    content = (
      <RematchesList
        opponents={duelRematches.opponents}
        copy={copy}
        locale={locale}
        actionError={duelRematches.actionError}
        isActionPending={duelRematches.isActionPending}
        onRematch={(learnerId: string) => {
          void (async () => {
            const nextSessionId = await duelRematches.createRematch(learnerId);
            if (nextSessionId !== null && nextSessionId !== '') openDuelSession(nextSessionId);
          })();
        }}
      />
    );
  }

  return (
    <SectionCard title={copy({ de: 'Letzte Rivalen', en: 'Recent opponents', pl: 'Ostatni rywale' })}>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: `Der schnelle Rückkampf startet mit: ${formatKangurMobileScoreOperation(MOBILE_DUEL_DEFAULT_OPERATION, locale)}, ${getHomeDuelDifficultyLabel(MOBILE_DUEL_DEFAULT_DIFFICULTY, locale)}, ${MOBILE_DUEL_DEFAULT_QUESTION_COUNT} Fragen mit ${MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC}s pro Frage.`,
          en: `Quick rematch starts with: ${formatKangurMobileScoreOperation(MOBILE_DUEL_DEFAULT_OPERATION, locale)}, ${getHomeDuelDifficultyLabel(MOBILE_DUEL_DEFAULT_DIFFICULTY, locale)}, ${MOBILE_DUEL_DEFAULT_QUESTION_COUNT} questions with ${MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC}s per question.`,
          pl: `Szybki rewanż startuje z: ${formatKangurMobileScoreOperation(MOBILE_DUEL_DEFAULT_OPERATION, locale)}, poziom ${getHomeDuelDifficultyLabel(MOBILE_DUEL_DEFAULT_DIFFICULTY, locale)}, ${MOBILE_DUEL_DEFAULT_QUESTION_COUNT} pytań po ${MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC}s.`,
        })}
      </Text>
      {content}
    </SectionCard>
  );
}
