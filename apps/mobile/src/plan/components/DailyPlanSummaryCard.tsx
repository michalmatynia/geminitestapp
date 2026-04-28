import { Text, View } from 'react-native';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';
import { type KangurMobileCopy } from '../../i18n/kangurMobileI18n';
import { RESULTS_ROUTE, DUELS_ROUTE } from '../daily-plan-primitives';

interface DailyPlanSummaryCardProps {
    copy: KangurMobileCopy;
    isLoadingAuth: boolean;
    isAuthenticated: boolean;
    displayName: string;
    assignmentsCount: number;
    resultsCount: number;
    lessonsCount: number;
    refresh: () => void;
    signIn: () => void;
    supportsLearnerCredentials: boolean;
    authError: string | null;
}

function SummaryHeader({ copy }: { copy: KangurMobileCopy }): React.JSX.Element {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({ de: 'Tagesplan', en: 'Daily plan', pl: 'Plan dnia' })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
        {copy({ de: 'Ein Ort für heute', en: 'One place for today', pl: 'Jedno miejsce na dziś' })}
      </Text>
    </View>
  );
}

function SummaryStats({
  copy,
  assignmentsCount,
  resultsCount,
  lessonsCount,
}: {
  copy: KangurMobileCopy;
  assignmentsCount: number;
  resultsCount: number;
  lessonsCount: number;
}): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pill
        label={copy({ de: `Aufgaben ${assignmentsCount}`, en: `Tasks ${assignmentsCount}`, pl: `Zadania ${assignmentsCount}` })}
        tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }}
      />
      <Pill
        label={copy({ de: `Ergebnisse ${resultsCount}`, en: `Results ${resultsCount}`, pl: `Wyniki ${resultsCount}` })}
        tone={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' }}
      />
      <Pill
        label={copy({ de: `Lektionen ${lessonsCount}`, en: `Lessons ${lessonsCount}`, pl: `Lekcje ${lessonsCount}` })}
        tone={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' }}
      />
    </View>
  );
}

function SummaryActions({
  copy,
  refresh,
}: {
  copy: KangurMobileCopy;
  refresh: () => void;
}): React.JSX.Element {
  return (
    <View style={{ alignSelf: 'stretch', gap: 10 }}>
      <LinkButton href='/practice?operation=mixed' label={copy({ de: 'Gemischtes Training starten', en: 'Start mixed practice', pl: 'Uruchom trening mieszany' })} tone='primary' stretch />
      <LinkButton href={RESULTS_ROUTE} label={copy({ de: 'Ergebnisse öffnen', en: 'Open results', pl: 'Otwórz wyniki' })} stretch />
      <LinkButton href={DUELS_ROUTE} label={copy({ de: 'Duelle öffnen', en: 'Open duels', pl: 'Otwórz pojedynki' })} stretch />
      <ActionButton label={copy({ de: 'Plan aktualisieren', en: 'Refresh plan', pl: 'Odśwież plan' })} onPress={() => { void refresh(); }} stretch tone='secondary' />
    </View>
  );
}

function AuthStateContent({
  copy,
  isLoadingAuth,
  isAuthenticated,
  signIn,
  supportsLearnerCredentials,
  authError,
}: {
  copy: KangurMobileCopy;
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  signIn: () => void;
  supportsLearnerCredentials: boolean;
  authError: string | null;
}): React.JSX.Element | null {
  if (isLoadingAuth && !isAuthenticated) {
    return (
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({ de: 'Die Anmeldung wird wiederhergestellt. Sobald sie bereit ist, lädt der Plan Ergebnisse und Trainingshinweise.', en: 'Restoring sign-in. Once it is ready, the plan will load results and training guidance.', pl: 'Przywracamy logowanie. Gdy będzie gotowe, plan pobierze wyniki i wskazówki treningowe.' })}
      </Text>
    );
  }
  if (!isAuthenticated) {
    if (supportsLearnerCredentials) {
      return (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({ de: 'Melde dich an, um Ergebnisse, Trainingsfokus und letzte Fortschritte zu laden.', en: 'Sign in to load results, training focus, and recent progress.', pl: 'Zaloguj się, aby pobrać wyniki, fokus treningowy i ostatnie postępy.' })}
          </Text>
          <LinkButton href='/' label={copy({ de: 'Zum Login', en: 'Go to sign in', pl: 'Przejdź do logowania' })} />
        </View>
      );
    }
    return <ActionButton label={copy({ de: 'Demo starten', en: 'Start demo', pl: 'Uruchom demo' })} onPress={() => { void signIn(); }} tone='brand' />;
  }
  return authError ? <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{authError}</Text> : null;
}

export function DailyPlanSummaryCard({
  copy,
  isLoadingAuth,
  isAuthenticated,
  displayName,
  assignmentsCount,
  resultsCount,
  lessonsCount,
  refresh,
  signIn,
  supportsLearnerCredentials,
  authError,
}: DailyPlanSummaryCardProps): React.JSX.Element {
  return (
    <Card>
      <SummaryHeader copy={copy} />
      <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
        {Boolean(isLoadingAuth) && !isAuthenticated
          ? copy({ de: 'Die Anmeldung und der letzte Plan auf Basis von Ergebnissen und Fortschritt werden wiederhergestellt.', en: 'Restoring sign-in and the latest plan based on results and progress.', pl: 'Przywracamy logowanie oraz ostatni plan oparty na wynikach i postępie.' })
          : copy({ de: `Ein fokussierter Lernplan für ${displayName} aus Training, Lektionen und den wichtigsten Ergebnissen.`, en: `A focused learning plan for ${displayName}, built from practice, lessons, and the most important results.`, pl: `Skupiony plan nauki dla ${displayName}, złożony z treningu, lekcji i najważniejszych wyników.` })}
      </Text>
      <SummaryStats copy={copy} assignmentsCount={assignmentsCount} resultsCount={resultsCount} lessonsCount={lessonsCount} />
      <SummaryActions copy={copy} refresh={refresh} />
      <AuthStateContent
        copy={copy}
        isLoadingAuth={isLoadingAuth}
        isAuthenticated={isAuthenticated}
        signIn={signIn}
        supportsLearnerCredentials={supportsLearnerCredentials}
        authError={authError}
      />
    </Card>
  );
}
