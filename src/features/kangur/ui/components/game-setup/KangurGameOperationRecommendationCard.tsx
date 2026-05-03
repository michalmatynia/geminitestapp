import React from 'react';
import {
  KangurButton,
  KangurInfoCard,
  KangurPanelRow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { useKangurGameOperationSelector } from './KangurGameOperationSelectorContext';

export function KangurGameOperationRecommendationCard(): React.JSX.Element | null {
  const {
    compactActionClassName,
    handleRecommendationSelect: onRecommendationSelect,
    recommendation,
    showMathSections,
  } = useKangurGameOperationSelector();

  if (!showMathSections || !recommendation) {
    return null;
  }

  return (
    <KangurInfoCard
      accent={recommendation.accent}
      className='w-full max-w-3xl rounded-[28px]'
      data-testid='kangur-operation-recommendation-card'
      padding='md'
      tone='accent'
    >
      <KangurPanelRow className='sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <KangurStatusChip
            accent={recommendation.accent}
            className='text-[11px] uppercase tracking-[0.16em]'
            data-testid='kangur-operation-recommendation-label'
            size='sm'
          >
            {recommendation.label}
          </KangurStatusChip>
          <p
            className='mt-3 break-words text-lg font-extrabold [color:var(--kangur-page-text)]'
            data-testid='kangur-operation-recommendation-title'
          >
            {recommendation.title}
          </p>
          <p
            className='mt-1 break-words text-sm [color:var(--kangur-page-muted-text)]'
            data-testid='kangur-operation-recommendation-description'
          >
            {recommendation.description}
          </p>
        </div>
        <KangurButton
          className={compactActionClassName}
          data-testid='kangur-operation-recommendation-action'
          size='sm'
          type='button'
          variant='surface'
          onClick={onRecommendationSelect}
        >
          {recommendation.actionLabel}
        </KangurButton>
      </KangurPanelRow>
    </KangurInfoCard>
  );
}
