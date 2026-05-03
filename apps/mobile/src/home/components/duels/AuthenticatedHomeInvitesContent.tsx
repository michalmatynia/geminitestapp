import { Text, View } from 'react-native';
import { PrimaryButton } from '../../homeScreenPrimitives';
import { type useKangurMobileI18n, type KangurMobileLocale } from '../../../i18n/kangurMobileI18n';
import { type useKangurMobileHomeDuelsInvites } from '../../useKangurMobileHomeDuelsInvites';
import { DuelInviteCard } from '../../home-duel-section-cards';
import { createKangurDuelsHref } from '../../../duels/duelsHref';
import { OutlineLink } from '../../homeScreenPrimitives';
import { DeferredDuelSectionPlaceholder, DeferredDuelAdvancedSectionPlaceholder } from '../../HomeDuelSections';

const DUELS_ROUTE = createKangurDuelsHref();

type AuthenticatedHomeInvitesContentProps = {
  areDeferredHomePanelsReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
  invites: ReturnType<typeof useKangurMobileHomeDuelsInvites>;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: string;
};

function InvitesLoading({ copy }: { copy: ReturnType<typeof useKangurMobileI18n>['copy'] }): React.JSX.Element {
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

function InvitesDeferred({ copy }: { copy: ReturnType<typeof useKangurMobileI18n>['copy'] }): React.JSX.Element {
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

function InvitesError({
  copy,
  error,
  refresh,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  error: string;
  refresh: () => void;
}): React.JSX.Element {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{error}</Text>
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
        onPress={refresh}
      />
    </View>
  );
}

function InvitesEmpty({ copy }: { copy: ReturnType<typeof useKangurMobileI18n>['copy'] }): React.JSX.Element {
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

function InvitesStatusSwitch({
  invites,
  copy,
}: {
  invites: ReturnType<typeof useKangurMobileHomeDuelsInvites>;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
}): React.JSX.Element | null {
  if (invites.isRestoringAuth || invites.isLoading) {
    return <InvitesLoading copy={copy} />;
  }
  if (invites.isDeferred && invites.invites.length === 0) {
    return <InvitesDeferred copy={copy} />;
  }
  if (invites.error !== null && invites.error !== '') {
    return <InvitesError copy={copy} error={invites.error} refresh={() => { void invites.refresh(); }} />;
  }
  if (invites.invites.length === 0) {
    return <InvitesEmpty copy={copy} />;
  }
  return null;
}

export function AuthenticatedHomeInvitesContent({
  areDeferredHomePanelsReady,
  areDeferredHomeDuelSecondaryReady,
  invites,
  copy,
  locale,
}: AuthenticatedHomeInvitesContentProps): React.JSX.Element {
  if (!areDeferredHomePanelsReady) return <DeferredDuelSectionPlaceholder />;
  if (!areDeferredHomeDuelSecondaryReady) return <DeferredDuelAdvancedSectionPlaceholder />;

  const statusContent = <InvitesStatusSwitch invites={invites} copy={copy} />;
  if (statusContent !== null) return statusContent;

  return (
    <View style={{ gap: 12 }}>
      {invites.invites.map((invite) => (
        <DuelInviteCard
          key={invite.sessionId}
          copy={copy}
          invite={invite}
          locale={locale as KangurMobileLocale}
        />
      ))}
    </View>
  );
}
