import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { formatKangurAiTutorTemplate } from '@/shared/contracts/kangur-ai-tutor-content';
import { useKangurAiTutorPanelBodyContext } from './KangurAiTutorPanelBody.context';
import { KangurNarratorControl } from './KangurNarratorControl';


import type { JSX } from 'react';

export function KangurAiTutorPanelAuxiliaryControls(): JSX.Element | null {
  const tutorContent = useKangurAiTutorContent();
  const {
    canSendMessages,
    canStartHomeOnboardingManually,
    handleQuickAction,
    handleStartHomeOnboarding,
    homeOnboardingReplayLabel,
    isLoading,
    isUsageLoading,
    narratorSettings,
    remainingMessages,
    shouldRenderAuxiliaryPanelControls,
    tutorNarrationScript,
    tutorNarratorContextRegistry,
    usageSummary,
    visibleProactiveNudge,
  } = useKangurAiTutorPanelBodyContext();
  const shouldRenderNarratorControl = Boolean(tutorNarrationScript);

  if (!shouldRenderAuxiliaryPanelControls) {
    return null;
  }

  return (
    <div
      className='flex flex-wrap gap-2 border-b px-3 py-3 [border-color:var(--kangur-soft-card-border)]'
      data-kangur-tts-ignore='true'
    >
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
      {usageSummary && usageSummary.dailyMessageLimit !== null ? (
        <div
          className='w-full rounded-2xl border px-3 py-2 text-[11px] text-amber-900'
          style={{
            background:
              'color-mix(in srgb, var(--kangur-soft-card-background) 82%, rgba(254,243,199,0.92))',
            borderColor:
              'color-mix(in srgb, var(--kangur-soft-card-border) 72%, rgb(251 191 36))',
          }}
        >
          <div className='flex items-center justify-between gap-3'>
            <span className='font-semibold'>
              {formatKangurAiTutorTemplate(tutorContent.auxiliaryControls.dailyLimitTemplate, {
                count: usageSummary.messageCount,
                limit: usageSummary.dailyMessageLimit,
              })}
            </span>
            <span className='text-amber-700'>
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
          className='w-full rounded-2xl border px-3 py-3 shadow-sm'
          style={{
            background:
              visibleProactiveNudge.mode === 'coach'
                ? 'color-mix(in srgb, var(--kangur-soft-card-background) 82%, rgba(224,242,254,0.94))'
                : 'color-mix(in srgb, var(--kangur-soft-card-background) 82%, rgba(209,250,229,0.92))',
            borderColor:
              visibleProactiveNudge.mode === 'coach'
                ? 'color-mix(in srgb, var(--kangur-soft-card-border) 74%, rgb(125 211 252))'
                : 'color-mix(in srgb, var(--kangur-soft-card-border) 74%, rgb(110 231 183))',
          }}
        >
          <div className='text-[10px] font-semibold uppercase tracking-[0.16em] [color:var(--kangur-page-muted-text)]'>
            {visibleProactiveNudge.title}
          </div>
          <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
            {visibleProactiveNudge.action.label}
          </div>
          <div className='mt-1 text-xs leading-relaxed [color:var(--kangur-page-muted-text)]'>
            {visibleProactiveNudge.description}
          </div>
          <KangurButton
            data-testid='kangur-ai-tutor-proactive-nudge-button'
            type='button'
            size='sm'
            variant='surface'
            className='mt-3 h-9 px-3 text-xs'
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
