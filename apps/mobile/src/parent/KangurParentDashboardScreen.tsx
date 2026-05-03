import { useState } from 'react';
import { View } from 'react-native';

import { KangurMobileAiTutorCard } from '../ai-tutor/KangurMobileAiTutorCard';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { KangurMobileLinkButton as LinkButton, KangurMobileScrollScreen } from '../shared/KangurMobileUi';
import { HOME_ROUTE, type ParentDashboardTabId } from './parent-dashboard-primitives';
import { useKangurMobileParentDashboard } from './useKangurMobileParentDashboard';
import { ParentHeroCard } from './components/ParentHeroCard';
import { ParentLearnerSection } from './components/ParentLearnerSection';
import { ParentTabsSection } from './components/ParentTabsSection';

type DashboardData = ReturnType<typeof useKangurMobileParentDashboard>;

function getDashboardDescription(dashboard: DashboardData, copy: (text: Record<string, string>) => string): string {
  if (dashboard.isLoadingAuth === true && dashboard.isAuthenticated !== true) {
    return copy({
      de: 'Wir stellen die Eltern-Anmeldung und den zuletzt gewählten Lernenden wieder her.',
      en: 'Restoring the parent sign-in and the last selected learner.',
      pl: 'Przywracamy logowanie rodzica i ostatnio wybranego ucznia.',
    });
  }
  if (dashboard.isAuthenticated !== true) {
    return copy({
      de: 'Melde dich mit einem Elternkonto an, um Lernende zu wechseln, Fortschritt zu prüfen und Aufgaben zu ordnen.',
      en: 'Sign in to a parent account to switch learners, review progress, and organise assignments.',
      pl: 'Zaloguj się na konto rodzica, aby przełączać uczniów, sprawdzać postęp i porządkować zadania.',
    });
  }
  if (dashboard.canAccessDashboard !== true) {
    return copy({
      de: 'Dieser Bereich ist für Elternkonten gedacht, die Lernprofiles verwalten können.',
      en: 'This space is reserved for parent accounts that can manage learner profiles.',
      pl: 'To miejsce jest przeznaczone dla kont rodzica, które mogą zarządzać profilami uczniów.',
    });
  }
  if (dashboard.activeLearner !== null) {
    return copy({
      de: `Du beobachtest gerade ${dashboard.activeLearner.displayName}. Von hier aus kannst du Lernende wechseln und Fortschritt, Ergebnisse sowie aktive Aufgaben prüfen.`,
      en: `You are currently reviewing ${dashboard.activeLearner.displayName}. From here you can switch learners and check progress, results, and active assignments.`,
      pl: `Aktualnie obserwujesz ${dashboard.activeLearner.displayName}. Stąd możesz szybko przełączyć ucznia i sprawdzić jego postęp, wyniki oraz aktywne zadania.`,
    });
  }
  return copy({
    de: 'Wähle einen Lernenden aus, um Fortschritt, Ergebnisse und aktive Aufgaben zu sehen.',
    en: 'Pick a learner to see their progress, results, and active assignments.',
    pl: 'Wybierz ucznia, aby zobaczyć jego postęp, wyniki i aktywne zadania.',
  });
}

function getActiveTabDescription(activeTab: ParentDashboardTabId, copy: (text: Record<string, string>) => string): string {
  if (activeTab === 'progress') {
    return copy({
      de: 'Prüfe Level, Serie und Tagesziel des ausgewählten Lernenden.',
      en: 'Review the selected learner level, streak, and daily goal.',
      pl: 'Sprawdź poziom, serię i cel dnia wybranego ucznia.',
    });
  }
  if (activeTab === 'results') {
    return copy({
      de: 'Prüfe die neuesten Ergebnisse und öffne bei Bedarf den vollständigen Verlauf.',
      en: 'Review the latest results and open the full history when needed.',
      pl: 'Przejrzyj najnowsze wyniki i otwórz pełną historię, gdy będzie potrzebna.',
    });
  }
  if (activeTab === 'assignments') {
    return copy({
      de: 'Öffne aktuelle Prioritäten und springe direkt in Lektionen oder Training.',
      en: 'Open current priorities and jump straight into lessons or practice.',
      pl: 'Otwórz bieżące priorytety i przejdź od razu do lekcji albo treningu.',
    });
  }
  if (activeTab === 'monitoring') {
    return copy({
      de: 'Vergleiche den Status aktueller Aufgaben und prüfe, wo Lernende Unterstützung brauchen.',
      en: 'Compare current assignment status and see where learners need support.',
      pl: 'Porównaj status bieżących zadań i sprawdź, gdzie uczeń potrzebuje wsparcia.',
    });
  }
  return copy({
    de: 'Öffne den aktuellen AI-Tutor-Kontext des ausgewählten Lernenden.',
    en: 'Open the current tutor context for the selected learner.',
    pl: 'Otwórz bieżący kontekst AI Tutora dla wybranego ucznia.',
  });
}

