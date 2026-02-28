'use client';

import React from 'react';
import {
  type DataContractNodeIssueSummary,
  formatDurationMs,
  type AiNode,
} from '@/shared/lib/ai-paths';
import { Badge, Button, Tooltip } from '@/shared/ui';
import { NodeProcessingDots } from './NodeProcessingDots';
import {
  DEFAULT_NODE_NOTE_COLOR,
  BLOCKER_PROCESSING_STATUSES,
  formatRuntimeStatusLabel,
  runtimeStatusBadgeClassName,
  resolveNodeDiagnosticsBadgeStyle,
  renderNodeDiagnosticsTooltipContent,
  type CanvasNode,
} from './CanvasBoard.utils';

export interface CanvasLegacyNodeLayerProps {
  nodes: CanvasNode[];
  selectedNodeIdSet: Set<string>;
  activeShapeId: string | null;
  runtimeNodeStatuses: Record<string, string>;
  nodeDurations: Record<string, number | null>;
  nodeDiagnosticsById: Record<string, DataContractNodeIssueSummary>;
  triggerConnected: Set<string>;
  onPointerDownNode: (id: string, event: React.PointerEvent) => void;
  onSelectNode: (id: string) => void;
  onFocusNodeDiagnostics?: (id: string) => void;
  onFireTrigger: (node: AiNode, event: React.MouseEvent | React.PointerEvent) => void;
  getPortValue: (direction: 'input' | 'output', nodeId: string, port: string) => unknown;
}

