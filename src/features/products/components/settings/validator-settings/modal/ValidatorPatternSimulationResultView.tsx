'use client';

import React from 'react';

import { Alert } from '@/shared/ui/alert';
import { StatusBadge } from '@/shared/ui/status-badge';

import type {
  ValidatorPatternSequenceTraceStep,
  ValidatorPatternSimulationResult,
} from '../validator-pattern-simulator';

const formatTraceSkipReason = (
  skipReason: ValidatorPatternSequenceTraceStep['skipReason']
): string | null => {
  switch (skipReason) {
    case 'disabled':
      return 'Disabled';
    case 'out_of_scope':
      return 'Out of Scope';
    case 'launch_blocked':
      return 'Launch Blocked';
    case 'regex_no_match':
      return 'Regex No Match';
    case 'replacement_disabled':
      return 'Replacement Disabled';
    case 'replacement_unresolved':
      return 'Replacement Unresolved';
    default:
      return null;
  }
};

const formatTraceStopReason = (
  stopReason: ValidatorPatternSequenceTraceStep['stopReason']
): string | null => {
  switch (stopReason) {
    case 'chain_stop_on_match':
      return 'Stopped on Match';
    case 'chain_stop_on_replace':
      return 'Stopped on Replace';
    case 'pass_output_disabled':
      return 'Pass Output Off';
    default:
      return null;
  }
};

const formatOptionalText = (
  value: string | null | undefined,
  fallback: string
): string => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed === '' ? fallback : trimmed;
};

const resolveRegexLabel = (result: ValidatorPatternSimulationResult): string => {
  if (result.regexMatched) return 'Matched';
  if (result.allowWithoutRegexMatch) return 'Skipped';
  return 'No match';
};

const resolveTraceRegexStatus = (step: ValidatorPatternSequenceTraceStep): string => {
  if (step.allowWithoutRegexMatch && !step.regexMatched) return 'Regex skipped';
  if (step.regexMatched) return 'Regex matched';
  return 'Regex no match';
};

function InvalidSimulationResult(props: {
  result: ValidatorPatternSimulationResult;
}): React.JSX.Element {
  return (
    <Alert variant='error' className='text-xs'>
      {props.result.error}
    </Alert>
  );
}

function ResultStatusBadges(props: {
  result: ValidatorPatternSimulationResult;
}): React.JSX.Element {
  const { result } = props;
  return (
    <div className='flex flex-wrap gap-2'>
      <StatusBadge
        status={result.launchMatched ? 'Launch matched' : 'Launch blocked'}
        variant={result.launchMatched ? 'success' : 'warning'}
        size='sm'
      />
      <StatusBadge
        status={`Regex: ${resolveRegexLabel(result)}`}
        variant={result.regexMatched ? 'success' : 'warning'}
        size='sm'
      />
      <StatusBadge
        status={result.patternEnabledForScope ? 'Pattern enabled' : 'Pattern out of scope'}
        variant={result.patternEnabledForScope ? 'info' : 'warning'}
        size='sm'
      />
      <StatusBadge
        status={
          result.replacementEnabledForScope ? 'Replacement active' : 'Replacement out of scope'
        }
        variant={result.replacementEnabledForScope ? 'info' : 'warning'}
        size='sm'
      />
    </div>
  );
}

function ResultSummaryCard(props: { label: string; value: string }): React.JSX.Element {
  return (
    <div className='rounded-md border border-border bg-gray-950/40 p-3'>
      <div className='mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
        {props.label}
      </div>
      <div className='break-all font-mono text-gray-100'>{props.value}</div>
    </div>
  );
}

