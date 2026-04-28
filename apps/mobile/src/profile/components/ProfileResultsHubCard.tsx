import { Text, View } from 'react-native';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';
import {
  formatKangurMobileScoreOperation,
  getSessionAccentTone,
  getSessionScoreTone,
} from '../../scores/mobileScoreSummary';
import { createKangurPlanHref } from '../../plan/planHref';
import { type KangurMobileCopy, type useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { type useKangurMobileProfileRecentResults, type UseKangurMobileProfileRecentResultsResult } from '../useKangurMobileProfileRecentResults';
import type { Href } from 'expo-router';

type ProfileResultsHubCardProps = {
  copy: KangurMobileCopy;
  locale: ReturnType<typeof useKangurMobileI18n>['locale'];
  profileRecentResults: UseKangurMobileProfileRecentResultsResult;
  resultsRoute: Href;
};

const getResultsHubMessage = (recentResults: UseKangurMobileProfileRecentResultsResult, copy: KangurMobileCopy): string => {
  if (recentResults.isLoading || recentResults.isRestoringAuth) {
    return copy({
      de: 'Die gespeicherten Versuche für das Profil werden geladen.',
      en: 'Loading saved attempts for the profile.',
      pl: 'Pobieramy zapisane podejścia dla profilu.',
    });
  }
  if (!recentResults.isEnabled) {
    return copy({
      de: 'Melde dich an, um hier Ergebnisse und den vollständigen Verlauf zu sehen.',
      en: 'Sign in to see results and the full history here.',
      pl: 'Zaloguj się, aby zobaczyć tutaj wyniki i pełną historię.',
    });
  }
  if (recentResults.error !== null && recentResults.error !== '') {
    return recentResults.error;
  }
  return copy({
    de: 'Stąd możesz odświeżyć wyniki, otworzyć pełną historię und od razu przejść do kolejnego kroku nauki.',
    en: 'From here you can refresh results, open the full history, and jump straight into the next study step.',
    pl: 'Stąd możesz odświeżyć wyniki, otworzyć pełną historię i od razu przejść do kolejnego kroku nauki.',
  });
};

export function ProfileResultsHubCard({
  copy,
  locale,
  profileRecentResults,
  resultsRoute,
}: ProfileResultsHubCardProps): React.JSX.Element {
  const recentProfileSessionCount = profileRecentResults.recentResultItems.length;
  const recentProfileBestAccuracy =
    recentProfileSessionCount > 0
      ? Math.max(
          ...profileRecentResults.recentResultItems.map((item) => {
            const res = item.result;
            return res.total_questions > 0 
              ? Math.round((res.correct_answers / res.total_questions) * 100) 
              : 0;
          }),
        )
      : null;
  const latestProfileResult = profileRecentResults.recentResultItems[0] ?? null;

  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Ergebnisse im Profil',
            en: 'Results in profile',
            pl: 'Wyniki w profilu',
          })}
        </Text>
        <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
          {copy({
            de: 'Ergebniszentrale',
            en: 'Results hub',
            pl: 'Centrum wyników',
          })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {getResultsHubMessage(profileRecentResults, copy)}
        </Text>
      </View>

      {profileRecentResults.isEnabled &&
      !profileRecentResults.isLoading &&
      !profileRecentResults.isRestoringAuth &&
      (profileRecentResults.error === null || profileRecentResults.error === '') &&
      recentProfileSessionCount > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Pill
            label={copy({
              de: `Ergebnisse ${recentProfileSessionCount}`,
              en: `Results ${recentProfileSessionCount}`,
              pl: `Wyniki ${recentProfileSessionCount}`,
            })}
            tone={{
              backgroundColor: '#eef2ff',
              borderColor: '#c7d2fe',
              textColor: '#4338ca',
            }}
          />
          {recentProfileBestAccuracy !== null ? (
            <Pill
              label={copy({
                de: `Bestes Ergebnis ${recentProfileBestAccuracy}%`,
                en: `Best accuracy ${recentProfileBestAccuracy}%`,
                pl: `Najlepsza skuteczność ${recentProfileBestAccuracy}%`,
              })}
              tone={getSessionScoreTone(recentProfileBestAccuracy)}
            />
          ) : null}
          {latestProfileResult !== null ? (
            <Pill
              label={copy({
                de: `Letzter Modus ${formatKangurMobileScoreOperation(
                  latestProfileResult.result.operation,
                  locale,
                )}`,
                en: `Latest mode ${formatKangurMobileScoreOperation(
                  latestProfileResult.result.operation,
                  locale,
                )}`,
                pl: `Ostatni tryb ${formatKangurMobileScoreOperation(
                  latestProfileResult.result.operation,
                  locale,
                )}`,
              })}
              tone={getSessionAccentTone(latestProfileResult.result.operation)}
            />
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <ActionButton
          label={copy({
            de: 'Aktualisieren',
            en: 'Refresh',
            pl: 'Odśwież',
          })}
          onPress={() => {
            void profileRecentResults.refresh();
          }}
          stretch
          style={{ borderRadius: 16 }}
          tone='primary'
          verticalPadding={12}
        />

        <LinkButton
          href={resultsRoute}
          label={copy({
            de: 'Vollständigen Verlauf öffnen',
            en: 'Open full history',
            pl: 'Otwórz pełną historię',
          })}
          stretch
          style={{ borderRadius: 16 }}
          verticalPadding={12}
        />

        <LinkButton
          href={createKangurPlanHref()}
          label={copy({
            de: 'Tagesplan öffnen',
            en: 'Open daily plan',
            pl: 'Otwórz plan dnia',
          })}
          stretch
          style={{ borderRadius: 16 }}
          verticalPadding={12}
        />
      </View>
    </Card>
  );
}
