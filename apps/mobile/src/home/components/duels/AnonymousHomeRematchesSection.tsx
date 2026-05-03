import { Text, View } from 'react-native';
import { useKangurMobileI18n } from '../../../i18n/kangurMobileI18n';
import { OutlineLink, SectionCard } from '../../homeScreenPrimitives';
import { createKangurDuelsHref } from '../../../duels/duelsHref';
import { DeferredDuelSectionPlaceholder, DeferredDuelAdvancedSectionPlaceholder } from '../../HomeDuelSections';

const DUELS_ROUTE = createKangurDuelsHref();

type Props = {
  areDeferredHomeDuelAdvancedReady: boolean;
  areDeferredHomePanelsReady: boolean;
};

export function AnonymousHomeRematchesSection({
  areDeferredHomeDuelAdvancedReady,
  areDeferredHomePanelsReady,
}: Props): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  let content: React.ReactNode = null;
  if (!areDeferredHomePanelsReady) {
    content = <DeferredDuelSectionPlaceholder />;
  } else if (!areDeferredHomeDuelAdvancedReady) {
    content = <DeferredDuelAdvancedSectionPlaceholder />;
  } else {
    content = (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Nach der Anmeldung erscheinen hier die letzten Rivalen zusammen mit einer schnellen privaten Rückkampf-Aktion.',
            en: 'After signing in, your recent opponents will appear here together with a quick private rematch action.',
            pl: 'Po zalogowaniu pojawią się tutaj ostatni rywale razem z akcją szybkiego prywatnego rewanżu.',
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
    <SectionCard
      title={copy({
        de: 'Letzte Rivalen',
        en: 'Recent opponents',
        pl: 'Ostatni rywale',
      })}
    >
      {content}
    </SectionCard>
  );
}
