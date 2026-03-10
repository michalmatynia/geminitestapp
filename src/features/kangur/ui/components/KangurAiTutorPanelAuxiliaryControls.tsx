import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { formatKangurAiTutorTemplate } from '@/shared/contracts/kangur-ai-tutor-content';
import { cn } from '@/shared/utils';

import { useKangurAiTutorPanelBodyContext } from './KangurAiTutorPanelBody.context';
import { KangurNarratorControl } from './KangurNarratorControl';


import type { JSX } from 'react';

export function KangurAiTutorPanelAuxiliaryControls(): JSX.Element | null {
  const tutorContent = useKangurAiTutorContent();
  const {
    canNarrateTutorText,
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

  if (!shouldRenderAuxiliaryPanelControls) {
    return null;
  }

  return (
    <div
      className='flex flex-wrap gap-2 border-b border-slate-100 px-3 py-3'
      data-kangur-tts-ignore='true'
    >
      {canNarrateTutorText ? (
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
        <div className='w-full rounded-2xl border border-amber-100 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-900'>
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
          className={cn(
            'w-full rounded-2xl border px-3 py-3 shadow-sm',
            visibleProactiveNudge.mode === 'coach'
              ? 'border-sky-100 bg-sky-50/85'
              : 'border-emerald-100 bg-emerald-50/85'
          )}
        >
          <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500'>
            {visibleProactiveNudge.title}
          </div>
          <div className='mt-1 text-sm font-semibold text-slate-800'>
            {visibleProactiveNudge.action.label}
          </div>
          <div className='mt-1 text-xs leading-relaxed text-slate-600'>
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