export function CanvasLegacyNodeLayer({
  nodes,
  selectedNodeIdSet,
  activeShapeId,
  runtimeNodeStatuses,
  nodeDurations,
  nodeDiagnosticsById,
  triggerConnected,
  onPointerDownNode,
  onSelectNode,
  onFocusNodeDiagnostics,
  onFireTrigger,
  getPortValue,
}: CanvasLegacyNodeLayerProps): React.JSX.Element {
  return (
    <>
      {nodes.map((node: CanvasNode) => {
        const isSelected = selectedNodeIdSet.has(node.id);
        const isActive = activeShapeId === node.id;
        const runtimeNodeStatus = runtimeNodeStatuses[node.id];
        const runtimeNodeStatusLabel = runtimeNodeStatus
          ? formatRuntimeStatusLabel(runtimeNodeStatus)
          : null;

        const isScheduledTrigger =
          node.type === 'trigger' &&
          (node.config?.trigger?.event === 'scheduled_run' ||
            node.config?.trigger?.event === 'cron');

        const nodeDiagnostics = nodeDiagnosticsById[node.id];
        const nodeDiagnosticsBadge = resolveNodeDiagnosticsBadgeStyle(nodeDiagnostics);

        const iteratorStatus = (getPortValue('output', node.id, 'status') as string) || null;
        const iteratorProgressLabel =
          (getPortValue('output', node.id, 'progress_label') as string) || null;
        const iteratorStatusClasses =
          iteratorStatus === 'completed'
            ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
            : iteratorStatus === 'failed'
              ? 'border-rose-500/60 bg-rose-500/15 text-rose-200'
              : 'border-sky-500/60 bg-sky-500/15 text-sky-200';

        const isBlockerProcessing =
          (node.type === 'model' ||
            node.type === 'agent' ||
            node.type === 'learner_agent' ||
            node.type === 'poll' ||
            node.type === 'delay') &&
          BLOCKER_PROCESSING_STATUSES.has(runtimeNodeStatus ?? '');

        const showNote = Boolean(node.note?.text);
        const noteText = node.note?.text ?? '';
        const noteColor = node.note?.color || DEFAULT_NODE_NOTE_COLOR;

        return (
          <div
            key={node.id}
            data-node-id={node.id}
            className={`absolute flex cursor-pointer flex-col items-center rounded-xl border-2 p-4 transition-all duration-200 select-none ${
              isSelected
                ? 'z-40 border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                : isActive
                  ? 'z-30 border-emerald-500 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'z-20 border-border bg-card/95 shadow-lg hover:border-border/80'
            }`}
            style={{
              left: node.position.x,
              top: node.position.y,
              width: node.width ?? 280,
              minHeight: node.height ?? 120,
            }}
            onPointerDown={(event) => {
              onPointerDownNode(node.id, event);
            }}
            onClick={(event) => {
              event.stopPropagation();
              onSelectNode(node.id);
            }}
          >
            <div className='flex w-full flex-col gap-2'>
              <div className='flex items-start justify-between gap-3'>
                <div className='flex flex-col gap-1'>
                  <div className='text-sm font-bold tracking-tight text-foreground'>
                    {node.title || node.id}
                  </div>
                  <div className='flex flex-wrap items-center gap-1.5'>
                    {nodeDiagnosticsBadge && nodeDiagnostics ? (
                      <Tooltip
                        content={renderNodeDiagnosticsTooltipContent({
                          summary: nodeDiagnostics,
                          nodeLabel: node.title || node.id,
                        })}
                        side='top'
                        maxWidth='360px'
                      >
                        <button
                          type='button'
                          data-node-diagnostics-badge={node.id}
                          className='rounded-sm'
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            onFocusNodeDiagnostics?.(node.id);
                          }}
                        >
                          <Badge
                            variant='outline'
                            className={`h-auto border px-2 py-0 text-[9px] uppercase ${nodeDiagnosticsBadge.className}`}
                          >
                            {nodeDiagnosticsBadge.label}
                          </Badge>
                        </button>
                      </Tooltip>
                    ) : null}
                    {isScheduledTrigger ? (
                      <Badge
                        variant='outline'
                        className='h-auto border-amber-400/60 bg-amber-500/15 px-2 py-0 text-[9px] text-amber-200 uppercase'
                      >
                        Scheduled
                      </Badge>
                    ) : null}
                    <Badge
                      variant='outline'
                      className='h-auto px-2 py-0 text-[10px] text-gray-400 uppercase'
                    >
                      {node.type}
                    </Badge>
                  </div>
                </div>
                {runtimeNodeStatusLabel && (
                  <div className='inline-flex w-fit items-center gap-1'>
                    <Badge
                      variant='outline'
                      className={`h-auto flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase tracking-wide ${runtimeStatusBadgeClassName(runtimeNodeStatus ?? '')}`}
                    >
                      {runtimeNodeStatus === 'cached' && (
                        <svg
                          className='h-2.5 w-2.5 shrink-0'
                          viewBox='0 0 16 16'
                          fill='currentColor'
                        >
                          <path d='M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2' />
                        </svg>
                      )}
                      {runtimeNodeStatusLabel}
                    </Badge>
                    {nodeDurations[node.id] != null && (
                      <span className='text-[9px] text-gray-400'>
                        {formatDurationMs(nodeDurations[node.id] ?? null)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {node.type === 'iterator' && (iteratorStatus || iteratorProgressLabel) ? (
                <Badge
                  variant='outline'
                  className={`h-auto inline-flex w-fit items-center gap-1 px-2 py-0.5 text-[9px] uppercase tracking-wide ${iteratorStatusClasses}`}
                  title={
                    iteratorProgressLabel && iteratorStatus
                      ? `${iteratorProgressLabel} • ${iteratorStatus}`
                      : (iteratorStatus ?? iteratorProgressLabel ?? undefined)
                  }
                >
                  {iteratorProgressLabel ? <span>{iteratorProgressLabel}</span> : null}
                  {iteratorStatus ? <span>{iteratorStatus}</span> : null}
                </Badge>
              ) : null}

              {isBlockerProcessing && (
                <Badge
                  variant='outline'
                  className='h-auto inline-flex w-fit items-center gap-1 border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[9px] uppercase tracking-wide text-sky-200'
                >
                  Processing
                  <NodeProcessingDots active />
                </Badge>
              )}

              {node.type === 'viewer' && !triggerConnected.has(node.id) && (
                <Badge
                  variant='outline'
                  className='h-auto border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[9px] text-amber-200'
                >
                  Not wired to a Trigger
                </Badge>
              )}

              {node.type === 'trigger' && (
                <Button
                  className='self-start rounded-md border border-emerald-500/40 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/10'
                  type='button'
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    onFireTrigger(node, event);
                  }}
                >
                  Fire Trigger
                </Button>
              )}

              {node.type === 'trigger' && (
                <div className='text-[10px] uppercase text-lime-200/80'>
                  {isScheduledTrigger ? 'Server scheduled trigger' : 'Accepts context input'}
                </div>
              )}

              {node.type === 'context' && (
                <span className='text-[10px] uppercase text-emerald-300/80'>
                  Role output can feed any Trigger
                </span>
              )}

              {node.type === 'simulation' && (
                <span className='text-[10px] uppercase text-cyan-300/80'>
                  Wire Trigger ↔ Simulation
                </span>
              )}

              {node.type === 'viewer' && (
                <Badge
                  variant='outline'
                  className='h-auto border-border bg-card/60 px-2 py-1 text-[10px] text-gray-400'
                >
                  Open node to view results
                </Badge>
              )}
            </div>
            {showNote ? (
              <div
                className='mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-[11px] text-gray-900 shadow-sm'
                style={{ backgroundColor: noteColor }}
              >
                <div className='whitespace-pre-wrap break-words'>{noteText}</div>
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
