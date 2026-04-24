import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';

export function ProducerEditorModal({ open, setOpen, editing, form, handleChange, handleSave, isSaving }: any) {
  const fields = [
    { key: 'name', label: 'Name', type: 'text', placeholder: 'Producer name', required: true },
    { key: 'website', label: 'Website', type: 'text', placeholder: 'https://...', helperText: 'Optional' },
  ];

  return (
    <SettingsPanelBuilder
      open={open}
      onClose={() => setOpen(false)}
      title={editing ? 'Edit Producer' : 'Create Producer'}
      fields={fields}
      values={form}
      onChange={handleChange}
      onSave={handleSave}
      isSaving={isSaving}
      size='sm'
    />
  );
}
