import React from 'react';
import { useKangurPracticeScreenData } from './useKangurPracticeScreenData';
import { PracticeScreenContent } from './PracticeScreenContent';
import { useKangurPracticeActions } from './useKangurPracticeActions';

export function KangurPracticeScreen(): React.JSX.Element {
  const data = useKangurPracticeScreenData(null);
  const actions = useKangurPracticeActions(data);
  
  const aiTutorContext: { contentId: string, surface: string } = { contentId: 'game:practice', surface: 'game' };

  return (
    <PracticeScreenContent 
      data={data}
      actions={actions}
      aiTutorContext={aiTutorContext}
      preparationCard={null}
      completionCard={null}
    />
  );
}
