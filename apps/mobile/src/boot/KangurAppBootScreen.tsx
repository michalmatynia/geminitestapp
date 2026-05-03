import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useKangurMobileI18n, type KangurMobileCopy } from '../i18n/kangurMobileI18n';

function BootScreenLoadingDots(): React.JSX.Element {
  return (
    <View
      aria-hidden={true}
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          backgroundColor: '#f59e0b',
          borderRadius: 999,
          height: 12,
          opacity: 0.45,
          width: 12,
        }}
      />
      <View
        style={{
          backgroundColor: '#f59e0b',
          borderRadius: 999,
          height: 12,
          opacity: 0.7,
          width: 12,
        }}
      />
      <View
        style={{
          backgroundColor: '#f59e0b',
          borderRadius: 999,
          height: 12,
          width: 12,
        }}
      />
    </View>
  );
}

function BootScreenCard({ copy }: { copy: KangurMobileCopy }): React.JSX.Element {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderColor: '#fde68a',
        borderRadius: 28,
        borderWidth: 1,
        gap: 16,
        maxWidth: 420,
        paddingHorizontal: 28,
        paddingVertical: 32,
        shadowColor: '#0f172a',
        shadowOffset: { height: 10, width: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        width: '100%',
      }}
    >
      <Text
        style={{
          color: '#0f172a',
          fontSize: 28,
          fontWeight: '800',
          textAlign: 'center',
        }}
      >
        {copy({
          de: 'Kangur mobil',
          en: 'Kangur mobile',
          pl: 'Kangur mobilnie',
        })}
      </Text>
      <Text
        style={{
          color: '#475569',
          fontSize: 15,
          lineHeight: 22,
          textAlign: 'center',
        }}
      >
        {copy({
          de: 'Anmeldung, letzte Ergebnisse und Startdaten werden vorbereitet.',
          en: 'Preparing sign-in, recent results, and startup data.',
          pl: 'Przygotowujemy logowanie, ostatnie wyniki i dane startowe.',
        })}
      </Text>
      <BootScreenLoadingDots />
    </View>
  );
}

function BootScreenContent({ copy }: { copy: KangurMobileCopy }): React.JSX.Element {
  return (
    <View
      style={{
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
      }}
    >
      <BootScreenCard copy={copy} />
    </View>
  );
}

export function KangurAppBootScreen(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SafeAreaView
      accessibilityLabel={copy({
        de: 'Kangur-App wird geladen',
        en: 'Loading Kangur app',
        pl: 'Ładowanie aplikacji Kangur',
      })}
      style={{
        backgroundColor: '#fffaf2',
        flex: 1,
      }}
      testID='app-bootstrap-screen'
    >
      <BootScreenContent copy={copy} />
    </SafeAreaView>
  );
}
