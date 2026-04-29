import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import type { SettingsPanelField } from '@/shared/contracts/ui/settings';
import type { Producer } from '@/shared/contracts/products/producers';

type ProducerEditorForm = {
  name: string;
  website: string;
};

type ProducerEditorModalProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  editing: Producer | null;
  form: ProducerEditorForm;
  handleChange: (values: Partial<ProducerEditorForm>) => void;
  handleSave: () => Promise<void>;
  isSaving: boolean;
};

const fields: Array<SettingsPanelField<ProducerEditorForm>> = [
    { key: 'name', label: 'Name', type: 'text', placeholder: 'Producer name', required: true },
    { key: 'website', label: 'Website', type: 'text', placeholder: 'https://...', helperText: 'Optional' },
];

export function ProducerEditorModal({
  open,
  setOpen,
  editing,
  form,
  handleChange,
  handleSave,
  isSaving,
}: ProducerEditorModalProps): React.JSX.Element {
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
