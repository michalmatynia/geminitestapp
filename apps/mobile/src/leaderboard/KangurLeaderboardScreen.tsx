import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useKangurMobileLeaderboard } from './useKangurMobileLeaderboard';

const FILTER_SCROLL_STYLE = {
  gap: 8,
  paddingBottom: 4,
} as const;

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? '#1d4ed8' : '#cbd5e1',
        backgroundColor: selected ? '#dbeafe' : '#ffffff',
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text
        style={{
          color: selected ? '#1d4ed8' : '#334155',
          fontSize: 13,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}): React.JSX.Element {
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontSize: 28,
          fontWeight: '800',
          color: '#0f172a',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: '#475569',
          fontSize: 15,
          lineHeight: 22,
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}

export function KangurLeaderboardScreen(): React.JSX.Element {
  const {
    error,
    isLoading,
    isRestoringAuth,
    items,
    operationFilter,
    operationOptions,
    refresh,
    setOperationFilter,
    setUserFilter,
    userFilter,
    userOptions,
    visibleCount,
  } = useKangurMobileLeaderboard();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fffaf2' }}>
      <ScrollView
        contentContainerStyle={{
          gap: 18,
          paddingHorizontal: 20,
          paddingVertical: 24,
        }}
      >
        <View
          style={{
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <Link href='/' asChild>
            <Pressable
              accessibilityRole='button'
              style={{
                borderRadius: 999,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                Wroc
              </Text>
            </Pressable>
          </Link>

          <SectionTitle
            title='Ranking'
            subtitle='Mobilny ranking korzysta z tych samych kontraktow wynikow i logiki mapowania rankingu co wspolny Kangur.'
          />
        </View>

        <View
          style={{
            borderRadius: 24,
            backgroundColor: '#ffffff',
            padding: 18,
            gap: 14,
            shadowColor: '#0f172a',
            shadowOpacity: 0.08,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
          }}
        >
          <View style={{ gap: 8 }}>
            <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 16 }}>
              Tryb
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={FILTER_SCROLL_STYLE}>
              {operationOptions.map((option) => (
                <FilterChip
                  key={option.id}
                  label={`${option.emoji} ${option.label}`}
                  onPress={() => {
                    setOperationFilter(option.id);
                  }}
                  selected={operationFilter === option.id}
                />
              ))}
            </ScrollView>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 16 }}>
              Gracze
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={FILTER_SCROLL_STYLE}>
              {userOptions.map((option) => (
                <FilterChip
                  key={option.id}
                  label={option.label}
                  onPress={() => {
                    setUserFilter(option.id);
                  }}
                  selected={userFilter === option.id}
                />
              ))}
            </ScrollView>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#64748b', fontSize: 13 }}>
              Widoczne wyniki: {visibleCount}
            </Text>
            <Pressable
              accessibilityRole='button'
              onPress={() => {
                void refresh();
              }}
              style={{
                borderRadius: 999,
                backgroundColor: '#0f172a',
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700' }}>Odswiez</Text>
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View
            style={{
              borderRadius: 24,
              backgroundColor: '#ffffff',
              padding: 20,
            }}
          >
            <Text style={{ color: '#334155', fontSize: 15 }}>
              {isRestoringAuth
                ? 'Przywracamy sesje ucznia i ranking...'
                : 'Ladujemy ranking...'}
            </Text>
          </View>
        ) : error ? (
          <View
            style={{
              borderRadius: 24,
              backgroundColor: '#ffffff',
              padding: 20,
              gap: 8,
            }}
          >
            <Text style={{ color: '#991b1b', fontWeight: '800', fontSize: 16 }}>
              Ranking niedostepny
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 21 }}>
              {error} Uruchom webowe API Kangura pod skonfigurowanym adresem, a potem
              odswiez widok.
            </Text>
          </View>
        ) : items.length === 0 ? (
          <View
            style={{
              borderRadius: 24,
              backgroundColor: '#ffffff',
              padding: 20,
            }}
          >
            <Text style={{ color: '#334155', fontSize: 15 }}>
              Zaden wynik nie pasuje do obecnych filtrow.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {items.map((item) => (
              <View
                key={item.id}
                style={{
                  borderRadius: 22,
                  backgroundColor: item.isCurrentUser ? '#eef2ff' : '#ffffff',
                  borderWidth: 1,
                  borderColor: item.isCurrentUser ? '#c7d2fe' : '#e2e8f0',
                  padding: 16,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>
                      {item.rankLabel}
                    </Text>
                    <View>
                      <Text
                        style={{
                          color: '#0f172a',
                          fontSize: 16,
                          fontWeight: '800',
                        }}
                      >
                        {item.playerName}
                      </Text>
                      <Text style={{ color: '#64748b', fontSize: 13 }}>
                        {item.metaLabel}
                      </Text>
                    </View>
                  </View>

                  {item.isCurrentUser ? (
                    <View
                      style={{
                        borderRadius: 999,
                        backgroundColor: '#1d4ed8',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                        {item.currentUserBadgeLabel}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                  }}
                >
                  <Text style={{ color: '#475569', fontSize: 14 }}>
                    {item.operationSummary}
                  </Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        color: '#1d4ed8',
                        fontSize: 18,
                        fontWeight: '800',
                      }}
                    >
                      {item.scoreLabel}
                    </Text>
                    <Text style={{ color: '#64748b', fontSize: 13 }}>
                      {item.timeLabel}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
