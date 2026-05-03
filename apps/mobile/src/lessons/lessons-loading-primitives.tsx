import { Text, View } from 'react-native';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard as Card,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileSkeletonBlock as SkeletonBlock,
} from '../shared/KangurMobileUi';

export function LessonsLoadingDetailCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Lektionen werden geladen',
          en: 'Loading lessons',
          pl: 'Ładowanie lekcji',
        })}
      </Text>
      <SkeletonBlock height={28} width='68%' radius={16} />
      <SkeletonBlock height={18} width='100%' />
      <SkeletonBlock height={18} width='92%' />
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <SkeletonBlock height={34} width={132} radius={999} />
        <SkeletonBlock height={34} width={144} radius={999} />
      </View>
      <InsetPanel gap={10}>
        <SkeletonBlock height={18} width='40%' />
        <SkeletonBlock height={22} width='62%' />
        <SkeletonBlock height={16} width='100%' />
        <SkeletonBlock height={16} width='88%' />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SkeletonBlock height={34} width={104} radius={999} />
          <SkeletonBlock height={34} width={96} radius={999} />
          <SkeletonBlock height={34} width={114} radius={999} />
        </View>
      </InsetPanel>
      <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
        {copy({
          de: 'Die Lektion und ihre Abschnitte werden vorbereitet.',
          en: 'Preparing the lesson and its reading sections.',
          pl: 'Przygotowujemy lekcję i sekcje do czytania.',
        })}
      </Text>
    </Card>
  );
}

export function LessonsLoadingCatalogCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Lektionskatalog',
          en: 'Lesson catalog',
          pl: 'Katalog lekcji',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Die Themenliste und der Beherrschungsstand werden geladen.',
          en: 'Loading the topic list and mastery state.',
          pl: 'Wczytujemy listę tematów i stan opanowania.',
        })}
      </Text>

      <View style={{ gap: 12 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View
            key={`lessons-skeleton-row-${index}`}
            style={{
              borderRadius: 22,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              backgroundColor: '#f8fafc',
              padding: 16,
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 8 }}>
                <SkeletonBlock height={22} width='64%' radius={14} />
                <SkeletonBlock height={16} width='100%' />
                <SkeletonBlock height={16} width='84%' />
              </View>
              <SkeletonBlock height={32} width={110} radius={999} />
            </View>

            <SkeletonBlock height={14} width='58%' />
          </View>
        ))}
      </View>
    </Card>
  );
}
