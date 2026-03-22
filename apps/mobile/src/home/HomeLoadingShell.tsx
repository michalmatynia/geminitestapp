import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';

function SkeletonBlock({
  height,
  width = '100%',
  radius = 14,
}: {
  height: number;
  width?: number | `${number}%`;
  radius?: number;
}): React.JSX.Element {
  return (
    <View
      style={{
        height,
        width,
        borderRadius: radius,
        backgroundColor: '#e2e8f0',
      }}
    />
  );
}

function LoadingCard({
  children,
  testID,
  titleWidth = '44%',
}: {
  children: React.ReactNode;
  testID: string;
  titleWidth?: number | `${number}%`;
}): React.JSX.Element {
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 24,
        elevation: 3,
        gap: 12,
        padding: 20,
        shadowColor: '#0f172a',
        shadowOffset: { height: 10, width: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      }}
    >
      <SkeletonBlock height={24} radius={12} width={titleWidth} />
      {children}
    </View>
  );
}

function LoadingInsetCard({
  height = 112,
}: {
  height?: number;
}): React.JSX.Element {
  return (
    <View
      style={{
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        borderRadius: 20,
        borderWidth: 1,
        gap: 8,
        padding: 14,
      }}
    >
      <SkeletonBlock height={20} radius={10} width='58%' />
      <SkeletonBlock height={16} width='100%' />
      <SkeletonBlock height={16} width='82%' />
      <SkeletonBlock height={40} radius={999} width='52%' />
      {height > 112 ? <SkeletonBlock height={height - 112} radius={16} width='100%' /> : null}
    </View>
  );
}

function LoadingButtonStack({
  count,
}: {
  count: number;
}): React.JSX.Element {
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBlock
          key={`home-loading-button-${index}`}
          height={42}
          radius={999}
          width='100%'
        />
      ))}
    </View>
  );
}

function LoadingChipRow(): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <SkeletonBlock height={30} radius={999} width={118} />
      <SkeletonBlock height={30} radius={999} width={142} />
      <SkeletonBlock height={30} radius={999} width={126} />
    </View>
  );
}

export function HomeLoadingShell(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SafeAreaView
      accessibilityLabel={copy({
        de: 'Startseite wird geladen',
        en: 'Loading home page',
        pl: 'Ładowanie strony głównej',
      })}
      style={{ backgroundColor: '#fffaf2', flex: 1 }}
      testID='home-loading-shell'
    >
      <ScrollView
        contentContainerStyle={{
          gap: 16,
          paddingHorizontal: 24,
          paddingVertical: 28,
        }}
      >
        <View style={{ gap: 10 }} testID='home-loading-hero'>
          <SkeletonBlock height={36} radius={18} width='52%' />
          <SkeletonBlock height={18} width='100%' />
          <SkeletonBlock height={18} width='88%' />
          <LoadingChipRow />
          <LoadingButtonStack count={3} />
        </View>

        <LoadingCard testID='home-loading-account-card'>
          <SkeletonBlock height={18} width='42%' />
          <SkeletonBlock height={18} width='55%' />
          <SkeletonBlock height={18} width='46%' />
          <SkeletonBlock height={18} width='68%' />
          <SkeletonBlock height={42} radius={999} width='100%' />
        </LoadingCard>

        <LoadingCard testID='home-loading-navigation-card'>
          <LoadingButtonStack count={7} />
        </LoadingCard>

        <LoadingCard testID='home-loading-duel-invites-card'>
          <SkeletonBlock height={16} width='100%' />
          <SkeletonBlock height={16} width='82%' />
          <LoadingInsetCard />
          <LoadingInsetCard />
        </LoadingCard>

        <LoadingCard testID='home-loading-sent-challenges-card'>
          <SkeletonBlock height={16} width='100%' />
          <SkeletonBlock height={16} width='84%' />
          <LoadingInsetCard />
        </LoadingCard>

        <LoadingCard testID='home-loading-active-rivals-card'>
          <SkeletonBlock height={16} width='100%' />
          <SkeletonBlock height={16} width='74%' />
          <LoadingInsetCard />
          <LoadingInsetCard />
        </LoadingCard>

        <LoadingCard testID='home-loading-live-duels-card'>
          <LoadingInsetCard />
          <LoadingInsetCard />
        </LoadingCard>

        <LoadingCard testID='home-loading-duel-leaderboard-card'>
          <LoadingChipRow />
          <LoadingInsetCard />
          <LoadingInsetCard />
          <LoadingInsetCard />
          <SkeletonBlock height={42} radius={999} width='100%' />
        </LoadingCard>

        <LoadingCard testID='home-loading-training-focus-card'>
          <LoadingInsetCard height={124} />
          <LoadingInsetCard height={124} />
        </LoadingCard>

        <LoadingCard testID='home-loading-lesson-plan-card'>
          <SkeletonBlock height={16} width='100%' />
          <SkeletonBlock height={16} width='76%' />
          <LoadingChipRow />
          <LoadingInsetCard height={124} />
          <LoadingInsetCard height={124} />
        </LoadingCard>

        <LoadingCard testID='home-loading-badges-card'>
          <SkeletonBlock height={16} width='100%' />
          <SkeletonBlock height={16} width='78%' />
          <LoadingChipRow />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <SkeletonBlock height={32} radius={999} width={92} />
            <SkeletonBlock height={32} radius={999} width={108} />
            <SkeletonBlock height={32} radius={999} width={96} />
            <SkeletonBlock height={32} radius={999} width={114} />
          </View>
          <SkeletonBlock height={42} radius={999} width='100%' />
        </LoadingCard>

        <LoadingCard testID='home-loading-recent-lessons-card'>
          <SkeletonBlock height={16} width='100%' />
          <SkeletonBlock height={16} width='88%' />
          <LoadingInsetCard />
          <LoadingInsetCard />
          <SkeletonBlock height={42} radius={999} width='100%' />
        </LoadingCard>

        <LoadingCard testID='home-loading-plan-card'>
          <SkeletonBlock height={16} width='100%' />
          <SkeletonBlock height={16} width='74%' />
          <LoadingInsetCard />
          <LoadingInsetCard />
          <SkeletonBlock height={42} radius={999} width='100%' />
        </LoadingCard>

        <LoadingCard testID='home-loading-results-card'>
          <SkeletonBlock height={16} width='100%' />
          <SkeletonBlock height={16} width='72%' />
          <LoadingInsetCard />
          <LoadingInsetCard />
          <SkeletonBlock height={42} radius={999} width='100%' />
        </LoadingCard>
      </ScrollView>
    </SafeAreaView>
  );
}