function ResultSummaryCards(props: {
  result: ValidatorPatternSimulationResult;
}): React.JSX.Element {
  const { result } = props;
  return (
    <div className='grid grid-cols-1 gap-3 text-xs md:grid-cols-3'>
      <ResultSummaryCard label='Field' value={result.fieldLabel} />
      <ResultSummaryCard
        label='Resolved Replacement'
        value={formatOptionalText(result.replacementValue, '(none)')}
      />
      <div className='rounded-md border border-border bg-gray-950/40 p-3'>
        <div className='mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
          Applied Output
        </div>
        <div className='break-all font-mono text-gray-100'>
          {formatOptionalText(result.outputDisplayValue, '(unchanged)')}
        </div>
        {result.outputValue !== null &&
        String(result.outputValue) !== String(result.outputDisplayValue ?? '') ? (
          <div className='mt-1 text-[10px] text-gray-400'>
            Stored value: {String(result.outputValue)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SimulationNotes(props: {
  notes: ValidatorPatternSimulationResult['notes'];
}): React.JSX.Element | null {
  if (props.notes.length === 0) return null;

  return (
    <Alert variant='info' className='text-xs'>
      <ul className='list-disc space-y-1 pl-4'>
        {props.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </Alert>
  );
}

function ReadySimulationResult(props: {
  result: ValidatorPatternSimulationResult;
}): React.JSX.Element {
  return (
    <div className='space-y-3'>
      <ResultStatusBadges result={props.result} />
      <ResultSummaryCards result={props.result} />
      <SimulationNotes notes={props.result.notes} />
    </div>
  );
}

function SequenceTraceHeader(props: {
  sequenceGroupLabel: string | null;
}): React.JSX.Element {
  const hasLabel = props.sequenceGroupLabel !== null && props.sequenceGroupLabel !== '';
  return (
    <div className='flex items-center justify-between gap-3'>
      <div className='text-[11px] font-semibold uppercase tracking-wide text-gray-400'>
        Sequence Trace
      </div>
      {hasLabel ? <div className='text-[11px] text-gray-500'>{props.sequenceGroupLabel}</div> : null}
    </div>
  );
}

function TraceValueGrid(props: {
  step: ValidatorPatternSequenceTraceStep;
}): React.JSX.Element {
  const replacementValue =
    props.step.replacementValue === null || props.step.replacementValue === ''
      ? '(none)'
      : props.step.replacementValue;
  return (
    <div className='mt-2 grid grid-cols-1 gap-2 text-xs md:grid-cols-3'>
      <TraceValue label='Input' value={props.step.inputValue === '' ? '(empty)' : props.step.inputValue} />
      <TraceValue label='Replacement' value={replacementValue} />
      <TraceValue label='Output' value={props.step.outputValue === '' ? '(empty)' : props.step.outputValue} />
    </div>
  );
}

function TraceValue(props: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <div className='mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
        {props.label}
      </div>
      <div className='break-all font-mono text-gray-100'>{props.value}</div>
    </div>
  );
}

function TraceStatusBadges(props: {
  step: ValidatorPatternSequenceTraceStep;
}): React.JSX.Element {
  const { step } = props;
  return (
    <div className='mt-2 flex flex-wrap gap-2'>
      <StatusBadge
        status={step.launchMatched ? 'Launch matched' : 'Launch blocked'}
        variant={step.launchMatched ? 'success' : 'warning'}
        size='sm'
      />
      <StatusBadge
        status={resolveTraceRegexStatus(step)}
        variant={step.regexMatched ? 'success' : 'warning'}
        size='sm'
      />
      <StatusBadge
        status={step.replacementEnabledForScope ? 'Replacement active' : 'Replacement off'}
        variant={step.replacementEnabledForScope ? 'info' : 'warning'}
        size='sm'
      />
      <StatusBadge status={`Executions ${step.executions}`} variant='neutral' size='sm' />
    </div>
  );
}

function SequenceTraceStep(props: {
  step: ValidatorPatternSequenceTraceStep;
  index: number;
}): React.JSX.Element {
  const { step, index } = props;
  const skipLabel = formatTraceSkipReason(step.skipReason);
  const stopLabel = formatTraceStopReason(step.stopReason);

  return (
    <div className='rounded-md border border-border bg-gray-950/40 p-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='text-sm font-medium text-gray-100'>
          {index + 1}. {step.label}
        </div>
        {step.isPreviewPattern ? <StatusBadge status='Preview' variant='info' size='sm' /> : null}
        {step.sequence !== null ? (
          <StatusBadge status={`Seq ${step.sequence}`} variant='neutral' size='sm' />
        ) : null}
        <StatusBadge
          status={step.applied ? 'Applied' : 'No Change'}
          variant={step.applied ? 'success' : 'warning'}
          size='sm'
        />
        {skipLabel !== null ? <StatusBadge status={skipLabel} variant='warning' size='sm' /> : null}
        {stopLabel !== null ? <StatusBadge status={stopLabel} variant='info' size='sm' /> : null}
      </div>
      <TraceValueGrid step={step} />
      <TraceStatusBadges step={step} />
    </div>
  );
}

function SequenceTrace(props: {
  result: ValidatorPatternSimulationResult;
}): React.JSX.Element | null {
  const { result } = props;
  if (result.status !== 'ready' || result.sequenceTrace.length === 0) return null;

  return (
    <div className='space-y-3'>
      <SequenceTraceHeader sequenceGroupLabel={result.sequenceGroupLabel} />
      <div className='space-y-2'>
        {result.sequenceTrace.map((step, index) => (
          <SequenceTraceStep key={`${step.patternId}:${index}`} step={step} index={index} />
        ))}
      </div>
    </div>
  );
}

export function ValidatorPatternSimulationResultView(props: {
  result: ValidatorPatternSimulationResult;
}): React.JSX.Element {
  if (props.result.status === 'invalid') {
    return <InvalidSimulationResult result={props.result} />;
  }

  return (
    <>
      <ReadySimulationResult result={props.result} />
      <SequenceTrace result={props.result} />
    </>
  );
}
