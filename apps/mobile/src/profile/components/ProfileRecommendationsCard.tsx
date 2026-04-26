import { Text, View } from 'react-native';
import {
  KangurMobileCard as Card,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobileMutedActionChip as MutedActionChip,
} from '../../shared/KangurMobileUi';
import { translateKangurMobileActionLabel } from '../../shared/translateKangurMobileActionLabel';
import { getPriorityLabel } from '../profile-primitives';
import type { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import type { KangurMobileLearnerSnapshot } from '@kangur/contracts/kangur-core';

type ProfileRecommendationsCardProps = {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: ReturnType<typeof useKangurMobileI18n>['locale'];
  snapshot: KangurMobileLearnerSnapshot;
  canNavigateToRecommendation: (page: string) => boolean;
  getActionHref: (action: { page: string; params?: Record<string, string> }) => string | null;
  recommendationsNote: string | null;
};

export function ProfileRecommendationsCard({
  copy,
  locale,
  snapshot,
  canNavigateToRecommendation,
  getActionHref,
  recommendationsNote,
}: ProfileRecommendationsCardProps): React.JSX.Element {
  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Tagesplan aus dem Profil',
            en: 'Daily plan from profile',
            pl: 'Plan dnia z profilu',
          })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Ordne die nächsten Schritte aus letzten Ergebnissen und Aktivitäten direkt aus dem Profil heraus an.',
            en: 'Line up the next steps from recent results and activity directly from the profile.',
            pl: 'Ułóż kolejne kroki z ostatnich wyników i aktywności bezpośrednio z poziomu profilu.',
          })}
        </Text>
      </View>

      {snapshot.recommendations.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14 }}>
          {copy({
            de: 'Keine Empfehlungen zum Anzeigen.',
            en: 'No recommendations to show.',
            pl: 'Brak rekomendacji do wyświetlenia.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {snapshot.recommendations.map((recommendation) => {
            const canNavigate = canNavigateToRecommendation(recommendation.action.page);
            const actionHref = getActionHref(recommendation.action);

            return (
              <InsetPanel key={recommendation.id} gap={8}>
                <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
                  {getPriorityLabel(recommendation.priority, locale)}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                  {recommendation.title}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {recommendation.description}
                </Text>

                {canNavigate && actionHref ? (
                  <LinkButton
                    href={actionHref}
                    label={translateKangurMobileActionLabel(
                      recommendation.action.label,
                      locale,
                    )}
                    tone='brand'
                  />
                ) : (
                  <MutedActionChip
                    label={`${translateKangurMobileActionLabel(
                      recommendation.action.label,
                      locale,
                    )} · ${copy({
                      de: 'bald',
                      en: 'soon',
                      pl: 'wkrótce',
                    })}`}
                  />
                )}
              </InsetPanel>
            );
          })}
        </View>
      )}

      {recommendationsNote !== null && recommendationsNote !== '' ? (
        <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
          {recommendationsNote}
        </Text>
      ) : null}
    </Card>
  );
}
