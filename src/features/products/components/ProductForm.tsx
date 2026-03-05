'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import ProductFormDebugPanel from '@/features/products/components/ProductFormDebugPanel';
import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { ProductValidationSettingsProvider } from '@/features/products/context/ProductValidationSettingsContext';
import {
  PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS,
  type ProductDraftOpenFormTab,
} from '@/shared/contracts/products';
import type { ProductValidationDenyBehavior } from '@/shared/contracts/products';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui';

import ProductFormGeneral from './form/ProductFormGeneral';
import ProductFormOther from './form/ProductFormOther';
import ProductFormParameters from './form/ProductFormParameters';
import ProductFormImages from './form/ProductFormImages';
import ProductFormStudio from './form/ProductFormStudio';
import ProductFormImportInfo from './form/ProductFormImportInfo';
import ProductFormNoteLink from './form/ProductFormNoteLink';
import { ProductFormValidationTab } from './form/ProductFormValidationTab';
import { ProductFormFooter } from './form/ProductFormFooter';
import { useProductFormValidator } from '../hooks/useProductFormValidator';

interface ProductFormProps {
  submitButtonText: string;
  skuRequired?: boolean;
  validationInstanceScopeOverride?: string;
}

const PRODUCT_FORM_TAB_SET = new Set<string>(PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS);

const normalizeProductFormTab = (value: unknown): ProductDraftOpenFormTab => {
  if (typeof value !== 'string') return 'general';
  const trimmed = value.trim();
  if (trimmed === 'custom-fields') return 'parameters';
  if (!PRODUCT_FORM_TAB_SET.has(trimmed)) return 'general';
  return trimmed as ProductDraftOpenFormTab;
};

/**
 * This component renders the product form fields and handles user interactions.
 * It consumes the ProductFormContext to access state and functions.
 * @param submitButtonText - The text to display on the submit button.
 */
export default function ProductForm({
  submitButtonText: _submitButtonText,
  skuRequired: _skuRequired = false,
  validationInstanceScopeOverride,
}: ProductFormProps): React.JSX.Element {
  const { handleSubmit, product, draft, ConfirmationModal } = useProductFormCore();

  const searchParams = useSearchParams();
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProductDraftOpenFormTab>(() =>
    normalizeProductFormTab(draft?.openProductFormTab)
  );

  const [mountedTabs, setMountedTabs] = useState<Set<ProductDraftOpenFormTab>>(() => {
    const initial = new Set<ProductDraftOpenFormTab>(['general']);
    const startTab = normalizeProductFormTab(draft?.openProductFormTab);
    initial.add(startTab);
    return initial;
  });

  const validator = useProductFormValidator(validationInstanceScopeOverride);

  const footerEntityId = product?.id?.trim() || draft?.id?.trim() || '';

  useEffect(() => {
    setIsDebugOpen(searchParams.get('debug') === 'true');
  }, [searchParams]);

  useEffect(() => {
    const requestedTab = searchParams.get('openProductTab');
    if (requestedTab && requestedTab.trim().length > 0) {
      setActiveTab(normalizeProductFormTab(requestedTab));
      return;
    }
    setActiveTab(normalizeProductFormTab(draft?.openProductFormTab));
  }, [draft?.id, draft?.openProductFormTab, searchParams]);

  return (
    <form
      onSubmit={(e: React.FormEvent) => {
        void handleSubmit(e);
      }}
      className='relative min-h-[400px] pb-10'
    >
      {isDebugOpen && <ProductFormDebugPanel />}
      <ProductValidationSettingsProvider
        value={{
          validationInstanceScope: validator.validationInstanceScope,
          validatorEnabled: validator.validatorEnabled,
          formatterEnabled: validator.formatterEnabled,
          setValidatorEnabled: validator.setValidatorEnabled,
          setFormatterEnabled: validator.setFormatterEnabled,
          validationDenyBehavior: validator.validationDenyBehavior,
          setValidationDenyBehavior: (
            behavior: React.SetStateAction<ProductValidationDenyBehavior>
          ): void => {
            if (typeof behavior === 'string') {
              validator.setValidationDenyBehavior(behavior);
            }
          },
          denyActionLabel: validator.denyActionLabel,
          getDenyActionLabel: validator.getDenyActionLabel,
          isIssueDenied: validator.isIssueDenied,
          denyIssue: validator.denyIssue,
          isIssueAccepted: validator.isIssueAccepted,
          acceptIssue: validator.acceptIssue,
          validatorPatterns: validator.validatorPatterns,
          latestProductValues: validator.latestProductValues,
          visibleFieldIssues: validator.visibleFieldIssues,
        }}
      >
        <Tabs
          value={activeTab}
          onValueChange={(value: string): void => {
            const tab = normalizeProductFormTab(value);
            setActiveTab(tab);
            setMountedTabs((prev) => {
              if (prev.has(tab)) return prev;
              const next = new Set(prev);
              next.add(tab);
              return next;
            });
          }}
          className='w-full'
        >
          <TabsList className='grid w-full grid-cols-4 md:grid-cols-8'>
            <TabsTrigger value='general'>General</TabsTrigger>
            <TabsTrigger value='other'>Other</TabsTrigger>
            <TabsTrigger value='parameters'>Parameters</TabsTrigger>
            <TabsTrigger value='images'>Images</TabsTrigger>
            <TabsTrigger value='studio'>Studio</TabsTrigger>
            <TabsTrigger value='import-info'>Import Info</TabsTrigger>
            <TabsTrigger value='note-link'>Note Link</TabsTrigger>
            <TabsTrigger value='validation'>Validation</TabsTrigger>
          </TabsList>
          {/* General tab is always mounted — the formatter effect reads its fields from mount */}
          <TabsContent value='general' className='mt-4 data-[state=inactive]:hidden' forceMount>
            <ProductFormGeneral />
          </TabsContent>
          {/* Remaining tabs use deferred mounting: content renders on first visit and */}
          {/* remains hidden via CSS when inactive, avoiding repeated mount/unmount cost. */}
          <TabsContent value='other' className='mt-4 data-[state=inactive]:hidden' forceMount>
            <ProductFormOther />
          </TabsContent>
          <TabsContent value='parameters' className='mt-4 data-[state=inactive]:hidden'>
            {mountedTabs.has('parameters') && <ProductFormParameters />}
          </TabsContent>
          <TabsContent value='images' className='mt-4 data-[state=inactive]:hidden'>
            {mountedTabs.has('images') && <ProductFormImages />}
          </TabsContent>
          <TabsContent value='studio' className='mt-4 data-[state=inactive]:hidden'>
            {mountedTabs.has('studio') && <ProductFormStudio />}
          </TabsContent>
          <TabsContent value='import-info' className='mt-4 data-[state=inactive]:hidden'>
            {mountedTabs.has('import-info') && <ProductFormImportInfo />}
          </TabsContent>
          <TabsContent value='note-link' className='mt-4 data-[state=inactive]:hidden'>
            {mountedTabs.has('note-link') && <ProductFormNoteLink />}
          </TabsContent>
          <TabsContent value='validation' className='mt-4 space-y-4'>
            <ProductFormValidationTab />
          </TabsContent>
        </Tabs>
      </ProductValidationSettingsProvider>
      <ProductFormFooter entityId={footerEntityId} />
      <ConfirmationModal />
    </form>
  );
}
