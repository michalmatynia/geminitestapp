import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton, KangurPanelRow } from '@/features/kangur/ui/design/primitives';
import { KANGUR_WRAP_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { formatKangurAiTutorTemplate } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import { useKangurAiTutorPanelBodyContext } from './KangurAiTutorPanelBody.context';

import type { JSX } from 'react';

type AuxiliaryFallbackCopy = {
  drawingToggleLabel: string;
  toolboxDescription: string;
  toolboxTitle: string;
};

const getAuxiliaryFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): AuxiliaryFallbackCopy => {
  if (locale === 'uk') {
    return {
      drawingToggleLabel: 'Малюй',
      toolboxDescription:
        'Швидкий доступ до підказок, малювання та наступних кроків у поточній розмові.',
      toolboxTitle: 'Інструменти тьютора',
    };
  }

  if (locale === 'de') {
    return {
      drawingToggleLabel: 'Zeichnen',
      toolboxDescription:
        'Schnellzugriffe fur Hinweise, Zeichnen und die nachsten Schritte im aktuellen Gesprach.',
      toolboxTitle: 'Tutor-Werkzeuge',
    };
  }

  if (locale === 'en') {
    return {
      drawingToggleLabel: 'Draw',
      toolboxDescription:
        'Shortcuts for hints, drawing, and the next steps in the current conversation.',
      toolboxTitle: 'Tutor tools',
    };
  }

  return {
    drawingToggleLabel: 'Rysuj',
    toolboxDescription:
      'Skróty do wskazówek, rysowania i kolejnych kroków w bieżącej rozmowie.',
    toolboxTitle: 'Narzędzia tutora',
  };
};

const resolveTutorAuxiliaryFallback = (
  value: string | null | undefined,
  fallback: string
): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  return value;
};

export function KangurAiTutorPanelAuxiliaryControls(): JSX.Element | null {
  const tutorContent = useKangurAiTutorContent();
  const locale = normalizeSiteLocale(tutorContent.locale);
  const fallbackCopy = getAuxiliaryFallbackCopy(locale);
  const isCoarsePointer = useKangurCoarsePointer();
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
    guestAuthFormVisible,
    handleQuickAction,
    handleStartHomeOnboarding,
    handleToggleDrawing,
    homeOnboardingReplayLabel,
    isLoading,
    isUsageLoading,
    remainingMessages,
    showToolboxLayout,
    shouldRenderAuxiliaryPanelControls,
    usageSummary,
    visibleQuickActions,
  } = useKangurAiTutorPanelBodyContext();
  const shouldRenderToolbox = showToolboxLayout;
  const compactActionClassName = isCoarsePointer ? 'min-h-11 px-4 text-xs' : 'h-9 px-3 text-xs';

  if (!shouldRenderAuxiliaryPanelControls && !shouldRenderToolbox) {
    return null;
  }

  return (
    <div
      className={`${KANGUR_WRAP_ROW_CLASSNAME} border-b kangur-chat-divider kangur-chat-padding-md`}
      data-kangur-tts-ignore='true'
    >
      {shouldRenderToolbox ? (
        <div
          data-testid='kangur-ai-tutor-toolbox'
          className='w-full kangur-chat-card border kangur-chat-padding-md kangur-chat-surface-warm kangur-chat-surface-warm-shadow'
        >
          <div className='text-[10px] font-semibold uppercase tracking-[0.16em] [color:var(--kangur-chat-kicker-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'>
            {resolveTutorAuxiliaryFallback(
              auxiliaryContent?.toolboxTitle,
              fallbackCopy.toolboxTitle
            )}
          </div>
          <div className='mt-1 text-[11px] leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
            {resolveTutorAuxiliaryFallback(
              auxiliaryContent?.toolboxDescription,
              fallbackCopy.toolboxDescription
            )}
          </div>
          <div className={`mt-3 ${KANGUR_WRAP_ROW_CLASSNAME}`}>
            {canStartHomeOnboardingManually ? (
              <KangurButton
                data-testid='kangur-ai-tutor-home-onboarding-replay'
                type='button'
                size='sm'
                variant='surface'
                className={compactActionClassName}
                onClick={handleStartHomeOnboarding}
              >
                {homeOnboardingReplayLabel}
              </KangurButton>
            ) : null}
            {!guestAuthFormVisible ? (
              <KangurButton
                data-testid='kangur-ai-tutor-toolbox-drawing-toggle'
                type='button'
                size='sm'
                variant={drawingMode ? 'primary' : 'surface'}
                className={compactActionClassName}
                disabled={isLoading || !canSendMessages}
                onClick={handleToggleDrawing}
                aria-pressed={drawingMode}
              >
                {resolveTutorAuxiliaryFallback(
                  drawingContent?.toggleLabel,
                  fallbackCopy.drawingToggleLabel
                )}
              </KangurButton>
            ) : null}
            {visibleQuickActions.map((action) => (
              <KangurButton
                key={action.id}
                data-testid={`kangur-ai-tutor-toolbox-action-${action.id}`}
                type='button'
                size='sm'
                variant='surface'
                className={compactActionClassName}
                disabled={isLoading || !canSendMessages}
                onClick={() => void handleQuickAction(action)}
              >
                {action.label}
              </KangurButton>
            ))}
          </div>
        </div>
      ) : null}
      {!shouldRenderToolbox && canStartHomeOnboardingManually ? (
        <KangurButton
          data-testid='kangur-ai-tutor-home-onboarding-replay'
          type='button'
          size='sm'
          variant='surface'
          className={compactActionClassName}
          onClick={handleStartHomeOnboarding}
        >
          {homeOnboardingReplayLabel}
        </KangurButton>
      ) : null}
      {usageSummary && usageSummary.dailyMessageLimit !== null ? (
        <div
          className='w-full kangur-chat-inset border kangur-chat-padding-sm kangur-chat-surface-warm text-[11px] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
        >
          <KangurPanelRow className='sm:items-center sm:justify-between'>
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
          </KangurPanelRow>
        </div>
      ) : null}
    </div>
  );
}
