'use client';

import { Download, FolderOpen, Trash2 } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';

import {
  Badge,
  Button,
  CopyButton,
  EmptyState,
  FormSection,
  Label,
  SimpleSettingsList,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@/shared/ui';

import { useLibraryActions, useLibraryState } from '../context/hooks/useLibrary';
import { promptExploderFormatTimestamp } from '../helpers/formatting';
import { buildPromptExploderSegmentationOutline } from '../segmentation-library';
import type { PromptExploderSegmentationRecord } from '@/shared/contracts/prompt-exploder';

type SegmentationListItem = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  original: PromptExploderSegmentationRecord;
};

const formatPromptPreview = (value: string, maxChars = 140): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '—';
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars - 1)}…`;
};

const formatConfidencePercent = (value: number): string => `${Math.round(value * 100)}%`;

export function PromptExploderLibraryTab(): React.JSX.Element {
  const { segmentationRecords, selectedSegmentationRecordId, selectedSegmentationRecord } =
    useLibraryState();
  const {
    setSelectedSegmentationRecordId,
    handleLoadSegmentationRecordIntoWorkspace,
    handleDeleteSegmentationRecord,
    buildSegmentationAnalysisContextJsonForRecord,
    buildSegmentationAnalysisContextJsonForAll,
  } = useLibraryActions();

  const selectedOutline = useMemo(
    () =>
      selectedSegmentationRecord
        ? buildPromptExploderSegmentationOutline(selectedSegmentationRecord.documentSnapshot)
        : null,
    [selectedSegmentationRecord]
  );

  const selectedContextJson = useMemo(() => {
    if (!selectedSegmentationRecord) return '';
    return buildSegmentationAnalysisContextJsonForRecord(selectedSegmentationRecord.id) ?? '';
  }, [buildSegmentationAnalysisContextJsonForRecord, selectedSegmentationRecord]);

  const fullContextJson = useMemo(
    () => buildSegmentationAnalysisContextJsonForAll(),
    [buildSegmentationAnalysisContextJsonForAll]
  );

  const handleDownloadJson = useCallback((filename: string, value: string): void => {
    if (!value || typeof window === 'undefined') return;
    const blob = new Blob([value], { type: 'application/json;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }, []);

  const listItems = useMemo<SegmentationListItem[]>(
    () =>
      segmentationRecords.map((record) => ({
        id: record.id,
        title: `Captured ${promptExploderFormatTimestamp(record.capturedAt)}`,
        subtitle: `${record.segmentCount} segments`,
        description: formatPromptPreview(record.sourcePrompt),
        original: record,
      })),
    [segmentationRecords]
  );

  return (
    <FormSection
      title='Segmentation Context Library'
      description='Automatic before/after segmentation corpus for validator-pattern AI analysis.'
      variant='subtle'
      className='p-4'
      actions={
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='info'>{segmentationRecords.length} captured record(s)</Badge>
          <CopyButton value={fullContextJson} showText variant='outline'>
            Copy Full Library JSON
          </CopyButton>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              handleDownloadJson(
                `prompt-exploder-library-context-${new Date().toISOString().slice(0, 10)}.json`,
                fullContextJson
              );
            }}
            disabled={segmentationRecords.length === 0}
          >
            <Download className='mr-2 size-4' />
            Download Full JSON
          </Button>
        </div>
      }
    >
      <div className='grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]'>
        <div className='space-y-2'>
          <Label className='text-[11px] text-gray-400'>Captured Records</Label>
          <div className='max-h-[700px] overflow-auto rounded border border-border/50 bg-card/20 p-2'>
            <SimpleSettingsList
              items={listItems}
              selectedId={selectedSegmentationRecordId ?? undefined}
              onSelect={(item) => {
                setSelectedSegmentationRecordId(item.id);
              }}
              emptyMessage='No segmentation context records captured yet.'
              padding='sm'
            />
          </div>
        </div>

        {!selectedSegmentationRecord ? (
          <EmptyState
            title='No segmentation context selected'
            description='Select a captured record to inspect pre/post segmentation details.'
            className='my-8'
          />
        ) : (
          <div className='space-y-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  handleLoadSegmentationRecordIntoWorkspace(selectedSegmentationRecord.id);
                }}
              >
                <FolderOpen className='mr-2 size-4' />
                Load Into Workspace
              </Button>
              <Button
                type='button'
                variant='outline'
                className='text-red-300 hover:text-red-200'
                onClick={() => {
                  void handleDeleteSegmentationRecord(selectedSegmentationRecord.id);
                }}
              >
                <Trash2 className='mr-2 size-4' />
                Delete Record
              </Button>
              <CopyButton
                value={selectedContextJson}
                showText
                variant='outline'
                disabled={!selectedContextJson}
              >
                Copy Selected Context JSON
              </CopyButton>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  handleDownloadJson(
                    `prompt-exploder-context-${selectedSegmentationRecord.id}.json`,
                    selectedContextJson
                  );
                }}
                disabled={!selectedContextJson}
              >
                <Download className='mr-2 size-4' />
                Download Selected JSON
              </Button>
            </div>

            <div className='grid gap-2 rounded border border-border/50 bg-card/20 p-3 md:grid-cols-2'>
              <div className='text-xs text-gray-300'>
                Captured: {promptExploderFormatTimestamp(selectedSegmentationRecord.capturedAt)}
              </div>
              <div className='text-xs text-gray-300'>
                Segments: {selectedSegmentationRecord.segmentCount}
              </div>
              <div className='text-xs text-gray-300'>
                Scope: {selectedSegmentationRecord.validationScope}
              </div>
              <div className='text-xs text-gray-300'>
                Stack:{' '}
                {typeof selectedSegmentationRecord.validationRuleStack === 'string'
                  ? selectedSegmentationRecord.validationRuleStack
                  : typeof selectedSegmentationRecord.validationRuleStack === 'object'
                    ? selectedSegmentationRecord.validationRuleStack.name ||
                      selectedSegmentationRecord.validationRuleStack.id ||
                      '—'
                    : '—'}
              </div>
              <div className='text-xs text-gray-300'>
                Target: {selectedSegmentationRecord.returnTarget}
              </div>
              <div className='text-xs text-gray-300'>
                Avg confidence:{' '}
                {selectedOutline?.stats
                  ? formatConfidencePercent(selectedOutline.stats.averageConfidence)
                  : '0%'}
              </div>
            </div>

            <div className='space-y-1'>
              <Label className='text-[11px] text-gray-400'>Pre-Segmentation Text</Label>
              <Textarea
                className='min-h-[180px] font-mono text-[11px]'
                value={selectedSegmentationRecord.sourcePrompt}
                readOnly
              />
            </div>

            <div className='space-y-1'>
              <Label className='text-[11px] text-gray-400'>
                Post-Segmentation Reassembled Output
              </Label>
              <Textarea
                className='min-h-[180px] font-mono text-[11px]'
                value={selectedSegmentationRecord.reassembledPrompt}
                readOnly
              />
            </div>

            <div className='space-y-2'>
              <Label className='text-[11px] text-gray-400'>Section and Segment Structure</Label>
              <Table className='text-xs'>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[48px]'>#</TableHead>
                    <TableHead className='w-[120px]'>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className='w-[84px]'>Include</TableHead>
                    <TableHead className='w-[110px]'>Confidence</TableHead>
                    <TableHead className='w-[220px]'>Matched Patterns</TableHead>
                    <TableHead className='w-[220px]'>Subsections</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(selectedOutline?.segments ?? []).map((segment) => (
                    <TableRow key={segment.id}>
                      <TableCell>{segment.order}</TableCell>
                      <TableCell>
                        <Badge variant='neutral'>{segment.type}</Badge>
                      </TableCell>
                      <TableCell>{segment.title || 'Untitled segment'}</TableCell>
                      <TableCell>{segment.includeInOutput ? 'yes' : 'no'}</TableCell>
                      <TableCell>{formatConfidencePercent(segment.confidence)}</TableCell>
                      <TableCell>
                        {segment.matchedPatternLabels.length > 0
                          ? segment.matchedPatternLabels.join(', ')
                          : segment.matchedPatternIds.length > 0
                            ? segment.matchedPatternIds.join(', ')
                            : '—'}
                      </TableCell>
                      <TableCell>
                        {segment.subsections.length > 0
                          ? segment.subsections
                            .map((subsection) => {
                              const codePrefix = subsection.code ? `${subsection.code} ` : '';
                              return `${codePrefix}${subsection.title}`;
                            })
                            .join(' | ')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </FormSection>
  );
}
