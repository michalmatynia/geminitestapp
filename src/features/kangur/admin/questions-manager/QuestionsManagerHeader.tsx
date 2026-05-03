import { KangurQuestionsHeader } from '../components/KangurQuestionsHeader';

export function QuestionsManagerHeader({ copy, currentSuite, questions, health, canPublishAndGoLive, canPublishReady, isSaving, mutations }: { copy: any; currentSuite: any; questions: any[]; health: any; canPublishAndGoLive: boolean; canPublishReady: boolean; isSaving: boolean; mutations: any; }) {
  return (
    <KangurQuestionsHeader
      copy={copy.header}
      currentSuite={currentSuite}
      questionCount={questions.length}
      formatQuestionCount={copy.formatQuestionCount}
      readyCount={0}
      richQuestionCount={0}
      needsReviewCount={0}
      needsFixCount={0}
      illustratedCount={0}
      reviewQueueCount={0}
      draftCount={0}
      readyToPublishCount={0}
      publishedCount={0}
      currentSuiteHealth={health}
      canPublishAndGoLive={canPublishAndGoLive}
      canPublishReady={canPublishReady}
      isSaving={isSaving}
      onPublishAndGoLive={mutations.handlePublishAndGoLiveCurrentSuite}
      onPublishReady={mutations.handlePublishReadyForCurrentSuite}
      onGoLive={mutations.handleGoLiveCurrentSuite}
      onTakeOffline={mutations.handleTakeCurrentSuiteOffline}
      onAddQuestion={mutations.openCreate}
      onBack={mutations.onClose}
    />
  );
}
