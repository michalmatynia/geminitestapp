'use client';

import { useMemo, useState, useEffect } from 'react';
import { BookType } from 'lucide-react';
import { AdminProductsPageLayout } from '@/shared/ui/admin-products-page-layout';
import { useTitleTermsController } from './title-terms/useTitleTermsController';
import { TitleTermsToolbar } from './title-terms/TitleTermsToolbar';
import { TitleTermsTable } from './title-terms/TitleTermsTable';
import { TitleTermEditorModal } from './title-terms/TitleTermEditorModal';
import { ConfirmationModal } from '@/shared/ui/templates/modals';

export default function AdminProductTitleTermsPage(): React.JSX.Element {
  const ctrl = useTitleTermsController();
  const [form, setForm] = useState({ catalogId: '', type: 'size', name_en: '', name_pl: '' });

  const fields = useMemo(() => [
    { key: 'catalogId', label: 'Catalog', type: 'select', required: true, options: ctrl.catalogOptions },
    { key: 'type', label: 'Type', type: 'select', required: true, options: [{ label: 'Size', value: 'size' }, { label: 'Material', value: 'material' }, { label: 'Theme', value: 'theme' }] },
    { key: 'name_en', label: 'English name', type: 'text', required: true },
    { key: 'name_pl', label: 'Polish translation', type: 'text' },
  ], [ctrl.catalogOptions]);

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
        form={form} 
        handleChange={(v: any) => setForm(prev => ({...prev, ...v}))} 
        handleSave={() => {}} 
        isSaving={ctrl.saveMutation.isPending} 
        fields={fields} 
      />
      <ConfirmationModal />
    </AdminProductsPageLayout>
  );
}
