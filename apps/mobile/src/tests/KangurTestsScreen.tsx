import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { KangurMobileAiTutorCard } from '../ai-tutor/KangurMobileAiTutorCard';
import { useKangurMobileTests, type KangurMobileTestSuiteItem } from './useKangurMobileTests';
import { KangurMobileScrollScreen } from '../shared/KangurMobileUi';
import {
  TESTS_ROUTE,
  SectionCard,
  PrimaryButton,
  TestSuiteCard,
} from './tests-primitives';
import { KangurMobileTestPlayer } from './KangurMobileTestPlayer';
import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';

const TestsLoadingView = ({ copy }: { copy: (v: Record<string, string>) => string }): React.JSX.Element => (
  <KangurMobileScrollScreen>
    <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
      {copy({ de: 'Tests', en: 'Tests', pl: 'Testy' })}
    </Text>
    <SectionCard title={copy({ de: 'Lade Tests', en: 'Loading tests', pl: 'Ładujemy testy' })}>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Wir laden aktive Tests und veröffentlichte Fragen.',
          en: 'We are loading active test sets and published questions.',
          pl: 'Pobieramy aktywne zestawy testów i ich opublikowane pytania.',
        })}
      </Text>
    </SectionCard>
  </KangurMobileScrollScreen>
);

const TestsErrorView = ({
  error,
  copy,
  onRefresh,
}: {
  error: string;
  copy: (v: Record<string, string>) => string;
  onRefresh: () => void;
}): React.JSX.Element => (
  <SectionCard title={copy({ de: 'Fehler', en: 'Error', pl: 'Błąd' })}>
    <Text style={{ color: '#b91c1c', fontSize: 14 }}>{error}</Text>
    <PrimaryButton
      label={copy({ de: 'Erneut versuchen', en: 'Retry', pl: 'Spróbuj ponownie' })}
      onPress={onRefresh}
    />
  </SectionCard>
);

const TestsStaleFocusView = ({
  copy,
  onOpenCatalog,
}: {
  copy: (v: Record<string, string>) => string;
  onOpenCatalog: () => void;
}): React.JSX.Element => (
  <SectionCard title={copy({ de: 'Test-Verknüpfung', en: 'Test shortcut', pl: 'Skrót testu' })}>
    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
      {copy({
        de: 'Der Fokus verweist auf keinen Test.',
        en: 'The focus shortcut does not match an active test.',
        pl: 'Skrót testu nie pasuje do aktywnego testu.',
      })}
    </Text>
    <PrimaryButton
      label={copy({
        de: 'Komplette Übersicht öffnen',
        en: 'Open full catalog',
        pl: 'Otwórz pełny katalog',
      })}
      onPress={onOpenCatalog}
      tone={{ backgroundColor: '#334155', borderColor: '#334155', textColor: '#f8fafc' }}
    />
  </SectionCard>
);

const TestsCatalogView = ({
  suites,
  copy,
  locale,
  onOpenSuite,
}: {
  suites: KangurMobileTestSuiteItem[];
  copy: (v: Record<string, string>) => string;
  locale: KangurMobileLocale;
  onOpenSuite: (id: string) => void;
}): React.JSX.Element => (
  <View style={{ gap: 12 }}>
    {suites.map((item) => (
      <TestSuiteCard
        copy={copy}
        item={item}
        key={item.suite.id}
        locale={locale}
        onOpen={onOpenSuite}
      />
    ))}
  </View>
);

type KangurTestsScreenState = {
  copy: (v: Record<string, string>) => string;
  locale: KangurMobileLocale;
  suites: KangurMobileTestSuiteItem[];
  isLoading: boolean;
  error: string | null;
  activeSuite: KangurMobileTestSuiteItem | null;
  hasStaleFocus: boolean;
  setActiveSuiteId: React.Dispatch<React.SetStateAction<string | null>>;
  onRefresh: () => void;
  onOpenCatalog: () => void;
};

const useKangurTestsScreenState = (): KangurTestsScreenState => {
  const router = useRouter();
  const { copy, locale } = useKangurMobileI18n();
  const params = useLocalSearchParams<{ focus?: string | string[] }>();
  const focusToken = Array.isArray(params.focus) ? params.focus[0] ?? null : params.focus ?? null;

  const { suites, isLoading, error, focusToken: resolvedFocusToken, focusedSuiteId, refresh } =
    useKangurMobileTests(focusToken);

  const [activeSuiteId, setActiveSuiteId] = useState<string | null>(focusedSuiteId);

  const activeSuite = activeSuiteId !== null
    ? suites.find((item) => item.suite.id === activeSuiteId) ?? null
    : null;

  const hasStaleFocus = resolvedFocusToken !== null && focusedSuiteId === null;

  function onRefresh(): void {
    void refresh();
  }

  function onOpenCatalog(): void {
    void router.replace(TESTS_ROUTE);
  }

  return {
    copy,
    locale,
    suites,
    isLoading,
    error,
    activeSuite,
    hasStaleFocus,
    setActiveSuiteId,
    onRefresh,
    onOpenCatalog,
  };
};

export function KangurTestsScreen(): React.JSX.Element {
  const state = useKangurTestsScreenState();
  const {
    copy,
    locale,
    suites,
    isLoading,
    error,
    activeSuite,
    hasStaleFocus,
    setActiveSuiteId,
    onRefresh,
    onOpenCatalog,
  } = state;

  if (isLoading) {
    return <TestsLoadingView copy={copy} />;
  }

  if (activeSuite !== null) {
    return (
      <KangurMobileScrollScreen>
        <KangurMobileTestPlayer
          item={activeSuite}
          copy={copy}
          locale={locale}
          onBackToCatalog={() => setActiveSuiteId(null)}
        />
      </KangurMobileScrollScreen>
    );
  }

  return (
    <KangurMobileScrollScreen>
      <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
        {copy({ de: 'Tests', en: 'Tests', pl: 'Testy' })}
      </Text>
      <KangurMobileAiTutorCard />

      {error !== null ? <TestsErrorView error={error} copy={copy} onRefresh={onRefresh} /> : null}

      {hasStaleFocus ? <TestsStaleFocusView copy={copy} onOpenCatalog={onOpenCatalog} /> : null}

      <TestsCatalogView
        copy={copy}
        locale={locale}
        onOpenSuite={setActiveSuiteId}
        suites={suites}
      />
    </KangurMobileScrollScreen>
  );
}
