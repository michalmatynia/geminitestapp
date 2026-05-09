'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

import { useSystemLogsActions, useSystemLogsState } from '@/shared/lib/observability/context/SystemLogsContext';
import { getDocumentationTooltip } from '@/shared/lib/documentation/tooltips';
import { DOCUMENTATION_MODULE_IDS } from '@/shared/contracts/documentation';
import { type SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import { Button, Tooltip } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { Pagination, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import { DetailModal } from '@/shared/ui/templates/modals';
import { formatTimestamp } from '@/shared/lib/observability/utils/formatTimestamp';
import {
  getPrimaryContextDocument,
  getStatusVariant,
  readAlertEvidence,
  readLogContextRegistry,
} from '@/shared/lib/observability/utils/logHelpers';
import { getSystemLogColumns } from './table/columns';
import { renderSystemLogDetailsContent } from './table/details-content';

export function ContextDocumentCard(props: {
  document: any;
  accentClassName?: string;
}): React.JSX.Element {
  // This is a placeholder for the original component
  // which will be imported from a proper shared file.
  return <div />;
}

export function ContextRegistryNodesCard(props: {
  nodes: any[];
}): React.JSX.Element | null {
  // This is a placeholder for the original component
  // which will be imported from a proper shared file.
  return null;
}

export function EventStreamPanel({
  showFooterPagination = true,
}: {
  showFooterPagination?: boolean;
} = {}): React.JSX.Element {
  const { logsQuery, logs, totalPages, page, interpretLogMutation, logInterpretations } =
    useSystemLogsState();
  const { setPage, handleFilterChange, handleInterpretLog } = useSystemLogsActions();
  const [selectedLog, setSelectedLog] = React.useState<SystemLogRecord | null>(null);
  const aiInterpretationTooltip =
    getDocumentationTooltip(
      DOCUMENTATION_MODULE_IDS.observability,
      'system_logs_ai_interpretation'
    ) ?? 'AI Interpretation';

  const selectedInterpretation = React.useMemo(() => {
    const candidate = selectedLog ? logInterpretations[selectedLog.id] : undefined;
    if (!candidate?.summary) {
      return undefined;
    }

    return {
      summary: candidate.summary,
      warnings: candidate.warnings ?? null,
    };
  }, [logInterpretations, selectedLog]);
  const selectedLogSubtitle = selectedLog?.message;

  const handleOpenDetails = React.useCallback(
    (log: SystemLogRecord): void => {
      setSelectedLog(log);
    },
    []
  );

  const handleGenerateSelectedInterpretation = React.useCallback((): void => {
    if (!selectedLog || interpretLogMutation.isPending) return;
    void handleInterpretLog(selectedLog.id);
  }, [handleInterpretLog, interpretLogMutation.isPending, selectedLog]
  );

  const columns = React.useMemo<ColumnDef<SystemLogRecord>[]>(
    () => getSystemLogColumns(aiInterpretationTooltip, handleOpenDetails),
    [aiInterpretationTooltip, handleOpenDetails]
  );

  return (
    <>
      <StandardDataTablePanel
        footer={
          showFooterPagination ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              variant='compact'
            />
          ) : undefined
        }
        isLoading={logsQuery.isLoading}
        variant='flat'
        columns={columns}
        data={logs}
        maxHeight='60vh'
        stickyHeader
        enableVirtualization={true}
      />
      <DetailModal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title='Log details'
        subtitle={selectedLogSubtitle}
        size='xl'
      >
        {selectedLog ? (
          renderSystemLogDetailsContent({
            log: selectedLog,
            interpretation: selectedInterpretation,
            isInterpreting: interpretLogMutation.isPending && !selectedInterpretation,
            onGenerateInterpretation: handleGenerateSelectedInterpretation,
            onFilterChange: handleFilterChange,
          })
        ) : null}
      </DetailModal>
    </>
  );
}
