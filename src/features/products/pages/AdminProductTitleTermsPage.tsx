'use client';

import { useMemo, useState, useEffect } from 'react';
import { BookType } from 'lucide-react';
import { AdminProductsPageLayout } from '@/shared/ui/admin-products-page-layout';
import { useTitleTermsController } from './title-terms/useTitleTermsController';
import { TitleTermsToolbar } from './title-terms/TitleTermsToolbar';
import { TitleTermsTable } from './title-terms/TitleTermsTable';
import { TitleTermEditorModal } from './title-terms/TitleTermEditorModal';
import type { ProductTitleTermType } from '@/shared/contracts/products/title-terms';

type TitleTermFormState = {
  catalogId: string;
  type: ProductTitleTermType;
  name_en: string;
  name_pl: string;
};

const TITLE_TERM_TYPE_OPTIONS = [
  { label: 'Size', value: 'size' },
  { label: 'Material', value: 'material' },
  { label: 'Theme', value: 'theme' },
] as const satisfies ReadonlyArray<{ label: string; value: ProductTitleTermType }>;

const isProductTitleTermType = (value: string): value is ProductTitleTermType =>
  value === 'size' || value === 'material' || value === 'theme';

const createEmptyTitleTermForm = ({
  catalogFilter,
  catalogOptions,
  typeFilter,
}: {
  catalogFilter: string;
  catalogOptions: Array<{ label: string; value: string }>;
  typeFilter: string;
}): TitleTermFormState => ({
  catalogId: catalogFilter !== 'all' ? catalogFilter : catalogOptions[0]?.value ?? '',
  type: isProductTitleTermType(typeFilter) ? typeFilter : 'size',
  name_en: '',
  name_pl: '',
});

type TitleTermsController = ReturnType<typeof useTitleTermsController>;

type TitleTermField = {
  key: keyof TitleTermFormState;
  label: string;
  type: 'select' | 'text';
  required?: boolean;
  options?: ReadonlyArray<{ label: string; value: string }>;
};

type TitleTermEditorState = {
  fields: TitleTermField[];
  form: TitleTermFormState;
  handleChange: (values: Partial<TitleTermFormState>) => void;
  handleSave: () => Promise<void>;
};

const saveTitleTermForm = async (
  ctrl: TitleTermsController,
  form: TitleTermFormState
): Promise<void> => {
  const namePl = form.name_pl.trim();
  const data = {
    catalogId: form.catalogId.trim(),
    type: form.type,
    name_en: form.name_en.trim(),
    name_pl: namePl.length > 0 ? namePl : null,
  };

  if (ctrl.editing === null) {
    await ctrl.saveMutation.mutateAsync({ data });
  } else {
    await ctrl.saveMutation.mutateAsync({ id: ctrl.editing.id, data });
  }

  ctrl.setOpen(false);
};

const useTitleTermEditorState = (ctrl: TitleTermsController): TitleTermEditorState => {
  const [form, setForm] = useState<TitleTermFormState>(() =>
    createEmptyTitleTermForm({
      catalogFilter: ctrl.catalogFilter,
      catalogOptions: ctrl.catalogOptions,
      typeFilter: ctrl.typeFilter,
    })
  );

  const fields = useMemo<TitleTermField[]>(
    () => [
      { key: 'catalogId', label: 'Catalog', type: 'select', required: true, options: ctrl.catalogOptions },
      { key: 'type', label: 'Type', type: 'select', required: true, options: TITLE_TERM_TYPE_OPTIONS },
      { key: 'name_en', label: 'English name', type: 'text', required: true },
      { key: 'name_pl', label: 'Polish translation', type: 'text' },
    ],
    [ctrl.catalogOptions]
  );

  useEffect(() => {
    if (!ctrl.open) return;

    if (ctrl.editing !== null) {
      setForm({
        catalogId: ctrl.editing.catalogId,
        type: ctrl.editing.type,
        name_en: ctrl.editing.name_en,
        name_pl: ctrl.editing.name_pl ?? '',
      });
      return;
    }

    setForm(
      createEmptyTitleTermForm({
        catalogFilter: ctrl.catalogFilter,
        catalogOptions: ctrl.catalogOptions,
        typeFilter: ctrl.typeFilter,
      })
    );
  }, [ctrl.catalogFilter, ctrl.catalogOptions, ctrl.editing, ctrl.open, ctrl.typeFilter]);

  const handleChange = (values: Partial<TitleTermFormState>): void => {
    setForm(prev => ({ ...prev, ...values }));
  };
  const handleSave = (): Promise<void> => saveTitleTermForm(ctrl, form);

  return {
    fields,
    form,
    handleChange,
    handleSave,
  };
};

export function AdminProductTitleTermsPage(): React.JSX.Element {
  const ctrl = useTitleTermsController();
  const ConfirmationModal = ctrl.ConfirmationModal;
  const editor = useTitleTermEditorState(ctrl);

  return (
    <AdminProductsPageLayout
      title='Product Title Terms'
      current='Product Title Terms'
      description='Manage catalog-specific terms.'
      icon={<BookType className='size-4' />}
    >
      <TitleTermsToolbar {...ctrl} />
      <TitleTermsTable
        filteredTerms={ctrl.filteredTerms}
        isLoading={ctrl.isLoading}
        catalogNameById={ctrl.catalogNameById}
        openEdit={ctrl.openEdit}
        deleteTerm={ctrl.deleteTerm}
      />

      <TitleTermEditorModal
        open={ctrl.open}
        setOpen={ctrl.setOpen}
        editing={ctrl.editing}
        form={editor.form}
        handleChange={editor.handleChange}
        handleSave={editor.handleSave}
        isSaving={ctrl.saveMutation.isPending}
        fields={editor.fields}
      />
      <ConfirmationModal />
    </AdminProductsPageLayout>
  );
}

export default AdminProductTitleTermsPage;
