import { Text, View } from 'react-native';

import {
  INDIGO_TONE,
  SUCCESS_TONE,
} from '../../shared/KangurAssessmentUi';
import {
  KangurMobileCard as Card,
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';
import { ActionButton, OutlineLink, HOME_ROUTE, PROFILE_ROUTE } from '../parent-dashboard-primitives';

interface ParentHeroCardProps {
  copy: (text: Record<string, string>) => string;
  description: string;
  learnersCount: number;
  activeLearnerName?: string;
  isAuthenticated: boolean;
  canAccessDashboard: boolean;
  refreshDashboard: () => void;
}

export function ParentHeroCard({
  copy,
  description,
  learnersCount,
  activeLearnerName,
  isAuthenticated,
  canAccessDashboard,
  refreshDashboard,
}: ParentHeroCardProps) {
  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Überblick und Planung',
          en: 'Oversight and planning',
          pl: 'Nadzór i planowanie',
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
        {copy({
          de: 'Elternbereich',
          en: 'Parent dashboard',
          pl: 'Panel rodzica',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
        {description}
      </Text>

      {canAccessDashboard && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Pill
            label={copy({
              de: `Lernende ${learnersCount}`,
              en: `Learners ${learnersCount}`,
              pl: `Uczniowie ${learnersCount}`,
            })}
            tone={INDIGO_TONE}
          />
          <Pill
            label={
              activeLearnerName
                ? copy({
                    de: `Aktiv ${activeLearnerName}`,
                    en: `Active ${activeLearnerName}`,
                    pl: `Aktywny ${activeLearnerName}`,
                  })
                : copy({
                    de: 'Lernenden wählen',
                    en: 'Choose learner',
                    pl: 'Wybierz ucznia',
                  })
            }
            tone={SUCCESS_TONE}
          />
        </View>
      )}

      <View style={{ gap: 10 }}>
        {!isAuthenticated ? (
          <OutlineLink
            href={HOME_ROUTE}
            label={copy({
              de: 'Zum Login',
              en: 'Go to sign in',
              pl: 'Przejdź do logowania',
            })}
          />
        ) : !canAccessDashboard ? (
          <OutlineLink
            href={PROFILE_ROUTE}
            label={copy({
              de: 'Lernprofil öffnen',
              en: 'Open learner profile',
              pl: 'Otwórz profil ucznia',
            })}
          />
        ) : (
          <ActionButton
            label={copy({
              de: 'Elternbereich aktualisieren',
              en: 'Refresh parent dashboard',
              pl: 'Odśwież panel rodzica',
            })}
            onPress={refreshDashboard}
            tone='secondary'
          />
        )}
      </View>
    </Card>
  );
}
