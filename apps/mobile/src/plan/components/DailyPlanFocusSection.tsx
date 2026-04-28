import { Text, View } from 'react-native';
import { KangurMobileCard as Card } from '../../shared/KangurMobileUi';
import { FocusCard } from '../daily-plan-primitives';
import { type KangurMobileCopy } from '../../i18n/kangurMobileI18n';

interface FocusRecord {
  historyHref: string;
  lessonHref: string;
  operation: string;
  practiceHref: string;
}

interface DailyPlanFocusSectionProps {
  copy: KangurMobileCopy;
  isLoading: boolean;
  isAuthenticated: boolean;
  scoreError: string | null;
  weakestFocus: FocusRecord | null;
  strongestFocus: FocusRecord | null;
}

export function DailyPlanFocusSection({
  copy,
  isLoading,
  isAuthenticated,
  scoreError,
  weakestFocus,
  strongestFocus,
}: DailyPlanFocusSectionProps): React.JSX.Element {
  if (isLoading) {
    return (
      <Card>
        <Text style={{ color: '#475569' }}>
          {copy({
            de: 'Der ergebnisbasierte Fokus wird geladen...',
            en: 'Loading score-based focus...',
            pl: 'Ładujemy fokus oparty na wynikach...',
          })}
        </Text>
      </Card>
    );
  }

  if (scoreError !== null && scoreError !== '') {
    return (
      <Card>
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{scoreError}</Text>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <Text style={{ color: '#475569', lineHeight: 22 }}>
          {copy({
            de: 'Melde dich an, um Hinweise für den stärksten und schwächsten Modus freizuschalten.',
            en: 'Sign in to unlock guidance for the strongest and weakest modes.',
            pl: 'Zaloguj się, aby odblokować wskazówki dla najmocniejszego i najsłabszego trybu.',
          })}
        </Text>
      </Card>
    );
  }

  if (weakestFocus === null && strongestFocus === null) {
    return (
      <Card>
        <Text style={{ color: '#475569', lineHeight: 22 }}>
          {copy({
            de: 'Schließe einen Lauf ab, um den ersten Trainingsfokus aufzubauen.',
            en: 'Finish one run to build the first training focus.',
            pl: 'Ukończ jedną serię, aby zbudować pierwszy fokus treningowy.',
          })}
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
        {copy({ de: 'Trainingsfokus', en: 'Training focus', pl: 'Fokus treningowy' })}
      </Text>
      <View style={{ gap: 12 }}>
        {weakestFocus !== null && (
          <FocusCard
            accentColor='#b91c1c'
            description={copy({
              de: 'Das ist aktuell der schwächste Bereich in deinen Ergebnissen. Zacznij od krótkiej celowanej serii, a potem wróć do pasującej lekcji, wenn es nötig ist.',
              en: 'This is currently the weakest area in your results. Start with a short targeted run and then return to the matching lesson if needed.',
              pl: 'To obecnie najsłabszy obszar w Twoich wynikach. Zacznij od krótkiej celowanej serii, a potem wróć do pasującej lekcji, jeśli będzie trzeba.',
            })}
            historyHref={weakestFocus.historyHref}
            lessonHref={weakestFocus.lessonHref}
            operation={weakestFocus.operation}
            practiceHref={weakestFocus.practiceHref}
            title={copy({ de: 'Zum Wiederholen', en: 'Needs review', pl: 'Do powtórki' })}
          />
        )}
        {strongestFocus !== null && (
          <FocusCard
            accentColor='#047857'
            description={copy({
              de: 'Dieser Modus ist gerade am stabilsten. Nutze ihn für einen schnellen Selbstvertrauensschub oder ein kurzes Aufwärmen.',
              en: 'This mode is the most stable right now. Use it for a quick confidence boost or a light warm-up.',
              pl: 'Ten tryb jest teraz najbardziej stabilny. Użyj go do szybkiego podbicia pewności albo lekkiej rozgrzewki.',
            })}
            historyHref={strongestFocus.historyHref}
            lessonHref={strongestFocus.lessonHref}
            operation={strongestFocus.operation}
            practiceHref={strongestFocus.practiceHref}
            title={copy({ de: 'Stärkster Modus', en: 'Strongest mode', pl: 'Najmocniejszy tryb' })}
          />
        )}
      </View>
    </Card>
  );
}
