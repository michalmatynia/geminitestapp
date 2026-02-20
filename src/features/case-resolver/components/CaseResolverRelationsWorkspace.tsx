'use client';

import { Link2, Network } from 'lucide-react';
import React from 'react';

import { Button, StatusBadge, EmptyState, Card } from '@/shared/ui';

import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';

import type { CaseResolverFile } from '@/shared/contracts/case-resolver';

type CaseRelationEdgeKind = 'parent_case' | 'references';

type CaseRelationEdge = {
  id: string;
  from: string;
  to: string;
  kind: CaseRelationEdgeKind;
};

type PositionedCaseNode = {
  file: CaseResolverFile;
  x: number;
  y: number;
  isCurrent: boolean;
  relationHints: string[];
};

const CARD_WIDTH = 280;
const CARD_HEIGHT = 180;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.2;

const sortCaseFiles = (files: CaseResolverFile[]): CaseResolverFile[] =>
  [...files].sort((left: CaseResolverFile, right: CaseResolverFile) => {
    const nameDelta = left.name.localeCompare(right.name);
    if (nameDelta !== 0) return nameDelta;
    return left.id.localeCompare(right.id);
  });

const buildCaseRelationEdges = (files: CaseResolverFile[]): CaseRelationEdge[] => {
  const fileIds = new Set(files.map((file: CaseResolverFile): string => file.id));
  const seen = new Set<string>();
  const output: CaseRelationEdge[] = [];

  const addEdge = (
    kind: CaseRelationEdgeKind,
    from: string | null | undefined,
    to: string | null | undefined
  ): void => {
    const normalizedFrom = (from ?? '').trim();
    const normalizedTo = (to ?? '').trim();
    if (!normalizedFrom || !normalizedTo) return;
    if (normalizedFrom === normalizedTo) return;
    if (!fileIds.has(normalizedFrom) || !fileIds.has(normalizedTo)) return;

    const edgeId = `${kind}:${normalizedFrom}:${normalizedTo}`;
    if (seen.has(edgeId)) return;
    seen.add(edgeId);

    output.push({
      id: edgeId,
      from: normalizedFrom,
      to: normalizedTo,
      kind,
    });
  };

  files.forEach((file: CaseResolverFile): void => {
    addEdge('parent_case', file.parentCaseId, file.id);

    const referenceIds = Array.from(
      new Set(file.referenceCaseIds.map((referenceId: string): string => referenceId.trim()))
    );
    referenceIds.forEach((referenceId: string): void => {
      addEdge('references', file.id, referenceId);
    });
  });

  return output;
};

const buildRelationHints = (
  nodeId: string,
  currentCaseId: string | null,
  visibleEdges: CaseRelationEdge[]
): string[] => {
  if (!currentCaseId || nodeId === currentCaseId) return [];

  const hints = new Set<string>();
  visibleEdges.forEach((edge: CaseRelationEdge): void => {
    if (edge.from !== currentCaseId && edge.to !== currentCaseId) return;

    if (edge.kind === 'references') {
      if (edge.from === currentCaseId && edge.to === nodeId) {
        hints.add('Referenced by current case');
      }
      if (edge.to === currentCaseId && edge.from === nodeId) {
        hints.add('References current case');
      }
      return;
    }

    if (edge.kind === 'parent_case') {
      if (edge.from === currentCaseId && edge.to === nodeId) {
        hints.add('Child case');
      }
      if (edge.to === currentCaseId && edge.from === nodeId) {
        hints.add('Parent case');
      }
    }
  });

  return Array.from(hints);
};

const getCasePreview = (file: CaseResolverFile): string => {
  const raw =
    file.documentContentPlainText ||
    file.documentContentMarkdown ||
    file.documentContent ||
    '';
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) return 'No content preview available.';
  if (normalized.length <= 180) return normalized;
  return `${normalized.slice(0, 180)}...`;
};