function getFocusProps(dashboard: DashboardData): { focusId: string; focusKind: 'hero' | 'screen' } {
  if (dashboard.canAccessDashboard === true && dashboard.activeLearner) {
    return { focusId: 'kangur-parent-dashboard-learner-management', focusKind: 'screen' };
  }
  return { focusId: 'kangur-parent-dashboard-hero', focusKind: 'hero' };
}

function getTutorContext(dashboard: DashboardData, copy: (text: Record<string, string>) => string): { 
  contentId: string; 
  description: string; 
  focusId: string; 
  focusKind: 'hero' | 'screen'; 
  surface: 'parent_dashboard'; 
  title: string; 
} {
  const contentId = dashboard.canAccessDashboard === true 
    ? `parent-dashboard:${dashboard.selectedLearnerId ?? 'none'}` 
    : 'parent-dashboard:guest';
  
  const description = dashboard.canAccessDashboard === true && dashboard.activeLearner
    ? copy({
        de: `Du beobachtest gerade ${dashboard.activeLearner.displayName}.`,
        en: `You are currently reviewing ${dashboard.activeLearner.displayName}.`,
        pl: `Aktualnie obserwujesz ${dashboard.activeLearner.displayName}.`,
      })
    : copy({
        de: 'Wähle zuerst einen Lernenden aus, bevor du Fortschritt, Ergebnisse und Aufgaben vergleichst.',
        en: 'Pick a learner first before you compare progress, results, and assignments.',
        pl: 'Najpierw wybierz ucznia, zanim porównasz postęp, wyniki i zadania.',
      });

  const { focusId, focusKind } = getFocusProps(dashboard);

  return {
    contentId,
    description,
    focusId,
    focusKind,
    surface: 'parent_dashboard' as const,
    title: dashboard.canAccessDashboard === true 
      ? (dashboard.activeLearner?.displayName ?? dashboard.parentDisplayName) 
      : dashboard.parentDisplayName,
  };
}

export function KangurParentDashboardScreen(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const dashboard = useKangurMobileParentDashboard();
  const [activeTab, setActiveTab] = useState<ParentDashboardTabId>('progress');
  const tutorContext = getTutorContext(dashboard, copy);

  return (
    <KangurMobileScrollScreen
      contentContainerStyle={{
        gap: 18,
        paddingHorizontal: 20,
        paddingVertical: 24,
      }}
    >
      <View style={{ gap: 14 }}>
        <LinkButton
          href={HOME_ROUTE}
          label={copy({ de: 'Zurück', en: 'Back', pl: 'Wróć' })}
          stretch
        />
        <ParentHeroCard
          activeLearnerName={dashboard.activeLearner?.displayName}
          canAccessDashboard={dashboard.canAccessDashboard === true}
          copy={copy}
          description={getDashboardDescription(dashboard, copy)}
          isAuthenticated={dashboard.isAuthenticated === true}
          learnersCount={dashboard.learners.length}
          refreshDashboard={() => { void dashboard.refreshDashboard(); }}
        />
        {!dashboard.canAccessDashboard && (
          <KangurMobileAiTutorCard context={tutorContext} />
        )}
        {dashboard.canAccessDashboard === true && (
          <>
            <ParentLearnerSection
              copy={copy}
              learners={dashboard.learners}
              selectLearner={(id) => { void dashboard.selectLearner(id); }}
              selectedLearnerId={dashboard.selectedLearnerId}
              selectionError={dashboard.selectionError}
              switchingLearnerId={dashboard.switchingLearnerId}
            />
            <ParentTabsSection
              activeTab={activeTab}
              activeTabDescription={getActiveTabDescription(activeTab, copy)}
              copy={copy}
              setActiveTab={setActiveTab}
            />
          </>
        )}
      </View>
    </KangurMobileScrollScreen>
  );
}
