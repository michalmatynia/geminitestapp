'use client';

import { X } from 'lucide-react';

import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { insetPanelVariants } from '@/shared/ui/InsetPanel';
import { Label } from '@/shared/ui/label';
import { SelectSimple } from '@/shared/ui/select-simple';

import {
  ParameterSequenceInferenceToggle,
  ParameterValueInferTrigger,
} from './ProductFormParameters.controls';
import {
  buildProductFormParameterRowModel,
  type ProductFormParameterRowModel,
} from './ProductFormParameters.row-model';
import type {
  CatalogLanguageOption,
  RunParameterValueInference,
} from './ProductFormParameters.types';
import { ProductParameterValueControl } from './ProductFormParameters.value-control';

type ProductFormParameterRowProps = {
  entry: ProductParameterValue;
  index: number;
  parameters: ProductParameter[];
  selectedIds: string[];
  preferredLocale: string;
  parameterById: Map<string, ProductParameter>;
  primaryLanguageCode: string;
  activeParameterLanguage: CatalogLanguageOption;
  catalogLanguages: CatalogLanguageOption[];
  isSequenceRunning: boolean;
  runParameterValueInference: RunParameterValueInference;
  onRemoveParameterValue: (index: number) => void;
  onToggleParameterSequenceExclusion: (rowIndex: number, isExcluded: boolean) => void;
  onUpdateParameterId: (index: number, parameterId: string) => void;
  onUpdateParameterValueByLanguage: (
    index: number,
    languageCode: string,
    nextValue: string
  ) => void;
};

function LinkedTitleTermNotice(props: {
  isLinkedParameter: boolean;
  linkedTitleTermLabel: string | null;
}): React.JSX.Element | null {
  if (props.isLinkedParameter !== true || props.linkedTitleTermLabel === null) return null;
  return (
    <div className='flex items-center gap-2 text-xs text-emerald-300'>
      <span className='rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 font-medium tracking-wide'>
        Synced from English Title
      </span>
      <span>{props.linkedTitleTermLabel} term</span>
    </div>
  );
}

function ParameterSelectorCell(props: {
  entry: ProductParameterValue;
  index: number;
  model: ProductFormParameterRowModel;
  isSequenceRunning: boolean;
  onUpdateParameterId: (index: number, parameterId: string) => void;
}): React.JSX.Element {
  return (
    <div className='w-full md:w-64'>
      <SelectSimple
        size='sm'
        value={props.entry.parameterId}
        onValueChange={(value: string): void => props.onUpdateParameterId(props.index, value)}
        options={props.model.parameterOptions}
        placeholder='Select parameter'
        ariaLabel='Parameter'
        triggerClassName='h-9 bg-gray-900 border-border/50'
        disabled={props.model.isLinkedParameter || props.isSequenceRunning}
        title='Select parameter'
      />
    </div>
  );
}

function ParameterRowValueEditor(props: {
  entry: ProductParameterValue;
  index: number;
  model: ProductFormParameterRowModel;
  activeParameterLanguage: CatalogLanguageOption;
  isSequenceRunning: boolean;
  runParameterValueInference: RunParameterValueInference;
  onToggleParameterSequenceExclusion: (rowIndex: number, isExcluded: boolean) => void;
  onLanguageValueChange: (languageCode: string, nextValue: string) => void;
}): React.JSX.Element {
  const parameterMissing = props.entry.parameterId.length === 0;
  return (
    <div className='space-y-1'>
      <Label className='text-[11px] font-medium uppercase tracking-wider text-gray-400'>
        {props.activeParameterLanguage.label}
      </Label>
      <div className='flex items-start gap-2'>
        <ParameterSequenceInferenceToggle
          rowIndex={props.index}
          selectedParameter={props.model.selectedParameter}
          isExcluded={props.model.isSequenceExcluded}
          disabled={parameterMissing || props.model.isLinkedParameter || props.isSequenceRunning}
          onToggle={props.onToggleParameterSequenceExclusion}
        />
        <ParameterValueInferTrigger
          selectedParameter={props.model.selectedParameter}
          inferenceRows={props.model.rowTriggerInferenceRows}
          disabled={
            parameterMissing ||
            props.model.isLinkedParameter ||
            props.model.isSequenceExcluded ||
            props.isSequenceRunning
          }
          runParameterValueInference={props.runParameterValueInference}
        />
        <div className='min-w-0 flex-1'>
          <ProductParameterValueControl
            rowIndex={props.index}
            parameterId={props.entry.parameterId}
            selectorType={props.model.selectorType}
            activeParameterLanguage={props.activeParameterLanguage}
            activeLanguageValue={props.model.activeLanguageValue}
            normalizedOptionLabels={props.model.normalizedOptionLabels}
            checklistValues={props.model.checklistValues}
            checklistValueKeys={props.model.checklistValueKeys}
            checklistOptions={props.model.checklistOptions}
            selectLabelOptions={props.model.selectLabelOptions}
            isLinkedParameter={props.model.isLinkedParameter}
            isSequenceRunning={props.isSequenceRunning}
            onLanguageValueChange={props.onLanguageValueChange}
          />
        </div>
      </div>
    </div>
  );
}

