'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';


import DebugPanel from '@/features/products/components/DebugPanel';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { useProductValidatorConfig } from '@/features/products/hooks/useProductSettingsQueries';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui';

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
  } = useProductFormContext();
  
  const searchParams = useSearchParams();
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const validatorConfigQuery = useProductValidatorConfig();
  const [validatorEnabled, setValidatorEnabled] = useState(true);
  const [formatterEnabled, setFormatterEnabled] = useState(false);
  const [validatorInitialized, setValidatorInitialized] = useState(false);
  const [validatorManuallyChanged, setValidatorManuallyChanged] = useState(false);

  useEffect(() => {
    setIsDebugOpen(searchParams.get('debug') === 'true');
  }, [searchParams]);

  useEffect(() => {
    if (validatorInitialized) return;
    if (validatorManuallyChanged) return;
    const enabledByDefault = validatorConfigQuery.data?.enabledByDefault;
    if (typeof enabledByDefault !== 'boolean') return;
    setValidatorEnabled(enabledByDefault);
    setValidatorInitialized(true);
  }, [validatorConfigQuery.data?.enabledByDefault, validatorInitialized, validatorManuallyChanged]);

  return (
    <form onSubmit={(e: React.FormEvent) => { void handleSubmit(e); }} className='relative min-h-[400px] pb-10'>
      {isDebugOpen && <DebugPanel />}
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
          <ProductFormGeneral
            validatorEnabled={validatorEnabled}
            formatterEnabled={formatterEnabled}
          />
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
              `Validator` shows correction cues in fields. `Formatter` auto-applies available replacements without confirmation.
            </p>
            <div className='mt-4 flex flex-wrap items-center gap-2'>
              <Button
                type='button'
                onClick={() => {
                  setValidatorManuallyChanged(true);
                  setValidatorInitialized(true);
                  setValidatorEnabled((prev: boolean) => !prev);
                }}
                className={`h-8 rounded border px-2.5 text-[10px] font-semibold tracking-wide ${
                  validatorEnabled
                    ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25'
                    : 'border-slate-500/40 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20'
                }`}
              >
                Validator {validatorEnabled ? 'ON' : 'OFF'}
              </Button>
              <Button
                type='button'
                onClick={() => setFormatterEnabled((prev: boolean) => !prev)}
                className={`h-7 rounded border px-2 text-[10px] font-semibold tracking-wide ${
                  formatterEnabled
                    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25'
                    : 'border-slate-500/40 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20'
                }`}
              >
                Formatter {formatterEnabled ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
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
