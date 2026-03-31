import React from 'react';
import type {
  KangurGameOperationSelectorRuntime,
  KangurOperationSelectorRecommendation as KangurGameOperationSelectorRecommendation,
} from './KangurGameOperationSelectorWidget.types';
import OperationSelector from './OperationSelector';

export function KangurGameOperationSelectorOperationSection({
  handleSelectOperation,
  practiceAssignmentsByOperation,
  recommendation,
  showMathSections,
}: {
  handleSelectOperation: KangurGameOperationSelectorRuntime['handleSelectOperation'];
  practiceAssignmentsByOperation: KangurGameOperationSelectorRuntime['practiceAssignmentsByOperation'];
  recommendation: KangurGameOperationSelectorRecommendation | null;
  showMathSections: boolean;
}): React.JSX.Element | null {
  if (!showMathSections) {
    return null;
  }

  return (
    <OperationSelector
      onSelect={handleSelectOperation}
      priorityAssignmentsByOperation={practiceAssignmentsByOperation}
      recommendedLabel={recommendation?.label}
      recommendedOperation={recommendation?.recommendedOperation}
    />
  );
}
