import { useState, useMemo, useCallback } from 'react';
import { useProducers, useSaveProducerMutation, useDeleteProducerMutation } from '@/features/products/hooks/useProductMetadataQueries';
import { useToast } from '@/shared/ui/toast';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import type { Producer } from '@/shared/contracts/products/producers';

export function useProducersController() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const producersQuery = useProducers();
  const saveMutation = useSaveProducerMutation();
  const deleteMutation = useDeleteProducerMutation();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Producer | null>(null);
  const [form, setForm] = useState({ name: '', website: '' });

  const filtered = useMemo((): Producer[] => {
    const data = producersQuery.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(p => p.name.toLowerCase().includes(q));
  }, [producersQuery.data, query]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', website: '' });
    setOpen(true);
  };

  const openEdit = useCallback((p: Producer) => {
    setEditing(p);
    setForm({ name: p.name ?? '', website: p.website ?? '' });
    setOpen(true);
  }, []);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ id: editing?.id, data: { name: form.name.trim(), website: form.website.trim() || null } });
      toast(editing ? 'Updated' : 'Created', { variant: 'success' });
      setOpen(false);
    } catch (e) {
      logClientCatch(e, { source: 'Producers', action: 'save' });
      toast('Failed to save.', { variant: 'error' });
    }
  };

  const deleteProducer = async (p: Producer) => {
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
    open, setOpen,
    editing,
    form, setForm,
    handleSave,
    openCreate,
    openEdit,
    deleteProducer,
    saveMutation
  };
}