type CaseResolverRelationsWorkspaceProps = {
  focusCaseId?: string | null;
};

export function CaseResolverRelationsWorkspace({
  focusCaseId = null,
}: CaseResolverRelationsWorkspaceProps = {}): React.JSX.Element {
  const { workspace, selectedFileId, onSelectFile } = useCaseResolverPageContext();
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = React.useState<number>(1);

  const caseFiles = React.useMemo(
    (): CaseResolverFile[] =>
      sortCaseFiles(
        workspace.files.filter((file: CaseResolverFile): boolean => file.fileType === 'case')
      ),
    [workspace.files]
  );
  const allFilesById = React.useMemo(
    () =>
      new Map(workspace.files.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])),
    [workspace.files]
  );

  const fileById = React.useMemo(
    () => new Map(caseFiles.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])),
    [caseFiles]
  );

  const relationEdges = React.useMemo(
    (): CaseRelationEdge[] => buildCaseRelationEdges(caseFiles),
    [caseFiles]
  );

  const currentCaseId = React.useMemo((): string | null => {
    const normalizedFocusedCaseId = focusCaseId?.trim() ?? '';
    if (normalizedFocusedCaseId && fileById.has(normalizedFocusedCaseId)) {
      return normalizedFocusedCaseId;
    }

    const resolveCaseId = (fileId: string | null): string | null => {
      if (!fileId) return null;
      const file = allFilesById.get(fileId) ?? null;
      if (!file) return null;
      if (file.fileType === 'case' && fileById.has(file.id)) return file.id;
      if (!file.parentCaseId) return null;
      return fileById.has(file.parentCaseId) ? file.parentCaseId : null;
    };

    return resolveCaseId(selectedFileId) ?? resolveCaseId(workspace.activeFileId) ?? null;
  }, [allFilesById, fileById, focusCaseId, selectedFileId, workspace.activeFileId]);

  const visibleCaseIdSet = React.useMemo((): Set<string> => {
    if (!currentCaseId) {
      return new Set(caseFiles.map((file: CaseResolverFile): string => file.id));
    }

    const visible = new Set<string>([currentCaseId]);
    relationEdges.forEach((edge: CaseRelationEdge): void => {
      if (edge.from === currentCaseId) visible.add(edge.to);
      if (edge.to === currentCaseId) visible.add(edge.from);
    });
    return visible;
  }, [caseFiles, currentCaseId, relationEdges]);

  const visibleFiles = React.useMemo((): CaseResolverFile[] => {
    const filtered = caseFiles.filter((file: CaseResolverFile): boolean => visibleCaseIdSet.has(file.id));
    if (!currentCaseId) return filtered;

    const current = filtered.find((file: CaseResolverFile): boolean => file.id === currentCaseId) ?? null;
    const others = filtered.filter((file: CaseResolverFile): boolean => file.id !== currentCaseId);

    return current ? [current, ...others] : filtered;
  }, [caseFiles, currentCaseId, visibleCaseIdSet]);

  const visibleEdges = React.useMemo((): CaseRelationEdge[] => {
    return relationEdges.filter((edge: CaseRelationEdge): boolean => {
      if (!visibleCaseIdSet.has(edge.from) || !visibleCaseIdSet.has(edge.to)) return false;
      if (!currentCaseId) return true;
      return edge.from === currentCaseId || edge.to === currentCaseId;
    });
  }, [currentCaseId, relationEdges, visibleCaseIdSet]);

  const positionedNodes = React.useMemo((): PositionedCaseNode[] => {
    if (visibleFiles.length === 0) return [];

    const buildNode = (file: CaseResolverFile, x: number, y: number): PositionedCaseNode => ({
      file,
      x: Math.max(40, Math.round(x)),
      y: Math.max(40, Math.round(y)),
      isCurrent: currentCaseId === file.id,
      relationHints: buildRelationHints(file.id, currentCaseId, visibleEdges),
    });

    if (currentCaseId && visibleFiles[0]?.id === currentCaseId) {
      const [currentFile, ...relatedFiles] = visibleFiles;
      const centerX = 620;
      const centerY = 350;
      const baseRadius = relatedFiles.length <= 2 ? 320 : Math.min(460, 240 + relatedFiles.length * 24);

      const output: PositionedCaseNode[] = [
        buildNode(currentFile, centerX - CARD_WIDTH / 2, centerY - CARD_HEIGHT / 2),
      ];

      relatedFiles.forEach((file: CaseResolverFile, index: number): void => {
        const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(relatedFiles.length, 1);
        const x = centerX + Math.cos(angle) * baseRadius - CARD_WIDTH / 2;
        const y = centerY + Math.sin(angle) * baseRadius - CARD_HEIGHT / 2;
        output.push(buildNode(file, x, y));
      });

      return output;
    }

    const columns = 3;
    const startX = 90;
    const startY = 70;
    const colGap = 340;
    const rowGap = 230;

    return visibleFiles.map((file: CaseResolverFile, index: number): PositionedCaseNode => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      return buildNode(file, startX + col * colGap, startY + row * rowGap);
    });
  }, [currentCaseId, visibleEdges, visibleFiles]);

  const boardSize = React.useMemo((): { width: number; height: number } => {
    if (positionedNodes.length === 0) {
      return { width: 980, height: 620 };
    }

    let maxRight = 0;
    let maxBottom = 0;
    positionedNodes.forEach((node: PositionedCaseNode): void => {
      maxRight = Math.max(maxRight, node.x + CARD_WIDTH);
      maxBottom = Math.max(maxBottom, node.y + CARD_HEIGHT);
    });

    return {
      width: Math.max(1200, maxRight + 80),
      height: Math.max(760, maxBottom + 80),
    };
  }, [positionedNodes]);

  const centerByNodeId = React.useMemo((): Map<string, { x: number; y: number }> => {
    const centerMap = new Map<string, { x: number; y: number }>();
    positionedNodes.forEach((node: PositionedCaseNode): void => {
      centerMap.set(node.file.id, {
        x: node.x + CARD_WIDTH / 2,
        y: node.y + CARD_HEIGHT / 2,
      });
    });
    return centerMap;
  }, [positionedNodes]);

  const currentCaseName = currentCaseId ? fileById.get(currentCaseId)?.name ?? null : null;
  const currentCaseNode = React.useMemo(
    (): PositionedCaseNode | null =>
      currentCaseId
        ? positionedNodes.find((node: PositionedCaseNode): boolean => node.file.id === currentCaseId) ?? null
        : null,
    [currentCaseId, positionedNodes]
  );

  const clampZoom = React.useCallback((value: number): number => {
    if (!Number.isFinite(value)) return 1;
    if (value < MIN_ZOOM) return MIN_ZOOM;
    if (value > MAX_ZOOM) return MAX_ZOOM;
    return value;
  }, []);

  const zoomTo = React.useCallback(
    (nextZoom: number): void => {
      const viewport = viewportRef.current;
      const clampedZoom = clampZoom(nextZoom);
      if (!viewport) {
        setZoom(clampedZoom);
        return;
      }
      const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / zoom;
      const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / zoom;
      setZoom(clampedZoom);
      requestAnimationFrame((): void => {
        viewport.scrollLeft = Math.max(0, centerX * clampedZoom - viewport.clientWidth / 2);
        viewport.scrollTop = Math.max(0, centerY * clampedZoom - viewport.clientHeight / 2);
      });
    },
    [clampZoom, zoom]
  );

  const fitToBoard = React.useCallback((): void => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const paddedWidth = Math.max(200, viewport.clientWidth - 64);
    const paddedHeight = Math.max(200, viewport.clientHeight - 64);
    const fitZoom = clampZoom(
      Math.min(paddedWidth / boardSize.width, paddedHeight / boardSize.height)
    );
    setZoom(fitZoom);
    requestAnimationFrame((): void => {
      const scaledWidth = boardSize.width * fitZoom;
      const scaledHeight = boardSize.height * fitZoom;
      viewport.scrollLeft = Math.max(0, (scaledWidth - viewport.clientWidth) / 2);
      viewport.scrollTop = Math.max(0, (scaledHeight - viewport.clientHeight) / 2);
    });
  }, [boardSize.height, boardSize.width, clampZoom]);

  const fitToCurrentCase = React.useCallback((): void => {
    if (!currentCaseNode) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const targetWidth = CARD_WIDTH + 120;
    const targetHeight = CARD_HEIGHT + 120;
    const fitZoom = clampZoom(
      Math.min(viewport.clientWidth / targetWidth, viewport.clientHeight / targetHeight)
    );
    const targetCenterX = currentCaseNode.x + CARD_WIDTH / 2;
    const targetCenterY = currentCaseNode.y + CARD_HEIGHT / 2;
    setZoom(fitZoom);
    requestAnimationFrame((): void => {
      viewport.scrollLeft = Math.max(0, targetCenterX * fitZoom - viewport.clientWidth / 2);
      viewport.scrollTop = Math.max(0, targetCenterY * fitZoom - viewport.clientHeight / 2);
    });
  }, [clampZoom, currentCaseNode]);

  const resetView = React.useCallback((): void => {
    const viewport = viewportRef.current;
    setZoom(1);
    if (!viewport) return;
    requestAnimationFrame((): void => {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    });
  }, []);

  const scaledBoardSize = React.useMemo(
    (): { width: number; height: number } => ({
      width: Math.max(1, Math.round(boardSize.width * zoom)),
      height: Math.max(1, Math.round(boardSize.height * zoom)),
    }),
    [boardSize.height, boardSize.width, zoom]
  );

  if (caseFiles.length === 0) {
    return (
      <EmptyState
        title='No cases to visualize'
        description='Create a case to see relation segments.'
        icon={<Network className='mx-auto size-12 opacity-60' />}
        className='h-full'
      />
    );
  }

  return (
    <div className='flex h-full min-h-0 flex-col gap-3'>
      <Card variant='subtle-compact' padding='sm' className='bg-card/35'>
        <div className='flex items-center gap-2 text-sm text-gray-200'>
          <Link2 className='size-4 text-cyan-300' />
          <span>
            {currentCaseName
              ? `Current case: ${currentCaseName}`
              : 'Case relations overview'}
          </span>
        </div>
        <div className='mt-1 text-xs text-gray-400'>
          One segment equals one case. Straight lines represent case-to-case relations.
        </div>
      </Card>

      <Card
        ref={viewportRef}
        variant='subtle'
        padding='none'
        className='relative min-h-0 flex-1 overflow-auto border-border/60 bg-card/20'
      >
        <div className='relative' style={{ width: scaledBoardSize.width, height: scaledBoardSize.height }}>
          <div
            className='relative origin-top-left'
            style={{
              width: boardSize.width,
              height: boardSize.height,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            <svg className='pointer-events-none absolute inset-0 h-full w-full'>
              {visibleEdges.map((edge: CaseRelationEdge) => {
                const fromPoint = centerByNodeId.get(edge.from);
                const toPoint = centerByNodeId.get(edge.to);
                if (!fromPoint || !toPoint) return null;

                const labelX = (fromPoint.x + toPoint.x) / 2;
                const labelY = (fromPoint.y + toPoint.y) / 2;
                const label = edge.kind === 'parent_case' ? 'parent' : 'reference';

                return (
                  <g key={edge.id}>
                    <line
                      x1={fromPoint.x}
                      y1={fromPoint.y}
                      x2={toPoint.x}
                      y2={toPoint.y}
                      stroke='rgba(148, 163, 184, 0.55)'
                      strokeWidth={2}
                    />
                    <text
                      x={labelX}
                      y={labelY - 6}
                      textAnchor='middle'
                      fill='rgba(148, 163, 184, 0.8)'
                      fontSize='10'
                      fontWeight={600}
                      letterSpacing='0.02em'
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {positionedNodes.map((node: PositionedCaseNode) => {
              const file = node.file;
              return (
                <Card
                  key={file.id}
                  variant={node.isCurrent ? 'default' : 'subtle'}
                  padding='md'
                  onClick={(): void => {
                    onSelectFile(file.id);
                  }}
                  className={`absolute flex cursor-pointer flex-col shadow-sm transition ${
                    node.isCurrent
                      ? 'border-blue-400/70 bg-blue-500/14 ring-2 ring-blue-400/55'
                      : 'border-border/60 bg-card/80 hover:border-cyan-300/40 hover:bg-card/95'
                  }`}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: CARD_WIDTH,
                    minHeight: CARD_HEIGHT,
                  }}
                >
                  <div className='mb-2 flex items-start justify-between gap-2'>
                    <div className='min-w-0 flex-1'>
                      <div className='truncate text-sm font-semibold text-gray-100'>{file.name}</div>
                      <div className='mt-1 truncate text-[11px] text-gray-400'>
                        {file.folder || '(root)'}
                      </div>
                    </div>
                    {node.isCurrent ? (
                      <StatusBadge
                        status='Current'
                        variant='info'
                        size='sm'
                        className='border-blue-300/45 bg-blue-500/15 text-blue-200'
                      />
                    ) : null}
                  </div>

                  <div className='min-h-0 flex-1 overflow-hidden text-[12px] leading-5 text-gray-300'>
                    {getCasePreview(file)}
                  </div>

                  {node.relationHints.length > 0 ? (
                    <div className='mt-3 flex flex-wrap gap-1'>
                      {node.relationHints.map((hint: string) => (
                        <span
                          key={`${file.id}:${hint}`}
                          className='rounded border border-cyan-300/35 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-200'
                        >
                          {hint}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </div>
        <Card variant='subtle-compact' padding='sm' className='absolute bottom-3 right-3 z-10 max-w-[min(92vw,48rem)] bg-card/30 text-xs text-gray-300'>
          <div className='mb-2 text-[11px] uppercase text-gray-500'>View Controls</div>
          <div className='flex flex-wrap items-center justify-end gap-2'>
            <Button
              className='h-7 w-7 rounded-full border text-xs text-white hover:bg-muted/60'
              type='button'
              variant='ghost'
              size='xs'
              onClick={() => zoomTo(zoom - 0.1)}
            >
              -
            </Button>
            <span className='min-w-[56px] text-center text-[11px] text-gray-300'>
              {Math.round(zoom * 100)}%
            </span>
            <Button
              className='h-7 w-7 rounded-full border text-xs text-white hover:bg-muted/60'
              type='button'
              variant='ghost'
              size='xs'
              onClick={() => zoomTo(zoom + 0.1)}
            >
              +
            </Button>
            <Button
              className='h-7 rounded-full border px-2 text-[11px] text-white hover:bg-muted/60'
              type='button'
              variant='ghost'
              size='xs'
              onClick={fitToBoard}
            >
              Fit
            </Button>
            <Button
              className='h-7 rounded-full border px-2 text-[11px] text-white hover:bg-muted/60 disabled:opacity-40 disabled:hover:bg-transparent'
              type='button'
              variant='ghost'
              size='xs'
              onClick={fitToCurrentCase}
              disabled={!currentCaseNode}
            >
              Sel
            </Button>
            <Button
              className='h-7 rounded-full border px-2 text-[11px] text-white hover:bg-muted/60'
              type='button'
              variant='ghost'
              size='xs'
              onClick={resetView}
            >
              Reset
            </Button>
          </div>
        </Card>
      </Card>
    </div>
  );
}