function RemoveParameterButton(props: {
  index: number;
  isLinkedParameter: boolean;
  isSequenceRunning: boolean;
  onRemoveParameterValue: (index: number) => void;
}): React.JSX.Element {
  const title = props.isLinkedParameter
    ? 'Linked parameters are synced from English Title'
    : 'Remove parameter';
  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      className='h-9 w-9 text-gray-500 hover:text-red-400'
      aria-label='Remove parameter'
      onClick={(): void => props.onRemoveParameterValue(props.index)}
      disabled={props.isLinkedParameter || props.isSequenceRunning}
      title={title}
    >
      <X className='h-4 w-4' />
    </Button>
  );
}

function MissingOptionsAlert(props: {
  model: ProductFormParameterRowModel;
  parameterId: string;
}): React.JSX.Element | null {
  const hasMissingOptions =
    props.model.needsOptions &&
    props.model.normalizedOptionLabels.length === 0 &&
    props.parameterId.length > 0;
  if (hasMissingOptions !== true) return null;
  return (
    <Alert variant='warning' className='py-2'>
      <p className='text-xs'>
        This parameter has no option labels configured yet. Add labels in Product Settings.
      </p>
    </Alert>
  );
}

export function ProductFormParameterRow(
  props: ProductFormParameterRowProps
): React.JSX.Element {
  const model = buildProductFormParameterRowModel(props);
  const handleLanguageValueChange = (languageCode: string, nextValue: string): void => {
    props.onUpdateParameterValueByLanguage(props.index, languageCode, nextValue);
  };

  return (
    <div
      className={`${insetPanelVariants({ radius: 'compact', padding: 'sm' })} flex flex-col gap-3 border-border`}
    >
      <div className='flex flex-col gap-3 md:flex-row md:items-center'>
        <ParameterSelectorCell
          entry={props.entry}
          index={props.index}
          model={model}
          isSequenceRunning={props.isSequenceRunning}
          onUpdateParameterId={props.onUpdateParameterId}
        />
        <div className='flex-1 space-y-3'>
          <LinkedTitleTermNotice
            isLinkedParameter={model.isLinkedParameter}
            linkedTitleTermLabel={model.linkedTitleTermLabel}
          />
          <ParameterRowValueEditor
            entry={props.entry}
            index={props.index}
            model={model}
            activeParameterLanguage={props.activeParameterLanguage}
            isSequenceRunning={props.isSequenceRunning}
            runParameterValueInference={props.runParameterValueInference}
            onToggleParameterSequenceExclusion={props.onToggleParameterSequenceExclusion}
            onLanguageValueChange={handleLanguageValueChange}
          />
        </div>
        <RemoveParameterButton
          index={props.index}
          isLinkedParameter={model.isLinkedParameter}
          isSequenceRunning={props.isSequenceRunning}
          onRemoveParameterValue={props.onRemoveParameterValue}
        />
      </div>
      <MissingOptionsAlert model={model} parameterId={props.entry.parameterId} />
    </div>
  );
}
