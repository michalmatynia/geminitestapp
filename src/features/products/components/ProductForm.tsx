'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import DebugPanel from '@/features/products/components/DebugPanel';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { ProductValidationSettingsProvider } from '@/features/products/context/ProductValidationSettingsContext';
import { useProductValidatorConfig } from '@/features/products/hooks/useProductSettingsQueries';
import { Tabs, TabsList, TabsTrigger, TabsContent, ValidatorFormatterToggle } from '@/shared/ui';

import ProductFormGeneral from './form/ProductFormGeneral';
import ProductFormImages from './form/ProductFormImages';
import ProductFormImportInfo from './form/ProductFormImportInfo';
import ProductFormNoteLink from './form/ProductFormNoteLink';
import ProductFormOther from './form/ProductFormOther';
import ProductFormParameters from './form/ProductFormParameters';

interface ProductFormProps {
  submitButtonText: string;
  skuRequired?: boolean;
}

/**
 * This component renders the product form fields and handles user interactions.
 * It consumes the ProductFormContext to access state and functions.
 * @param submitButtonText - The text to display on the submit button.
 */
export default function ProductForm({
  submitButtonText: _submitButtonText,
  skuRequired: _skuRequired = false,
}: ProductFormProps): React.JSX.Element {
  const {
    handleSubmit,
    product,
    draft,
  } = useProductFormContext();
  
  const searchParams = useSearchParams();
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const validatorConfigQuery = useProductValidatorConfig();
  const [validatorEnabled, setValidatorEnabled] = useState<boolean>(() => draft?.validatorEnabled ?? true);
  const [formatterEnabled, setFormatterEnabled] = useState<boolean>(
    () => ((draft?.validatorEnabled ?? true) ? (draft?.formatterEnabled ?? false) : false)
  );
  const [validatorInitialized, setValidatorInitialized] = useState<boolean>(
    () => typeof draft?.validatorEnabled === 'boolean'
  );
  const [validatorManuallyChanged, setValidatorManuallyChanged] = useState(false);

  useEffect(() => {
    setIsDebugOpen(searchParams.get('debug') === 'true');
  }, [searchParams]);

  useEffect(() => {
    if (!draft) return;
    const nextValidatorEnabled = draft.validatorEnabled ?? true;
    setValidatorEnabled(nextValidatorEnabled);
    setFormatterEnabled(nextValidatorEnabled ? (draft.formatterEnabled ?? false) : false);
    setValidatorInitialized(true);
    setValidatorManuallyChanged(false);
  }, [draft?.id, draft?.validatorEnabled, draft?.formatterEnabled]);

  useEffect(() => {
    if (validatorEnabled) return;
    if (!formatterEnabled) return;
    setFormatterEnabled(false);
  }, [validatorEnabled, formatterEnabled]);

  useEffect(() => {
    if (validatorInitialized) return;
    if (validatorManuallyChanged) return;
    const enabledByDefault = validatorConfigQuery.data?.enabledByDefault;
    if (typeof enabledByDefault !== 'boolean') return;
    setValidatorEnabled(enabledByDefault);
    setValidatorInitialized(true);
  }, [
    validatorConfigQuery.data?.enabledByDefault,
    validatorInitialized,
    validatorManuallyChanged,
  ]);

  return (
    <form onSubmit={(e: React.FormEvent) => { void handleSubmit(e); }} className='relative min-h-[400px] pb-10'>
      {isDebugOpen && <DebugPanel />}
      <ProductValidationSettingsProvider
        value={{
          validatorEnabled,
          formatterEnabled,
          setValidatorEnabled,
          setFormatterEnabled,
        }}
      >
        <Tabs defaultValue='general' className='w-full'>
          <TabsList className='grid w-full grid-cols-4 md:grid-cols-7'>
            <TabsTrigger value='general'>General</TabsTrigger>
            <TabsTrigger value='other'>Other</TabsTrigger>
            <TabsTrigger value='parameters'>Parameters</TabsTrigger>
            <TabsTrigger value='images'>Images</TabsTrigger>
            <TabsTrigger value='import-info'>Import Info</TabsTrigger>
            <TabsTrigger value='note-link'>Note Link</TabsTrigger>
            <TabsTrigger value='validation'>Validation</TabsTrigger>
          </TabsList>
          <TabsContent value='general' className='mt-4'>
            <ProductFormGeneral />
          </TabsContent>
          <TabsContent value='other' className='mt-4'>
            <ProductFormOther />
          </TabsContent>
          <TabsContent value='parameters' className='mt-4'>
            <ProductFormParameters />
          </TabsContent>
          <TabsContent value='images' className='mt-4'>
            <ProductFormImages />
          </TabsContent>
          <TabsContent value='import-info' className='mt-4'>
            <ProductFormImportInfo />
          </TabsContent>
          <TabsContent value='note-link' className='mt-4'>
            <ProductFormNoteLink />
          </TabsContent>
          <TabsContent value='validation' className='mt-4 space-y-4'>
            <div className='rounded-md border border-border bg-gray-900/70 p-4'>
              <p className='text-sm font-semibold text-white'>Validation Controls</p>
              <p className='mt-1 text-xs text-gray-400'>
                `Validator` enables validation rules. `Formatter` auto-applies rules configured for formatter mode.
              </p>
              <ValidatorFormatterToggle
                className='mt-4'
                validatorEnabled={validatorEnabled}
                formatterEnabled={formatterEnabled}
                onValidatorChange={(next: boolean): void => {
                  setValidatorManuallyChanged(true);
                  setValidatorInitialized(true);
                  setValidatorEnabled(next);
                }}
                onFormatterChange={(next: boolean): void => setFormatterEnabled(next)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </ProductValidationSettingsProvider>
      {product?.id && (
        <div className='absolute bottom-0 right-0 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors'>
          <span className='mr-1'>ID:</span>
          <span className='font-mono select-all cursor-text' title='Click to select'>
            {product.id}
          </span>
        </div>
      )}
    </form>
  );
}
