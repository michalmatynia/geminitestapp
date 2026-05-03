import { useState, useMemo, useCallback, type Dispatch, type SetStateAction } from 'react';
import { useProducers, useSaveProducerMutation, useDeleteProducerMutation } from '@/features/products/hooks/useProductMetadataQueries';
import { useToast } from '@/shared/ui/toast';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import type { Producer } from '@/shared/contracts/products/producers';

type ProducerFormState = {
  name: string;
  website: string;
};

type ProducersController = {
  query: string;
  setQuery: (query: string) => void;
  filtered: Producer[];
  loading: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  editing: Producer | null;
  form: ProducerFormState;
  setForm: Dispatch<SetStateAction<ProducerFormState>>;
  handleSave: () => Promise<void>;
  openCreate: () => void;
  openEdit: (producer: Producer) => void;
  deleteProducer: (producer: Producer) => void;
  saveMutation: ReturnType<typeof useSaveProducerMutation>;
  ConfirmationModal: ReturnType<typeof useConfirm>['ConfirmationModal'];
};

type ProducerModalState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  editing: Producer | null;
  form: ProducerFormState;
  setForm: Dispatch<SetStateAction<ProducerFormState>>;
  openCreate: () => void;
  openEdit: (producer: Producer) => void;
};

const emptyProducerForm = (): ProducerFormState => ({ name: '', website: '' });

const useFilteredProducers = (
  producers: Producer[] | undefined,
  query: string
): Producer[] =>
  useMemo((): Producer[] => {
    const data = producers ?? [];
    const q = query.trim().toLowerCase();
    if (q.length === 0) return data;
    return data.filter((producer) => producer.name.toLowerCase().includes(q));
  }, [producers, query]);

const useProducerModalState = (): ProducerModalState => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Producer | null>(null);
  const [form, setForm] = useState<ProducerFormState>(() => emptyProducerForm());

  const openCreate = (): void => {
    setEditing(null);
    setForm(emptyProducerForm());
    setOpen(true);
  };

  const openEdit = useCallback((p: Producer): void => {
    setEditing(p);
    setForm({ name: p.name, website: p.website ?? '' });
    setOpen(true);
  }, []);

  return { open, setOpen, editing, form, setForm, openCreate, openEdit };
};

const buildProducerSaveData = (form: ProducerFormState): {
  name: string;
  website: string | null;
} => {
  const website = form.website.trim();
  return {
    name: form.name.trim(),
    website: website.length > 0 ? website : null,
  };
};

export function useProducersController(): ProducersController {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const producersQuery = useProducers();
  const saveMutation = useSaveProducerMutation();
  const deleteMutation = useDeleteProducerMutation();
  const [query, setQuery] = useState('');
  const modalState = useProducerModalState();
  const filtered = useFilteredProducers(producersQuery.data, query);

  const handleSave = async (): Promise<void> => {
    try {
      await saveMutation.mutateAsync({
        id: modalState.editing?.id,
        data: buildProducerSaveData(modalState.form),
      });
      toast(modalState.editing !== null ? 'Updated' : 'Created', { variant: 'success' });
      modalState.setOpen(false);
    } catch (e) {
      logClientCatch(e, { source: 'Producers', action: 'save' });
      toast('Failed to save.', { variant: 'error' });
    }
  };

  const deleteProducer = (p: Producer): void => {
    confirm({
      title: 'Delete?',
      message: `Delete "${p.name}"?`,
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(p.id);
          toast('Deleted', { variant: 'success' });
        } catch (e) {
          logClientCatch(e, { source: 'Producers', action: 'delete' });
          toast('Failed to delete', { variant: 'error' });
        }
      }
    });
  };

  return {
    query, setQuery,
    filtered,
    loading: producersQuery.isLoading,
    open: modalState.open,
    setOpen: modalState.setOpen,
    editing: modalState.editing,
    form: modalState.form,
    setForm: modalState.setForm,
    handleSave,
    openCreate: modalState.openCreate,
    openEdit: modalState.openEdit,
    deleteProducer,
    saveMutation,
    ConfirmationModal,
  };
}
