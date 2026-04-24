'use client';

import { Factory } from 'lucide-react';
import { AdminProductsPageLayout } from '@/shared/ui/admin-products-page-layout';
import { useProducersController } from './producers/useProducersController';
import { ProducersToolbar } from './producers/ProducersToolbar';
import { ProducersTable } from './producers/ProducersTable';
import { ProducerEditorModal } from './producers/ProducerEditorModal';

export function AdminProductProducersPage(): React.JSX.Element {
  const ctrl = useProducersController();
  const ConfirmationModal = ctrl.ConfirmationModal;

  return (
    <AdminProductsPageLayout
        title='Producers'
        current='Producers'
        description='Manage producers and assign them in Product Edit.'
        icon={<Factory className='size-4' />}
      >
      <ProducersToolbar 
        query={ctrl.query} 
        setQuery={ctrl.setQuery} 
        openCreate={ctrl.openCreate} 
      />
      <ProducersTable 
        filtered={ctrl.filtered} 
        loading={ctrl.loading} 
        openEdit={ctrl.openEdit} 
        deleteProducer={ctrl.deleteProducer} 
        openCreate={ctrl.openCreate} 
        query={ctrl.query}
      />

      <ProducerEditorModal 
        open={ctrl.open} 
        setOpen={ctrl.setOpen} 
        editing={ctrl.editing} 
        form={ctrl.form} 
        handleChange={ctrl.setForm} 
        handleSave={ctrl.handleSave} 
        isSaving={ctrl.saveMutation.isPending} 
      />

      {ConfirmationModal ? <ConfirmationModal /> : null}
    </AdminProductsPageLayout>
  );
}

export default AdminProductProducersPage;
