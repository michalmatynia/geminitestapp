import { Text, View } from 'react-native';
import { PrimaryButton, OutlineLink } from '../../homeScreenPrimitives';
import { useKangurMobileAuth } from '../../../auth/KangurMobileAuthContext';
import { type useKangurMobileI18n } from '../../../i18n/kangurMobileI18n';
import { type useKangurMobileHomeDuelsPresence } from '../../useKangurMobileHomeDuelsPresence';
import { ActiveRivalCard } from '../../home-duel-section-cards';
import { createKangurDuelsHref } from '../../../duels/duelsHref';
import { DeferredDuelSectionPlaceholder, DeferredDuelAdvancedSectionPlaceholder } from '../../HomeDuelSections';

const DUELS_ROUTE = createKangurDuelsHref();

type Props = {
  areDeferredHomePanelsReady: boolean;
  areDeferredHomeDuelAdvancedReady: boolean;
  presence: ReturnType<typeof useKangurMobileHomeDuelsPresence>;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: string;
  onChallenge: (sessionId: string) => void;
};

export function AuthenticatedHomeActiveRivalsContent({
  areDeferredHomePanelsReady,
  areDeferredHomeDuelAdvancedReady,
  presence,
  copy,
  locale,
  onChallenge,
}: Props): React.JSX.Element {
  const { session } = useKangurMobileAuth();
  const activeDuelLearnerId = session.user?.activeLearner?.id ?? session.user?.id ?? null;

  if (!areDeferredHomePanelsReady) {
    return <DeferredDuelSectionPlaceholder />;
  }
  if (!areDeferredHomeDuelAdvancedReady) {
    return <DeferredDuelAdvancedSectionPlaceholder />;
  }
  if (presence.isRestoringAuth || presence.isLoading) {
    return (
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Aktive Rivalen in der Lobby werden geladen.',
          en: 'Loading active rivals in the lobby.',
          pl: 'Pobieramy aktywnych rywali w lobby.',
        })}
      </Text>
    );
  }
  if (presence.error !== null && presence.error !== '') {
    return (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
          {presence.error}
        </Text>
        <PrimaryButton
          hint={copy({
            de: 'Aktualisiert die aktiven Rivalen in der Lobby.',
            en: 'Refreshes the active rivals in the lobby.',
            pl: 'Odświeża aktywnych rywali w lobby.',
          })}
          label={copy({
            de: 'Rivalen aktualisieren',
            en: 'Refresh rivals',
            pl: 'Odśwież rywali',
          })}
          onPress={presence.refresh}
        />
      </View>
    );
  }
  if (presence.entries.length === 0) {
    return (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Gerade sind keine anderen Rivalen in der Duell-Lobby aktiv. Öffne die Lobby, um ein neues Match zu starten oder auf den nächsten Gegner zu warten.',
            en: 'There are no other rivals active in the duels lobby right now. Open the lobby to start a new match or wait for the next opponent.',
            pl: 'W tej chwili nie ma innych rywali aktywnych w lobby pojedynków. Otwórz lobby, aby wystartować z nowym meczem albo poczekać na kolejnego rywala.',
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
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Das sind aktive Rivalen aus der Duell-Lobby. Öffne die Duell-Lobby, damit andere auch dich in dieser Liste sehen.',
          en: 'These are active rivals from the duels lobby. Open the duels lobby so others can also see you in this list.',
          pl: 'To aktywni rywale z lobby pojedynków. Otwórz lobby pojedynków, aby inni zobaczyli tu również Ciebie.',
        })}
      </Text>
      {presence.actionError !== null && presence.actionError !== '' ? (
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
          {presence.actionError}
        </Text>
      ) : null}
      {presence.entries.map((entry) => {
        const isCurrentLearner = entry.learnerId === activeDuelLearnerId;

        return (
          <ActiveRivalCard
            key={entry.learnerId}
            copy={copy}
            entry={entry}
            isActionPending={presence.isActionPending}
            isCurrentLearner={isCurrentLearner}
            isPending={presence.pendingLearnerId === entry.learnerId}
            locale={locale}
            onChallenge={
              isCurrentLearner
                ? null
                : async () => {
                    const nextSessionId = await presence.createPrivateChallenge(
                      entry.learnerId,
                    );
                    if (nextSessionId !== null && nextSessionId !== '') {
                      onChallenge(nextSessionId);
                    }
                  }
            }
          />
        );
      })}
      <OutlineLink
        href={DUELS_ROUTE}
        hint={copy({
          de: 'Öffnet die vollständige Duell-Lobby.',
          en: 'Opens the full duels lobby.',
          pl: 'Otwiera pełne lobby pojedynków.',
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
