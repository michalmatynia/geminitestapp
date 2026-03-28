import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';

export const UKRAINIAN_KANGUR_AI_TUTOR_CONTENT_COPY: Partial<KangurAiTutorContent> = {
  locale: 'uk',
    panelChrome: {
      detachFromContextAria: 'Перестати стежити за поточним вмістом',
      detachFromContextLabel: 'Відкріпити',
      followingContextLabel: 'Стежить за вмістом',
      moveToContextAria: 'Перемістити панель поруч із поточним вмістом',
      moveToContextLabel: 'Поруч із вмістом',
      moodPrefix: 'Настрій',
      resetPositionAria: 'Відновити стандартну позицію панелі',
      resetPositionLabel: 'Скинути позицію',
      snapPreviewPrefix: 'Відпустіть, щоб пристикувати',
      snapTargets: {
        bottom: 'вниз',
        bottomLeft: 'у нижній лівий кут',
        bottomRight: 'у нижній правий кут',
        left: 'до лівого краю',
        right: 'до правого краю',
        top: 'вгору',
        topLeft: 'у верхній лівий кут',
        topRight: 'у верхній правий кут',
      },
      surfaceLabels: {
        test: 'Тест',
        game: 'Гра',
        lesson: 'Урок',
        profile: 'Профіль',
        parent_dashboard: 'Панель для батьків',
        auth: 'Вхід',
      },
      contextFallbackTargets: {
        test: 'Нове тестове запитання',
        game: 'Новий крок гри',
        lesson: 'Новий фрагмент уроку',
        profile: 'Нова панель профілю',
        parent_dashboard: 'Нова батьківська панель',
        auth: 'Екран входу',
      },
    },
};
