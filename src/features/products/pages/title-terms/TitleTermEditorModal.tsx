import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';

export function TitleTermEditorModal({ open, setOpen, editing, form, handleChange, handleSave, isSaving, fields }: any) {
  return (
    <SettingsPanelBuilder
      open={open}
      onClose={() => setOpen(false)}
      title={editing ? 'Edit Title Term' : 'Create Title Term'}
      fields={fields}
      values={form}
      onChange={handleChange}
      onSave={handleSave}
      isSaving={isSaving}
      size='sm'
    />
  );
}
