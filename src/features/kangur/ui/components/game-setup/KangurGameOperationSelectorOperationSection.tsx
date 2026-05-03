import React from 'react';
import { useKangurGameOperationSelector } from './KangurGameOperationSelectorContext';
import OperationSelector from './OperationSelector';

export function KangurGameOperationSelectorOperationSection(): React.JSX.Element | null {
  const {
    handleSelectOperation,
    practiceAssignmentsByOperation,
    recommendation,
    showMathSections,
  } = useKangurGameOperationSelector();

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
