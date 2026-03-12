import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { formatKangurAiTutorTemplate } from '@/shared/contracts/kangur-ai-tutor-content';
import { cn } from '@/shared/utils';
import { useKangurAiTutorPanelBodyContext } from './KangurAiTutorPanelBody.context';
import { KangurNarratorControl } from './KangurNarratorControl';

import type { JSX } from 'react';

export function KangurAiTutorPanelAuxiliaryControls(): JSX.Element | null {
  const tutorContent = useKangurAiTutorContent();
  const auxiliaryContent = (
    tutorContent as {
      auxiliaryControls?: {
        toolboxDescription?: string;
        toolboxTitle?: string;
      };
    }
  ).auxiliaryControls;
  const drawingContent = (tutorContent as { drawing?: { toggleLabel?: string } }).drawing;
  const {
    canSendMessages,
    canStartHomeOnboardingManually,
    drawingMode,
    handleQuickAction,
    handleStartHomeOnboarding,
    handleToggleDrawing,
    homeOnboardingReplayLabel,
    isLoading,
    isUsageLoading,
    narratorSettings,
    remainingMessages,
    showToolboxLayout,
    shouldRenderAuxiliaryPanelControls,
    tutorNarrationScript,
    tutorNarratorContextRegistry,
    usageSummary,
    visibleProactiveNudge,
    visibleQuickActions,
  } = useKangurAiTutorPanelBodyContext();
  const shouldRenderNarratorControl = Boolean(tutorNarrationScript);
  const shouldRenderToolbox = showToolboxLayout;

  if (!shouldRenderAuxiliaryPanelControls && !shouldRenderToolbox) {
    return null;
  }

  return (
    <div
      className='flex flex-wrap gap-2 border-b kangur-chat-divider kangur-chat-padding-md'
      data-kangur-tts-ignore='true'
    >
      {shouldRenderToolbox ? (
        <div
          data-testid='kangur-ai-tutor-toolbox'
          className='w-full kangur-chat-card border kangur-chat-padding-md kangur-chat-surface-warm kangur-chat-surface-warm-shadow'
        >
          <div className='text-[10px] font-semibold uppercase tracking-[0.16em] [color:var(--kangur-chat-kicker-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'>
            {auxiliaryContent?.toolboxTitle ?? 'Narzędzia tutora'}
          </div>
          <div className='mt-1 text-[11px] leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
            {auxiliaryContent?.toolboxDescription ??
              'Skróty do wskazówek, rysowania i kolejnych kroków w bieżącej rozmowie.'}
          </div>
          <div className='mt-3 flex flex-wrap gap-2'>
            {shouldRenderNarratorControl ? (
              <KangurNarratorControl
                className='w-auto'
                contextRegistry={tutorNarratorContextRegistry}
                docId='kangur_ai_tutor_narrator'
                engine={narratorSettings.engine}
                pauseLabel={tutorContent.narrator.pauseLabel}
                readLabel={tutorContent.narrator.readLabel}
                resumeLabel={tutorContent.narrator.resumeLabel}
                script={tutorNarrationScript}
                shellTestId='kangur-ai-tutor-narrator-shell'
                voice={narratorSettings.voice}
              />
            ) : null}
            {canStartHomeOnboardingManually ? (
              <KangurButton
                data-testid='kangur-ai-tutor-home-onboarding-replay'
                type='button'
                size='sm'
                variant='surface'
                className='h-9 px-3 text-xs'
                onClick={handleStartHomeOnboarding}
              >
                {homeOnboardingReplayLabel}
              </KangurButton>
            ) : null}
            <KangurButton
              data-testid='kangur-ai-tutor-toolbox-drawing-toggle'
              type='button'
              size='sm'
              variant={drawingMode ? 'primary' : 'surface'}
              className='h-9 px-3 text-xs'
              disabled={isLoading || !canSendMessages}
              onClick={handleToggleDrawing}
            >
              {drawingContent?.toggleLabel ?? 'Rysuj'}
            </KangurButton>
            {visibleQuickActions.map((action) => (
              <KangurButton
                key={action.id}
                data-testid={`kangur-ai-tutor-toolbox-action-${action.id}`}
                type='button'
                size='sm'
                variant='surface'
                className='h-9 px-3 text-xs'
                disabled={isLoading || !canSendMessages}
                onClick={() => void handleQuickAction(action)}
              >
                {action.label}
              </KangurButton>
            ))}
          </div>
        </div>
      ) : null}
      {!shouldRenderToolbox && shouldRenderNarratorControl ? (
        <KangurNarratorControl
          className='w-auto'
          contextRegistry={tutorNarratorContextRegistry}
          docId='kangur_ai_tutor_narrator'
          engine={narratorSettings.engine}
          pauseLabel={tutorContent.narrator.pauseLabel}
          readLabel={tutorContent.narrator.readLabel}
          resumeLabel={tutorContent.narrator.resumeLabel}
          script={tutorNarrationScript}
          shellTestId='kangur-ai-tutor-narrator-shell'
          voice={narratorSettings.voice}
        />
      ) : null}
      {!shouldRenderToolbox && canStartHomeOnboardingManually ? (
        <KangurButton
          data-testid='kangur-ai-tutor-home-onboarding-replay'
          type='button'
          size='sm'
          variant='surface'
          className='h-9 px-3 text-xs'
          onClick={handleStartHomeOnboarding}
        >
          {homeOnboardingReplayLabel}
        </KangurButton>
      ) : null}
      {usageSummary && usageSummary.dailyMessageLimit !== null ? (
        <div
          className='w-full kangur-chat-inset border kangur-chat-padding-sm kangur-chat-surface-warm text-[11px] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
        >
          <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3'>
            <span className='font-semibold'>
              {formatKangurAiTutorTemplate(tutorContent.auxiliaryControls.dailyLimitTemplate, {
                count: usageSummary.messageCount,
                limit: usageSummary.dailyMessageLimit,
              })}
            </span>
            <span className='[color:var(--kangur-chat-kicker-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'>
              {isUsageLoading
                ? tutorContent.auxiliaryControls.usageRefreshing
                : remainingMessages === 0
                  ? tutorContent.auxiliaryControls.usageExhausted
                  : formatKangurAiTutorTemplate(
                    tutorContent.auxiliaryControls.usageRemainingTemplate,
                    { remaining: remainingMessages }
                  )}
            </span>
          </div>
        </div>
      ) : null}
      {visibleProactiveNudge ? (
        <div
          data-testid='kangur-ai-tutor-proactive-nudge'
          data-nudge-mode={visibleProactiveNudge.mode}
          className={cn(
            'w-full kangur-chat-inset border kangur-chat-padding-md',
            visibleProactiveNudge.mode === 'coach'
              ? 'kangur-chat-surface-info kangur-chat-surface-info-shadow'
              : 'kangur-chat-surface-success kangur-chat-surface-success-shadow'
          )}
        >
          <div className='flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
            <span className='inline-flex h-1.5 w-1.5 rounded-full bg-current opacity-50' />
            {visibleProactiveNudge.title}
          </div>
          <div className='mt-1 text-sm font-semibold [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
            {visibleProactiveNudge.action.label}
          </div>
          <div className='mt-1 text-xs leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
            {visibleProactiveNudge.description}
          </div>
          <KangurButton
            data-testid='kangur-ai-tutor-proactive-nudge-button'
            type='button'
            size='sm'
            variant='surface'
            className='mt-3 h-9 w-full px-3 text-xs sm:w-auto'
            disabled={isLoading || !canSendMessages}
            onClick={() =>
              void handleQuickAction(visibleProactiveNudge.action, {
                source: 'proactive_nudge',
              })
            }
          >
            {tutorContent.proactiveNudges.buttonLabel}
          </KangurButton>
        </div>
      ) : null}
    </div>
  );
}
