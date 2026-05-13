import React from 'react';
import type {
  BrainOperationsDomainKey,
  BrainOperationsMetric,
} from '@/shared/contracts/ai-brain';
import {
  getDomainRiskStatus,
  runtimeRiskSummaryToneClass,
  runtimeRiskToneClass,
} from './operations-tab-utils';

export function DomainCardRiskSummary({
  domainKey,
  metrics,
}: {
  domainKey: BrainOperationsDomainKey;
  metrics: BrainOperationsMetric[];
}): React.JSX.Element {
  const { showRiskBadge, showRiskSummary, riskValue, riskDisplay, riskCur, riskPre } =
    getDomainRiskStatus(domainKey, metrics);

  return (
    <>
      {showRiskBadge && (
        <div
          className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium uppercase tracking-wide ${runtimeRiskToneClass(
            riskValue
          )}`}
        >
          Kernel parity risk: {riskDisplay}
        </div>
      )}

      {showRiskSummary && riskCur !== null && riskPre !== null && (
        <div
          className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium ${runtimeRiskSummaryToneClass(
            riskCur,
            riskPre
          )}`}
        >
          Runtime risk events: {riskCur} current / {riskPre} previous
        </div>
      )}
    </>
  );
}
