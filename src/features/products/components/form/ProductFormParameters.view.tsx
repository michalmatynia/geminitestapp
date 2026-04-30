'use client';

import type { ProductParameterValue } from '@/shared/contracts/products/product';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { CompactEmptyState } from '@/shared/ui/empty-state';
import { FormSection } from '@/shared/ui/form-section';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';

import { ProductFormParameterRow } from './ProductFormParameters.row';
import type {
  CatalogLanguageOption,
  ProductFormParametersViewModel,
} from './ProductFormParameters.types';

function NoCatalogWarning(): React.JSX.Element {
  return (
    <Alert variant='warning' className='mb-6'>
      <p className='text-sm'>Select a catalog to manage product parameters.</p>
    </Alert>
  );
}

function ParameterSequenceToolbar(props: {
  model: ProductFormParametersViewModel;
}): React.JSX.Element {
  const { model } = props;
  return (
    <div className='mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
      <div className='min-h-4 text-xs text-muted-foreground'>
        {model.sequenceStatusMessage !== null ? (
          <span
            className={model.sequenceState.status === 'failed' ? 'text-destructive' : undefined}
          >
            {model.sequenceStatusMessage}
          </span>
        ) : null}
      </div>
      <div className='flex justify-end gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={(): void => {
            void model.handleRunParameterSequence();
          }}
          disabled={
            model.parametersLoading ||
            model.parameters.length === 0 ||
            model.eligibleSequenceRows.length === 0 ||
            model.isSequenceRunning
          }
        >
          Run parameter sequence
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={model.addParameterValue}
          disabled={
            model.parametersLoading || model.parameters.length === 0 || model.isSequenceRunning
          }
        >
          Add parameter
        </Button>
      </div>
    </div>
  );
}

function ProductParameterLanguageTabs(props: {
  model: ProductFormParametersViewModel;
}): React.JSX.Element {
  const { model } = props;
  return (
    <Tabs
      value={model.resolvedActiveParameterLanguageTab}
      onValueChange={model.setActiveParameterLanguageTab}
      className='w-full'
    >
      <TabsList className='mb-1' aria-label='Product parameter language tabs'>
        {model.catalogLanguages.map((language: CatalogLanguageOption) => {
          const hasValue = model.hasParameterValueByLanguage[language.code] === true;
          return (
            <TabsTrigger
              key={language.code}
              value={language.code}
              className={
                hasValue
                  ? 'text-foreground data-[state=inactive]:text-foreground font-medium'
                  : 'text-muted-foreground/90 data-[state=active]:text-muted-foreground/90'
              }
            >
              {language.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}

function ProductParameterRows(props: {
  model: ProductFormParametersViewModel;
}): React.JSX.Element {
  const { model } = props;
  return (
    <div className='space-y-3'>
      <ProductParameterLanguageTabs model={model} />
      {model.parameterValues.map((entry: ProductParameterValue, index: number) => (
        <ProductFormParameterRow
          key={`${entry.parameterId.length > 0 ? entry.parameterId : 'new'}-${index}`}
          entry={entry}
          index={index}
          parameters={model.parameters}
          selectedIds={model.selectedIds}
          preferredLocale={model.preferredLocale}
          parameterById={model.parameterById}
          primaryLanguageCode={model.primaryLanguageCode}
          activeParameterLanguage={model.activeParameterLanguage}
          catalogLanguages={model.catalogLanguages}
          isSequenceRunning={model.isSequenceRunning}
          runParameterValueInference={model.runParameterValueInference}
          onRemoveParameterValue={model.removeParameterValue}
          onToggleParameterSequenceExclusion={model.toggleParameterSequenceExclusion}
          onUpdateParameterId={model.updateParameterId}
          onUpdateParameterValueByLanguage={model.updateParameterValueByLanguage}
        />
      ))}
    </div>
  );
}

function ProductParametersContent(props: {
  model: ProductFormParametersViewModel;
}): React.JSX.Element {
  const { model } = props;
  if (model.parametersLoading) {
    return <LoadingState message='Loading parameters...' className='py-8 border border-dashed' />;
  }
  if (model.parameters.length === 0) {
    return (
      <CompactEmptyState
        title='No parameters'
        description='No parameters available for the selected catalog(s).'
        className='bg-card/20 py-8'
      />
    );
  }
  if (model.parameterValues.length === 0) {
    return (
      <CompactEmptyState
        title='No values'
        description='Add your first parameter to start building values.'
        className='bg-card/20 py-8'
      />
    );
  }
  return <ProductParameterRows model={model} />;
}

export function ProductFormParametersView(props: {
  model: ProductFormParametersViewModel;
}): React.JSX.Element {
  if (props.model.selectedCatalogIds.length === 0) return <NoCatalogWarning />;
  return (
    <div className='space-y-6'>
      <FormSection
        title='Parameters'
        description='Choose parameters and provide values for this product.'
      >
        <ParameterSequenceToolbar model={props.model} />
        <ProductParametersContent model={props.model} />
      </FormSection>
    </div>
  );
}
