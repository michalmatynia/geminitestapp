import React from 'react';
import { Text, View } from 'react-native';
import {
  KangurMobileCard as Card,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobilePendingActionButton,
  KangurMobilePill as Pill,
} from '../shared/KangurMobileUi';
import { ActionButton } from './duels-primitives';
import { type UseKangurMobileLearnerDuelsSummaryResult } from '../duels/useKangurMobileLearnerDuelsSummary';
import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';

export function LessonsDuelsPanel({
  copy,
  duelSectionDescription,
  lessonDuels,
  onRematch,
  pendingOpponentLearnerId,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  duelSectionDescription: string;
  lessonDuels: UseKangurMobileLearnerDuelsSummaryResult;
  onRematch: (learnerId: string) => Promise<void>;
  pendingOpponentLearnerId: string | null;
}): React.JSX.Element {
  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({ de: 'Nach der Lektion', en: 'After the lesson', pl: 'Po lekcji' })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
        {copy({ de: 'Schneller Rückweg zu Rivalen', en: 'Quick return to rivals', pl: 'Szybki powrót do rywali' })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{duelSectionDescription}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <Pill
          label={copy({ de: `Rivalen ${lessonDuels.opponents.length}`, en: `Rivals ${lessonDuels.opponents.length}`, pl: `Rywale ${lessonDuels.opponents.length}` })}
          tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }}
        />
        {lessonDuels.currentRank !== null && (
          <Pill
            label={`#${lessonDuels.currentRank}`}
            tone={{ backgroundColor: '#fef3c7', borderColor: '#fde68a', textColor: '#b45309' }}
          />
        )}
      </View>

      <View style={{ gap: 12, marginTop: 12 }}>
        {lessonDuels.opponents.map((opponent) => (
          <InsetPanel key={opponent.learnerId} gap={6} padding={12} style={{ borderRadius: 18, backgroundColor: '#ffffff' }}>
            <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>{opponent.displayName}</Text>
            <KangurMobilePendingActionButton
              label={copy({ de: 'Schneller Rewatch', en: 'Quick rematch', pl: 'Szybki rewanż' })}
              onPress={() => { void onRematch(opponent.learnerId); }}
              pending={pendingOpponentLearnerId === opponent.learnerId}
            />
          </InsetPanel>
        ))}
        {lessonDuels.error !== null && (
            <View style={{ gap: 10 }}>
                <Text style={{ color: '#b91c1c' }}>{lessonDuels.error}</Text>
                <ActionButton label={copy({ de: 'Aktualisieren', en: 'Refresh', pl: 'Odśwież' })} onPress={() => { void lessonDuels.refresh(); }} />
            </View>
        )}
      </View>
    </Card>
  );
}
