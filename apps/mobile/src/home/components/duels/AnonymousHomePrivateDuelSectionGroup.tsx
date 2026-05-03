import { Text, View } from 'react-native';
import { useKangurMobileI18n } from '../../../i18n/kangurMobileI18n';
import { OutlineLink, SectionCard } from '../../homeScreenPrimitives';
import { createKangurDuelsHref } from '../../../duels/duelsHref';
import { DeferredDuelSectionPlaceholder, DeferredDuelAdvancedSectionPlaceholder } from '../../HomeDuelSections';

const DUELS_ROUTE = createKangurDuelsHref();

type Props = {
  areDeferredHomeDuelAdvancedReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
  areDeferredHomePanelsReady: boolean;
};

function InvitesContent({
  copy,
  areDeferredHomePanelsReady,
  areDeferredHomeDuelSecondaryReady,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  areDeferredHomePanelsReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
}): React.JSX.Element {
  if (!areDeferredHomePanelsReady) return <DeferredDuelSectionPlaceholder />;
  if (!areDeferredHomeDuelSecondaryReady) return <DeferredDuelAdvancedSectionPlaceholder />;

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Nach der Anmeldung siehst du hier private Duelleinladungen von anderen Schulern.',
          en: 'After signing in, you will see private duel invites from other learners here.',
          pl: 'Po zalogowaniu zobaczysz tutaj prywatne zaproszenia do pojedynków od innych uczniów.',
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

function ChallengesContent({
  copy,
  areDeferredHomePanelsReady,
  areDeferredHomeDuelSecondaryReady,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  areDeferredHomePanelsReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
}): React.JSX.Element {
  if (!areDeferredHomePanelsReady) return <DeferredDuelSectionPlaceholder />;
  if (!areDeferredHomeDuelSecondaryReady) return <DeferredDuelAdvancedSectionPlaceholder />;

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Nach der Anmeldung erscheinen hier deine privaten Herausforderungen zusammen mit einem direkten Link zum erneuten Teilen.',
          en: 'After signing in, your private challenges will appear here together with a direct invite-share action.',
          pl: 'Po zalogowaniu pojawią się tutaj Twoje prywatne wyzwania razem z akcją ponownego udostępnienia zaproszenia.',
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

function RivalsContent({
  copy,
  areDeferredHomePanelsReady,
  areDeferredHomeDuelAdvancedReady,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  areDeferredHomePanelsReady: boolean;
  areDeferredHomeDuelAdvancedReady: boolean;
}): React.JSX.Element {
  if (!areDeferredHomePanelsReady) return <DeferredDuelSectionPlaceholder />;
  if (!areDeferredHomeDuelAdvancedReady) return <DeferredDuelAdvancedSectionPlaceholder />;

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Nach der Anmeldung erscheinen hier aktive Rivalen aus der Duell-Lobby zusammen mit einer direkten privaten Herausforderungsaktion.',
          en: 'After signing in, this section shows active rivals from the duels lobby together with a direct private challenge action.',
          pl: 'Po zalogowaniu zobaczysz tutaj aktywnych rywali z lobby pojedynków razem z bezpośrednią akcją prywatnego wyzwania.',
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

export function AnonymousHomePrivateDuelSectionGroup({
  areDeferredHomeDuelAdvancedReady,
  areDeferredHomeDuelSecondaryReady,
  areDeferredHomePanelsReady,
}: Props): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <>
      <SectionCard title={copy({ de: 'Duelleinladungen', en: 'Duel invites', pl: 'Zaproszenia do pojedynków' })}>
        <InvitesContent
          copy={copy}
          areDeferredHomePanelsReady={areDeferredHomePanelsReady}
          areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
        />
      </SectionCard>

      <SectionCard title={copy({ de: 'Gesendete Herausforderungen', en: 'Sent challenges', pl: 'Wysłane wyzwania' })}>
        <ChallengesContent
          copy={copy}
          areDeferredHomePanelsReady={areDeferredHomePanelsReady}
          areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
        />
      </SectionCard>

      <SectionCard title={copy({ de: 'Aktive Rivalen in der Lobby', en: 'Active rivals in the lobby', pl: 'Aktywni rywale w lobby' })}>
        <RivalsContent
          copy={copy}
          areDeferredHomePanelsReady={areDeferredHomePanelsReady}
          areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
        />
      </SectionCard>
    </>
  );
}
