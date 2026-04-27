import { Text, View } from 'react-native';
import { PrimaryButton } from '../../homeScreenPrimitives';
import { useKangurMobileI18n } from '../../../i18n/kangurMobileI18n';
import { useKangurMobileHomeDuelsInvites } from '../../useKangurMobileHomeDuelsInvites';
import { DuelInviteCard } from '../../home-duel-section-cards';
import { createKangurDuelsHref } from '../../../duels/duelsHref';
import { OutlineLink } from '../../homeScreenPrimitives';
import { DeferredDuelSectionPlaceholder, DeferredDuelAdvancedSectionPlaceholder } from '../../HomeDuelSections';

const DUELS_ROUTE = createKangurDuelsHref();

type Props = {
  areDeferredHomePanelsReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
  invites: ReturnType<typeof useKangurMobileHomeDuelsInvites>;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: string;
};

export function AuthenticatedHomeInvitesContent({
  areDeferredHomePanelsReady,
  areDeferredHomeDuelSecondaryReady,
  invites,
  copy,
  locale,
}: Props): React.JSX.Element {
  if (!areDeferredHomePanelsReady) {
    return <DeferredDuelSectionPlaceholder />;
  }
  if (!areDeferredHomeDuelSecondaryReady) {
    return <DeferredDuelAdvancedSectionPlaceholder />;
  }
  if (invites.isRestoringAuth || invites.isLoading) {
    return (
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Private Duelleinladungen werden geladen.',
          en: 'Loading private duel invites.',
          pl: 'Pobieramy prywatne zaproszenia do pojedynków.',
        })}
      </Text>
    );
  }
  if (invites.isDeferred && invites.invites.length === 0) {
    return (
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten die aktualisierten privaten Duelleinladungen für den nächsten Startschritt vor.',
          en: 'Preparing refreshed private duel invites for the next home step.',
          pl: 'Przygotowujemy odświeżone prywatne zaproszenia do pojedynków na kolejny etap ekranu startowego.',
        })}
      </Text>
    );
  }
  if (invites.error !== null && invites.error !== '') {
    return (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
          {invites.error}
        </Text>
        <PrimaryButton
          hint={copy({
            de: 'Aktualisiert die privaten Duelleinladungen.',
            en: 'Refreshes the private duel invites.',
            pl: 'Odświeża prywatne zaproszenia do pojedynków.',
          })}
          label={copy({
            de: 'Einladungen aktualisieren',
            en: 'Refresh invites',
            pl: 'Odśwież zaproszenia',
          })}
          onPress={invites.refresh}
        />
      </View>
    );
  }
  if (invites.invites.length === 0) {
    return (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Keine offenen Einladungen. Du kannst die Lobby öffnen und eine neue Herausforderung senden.',
            en: 'There are no pending invites yet. You can open the lobby and send a new challenge.',
            pl: 'Brak oczekujących zaproszeń. Możesz otworzyć lobby i wysłać nowe wyzwanie.',
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
    <View style={{ gap: 12 }}>
      {invites.invites.map((invite) => (
        <DuelInviteCard
          key={invite.sessionId}
          copy={copy}
          invite={invite}
          locale={locale}
        />
      ))}
    </View>
  );
}
