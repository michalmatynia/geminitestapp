import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import type {
  ProductTitleTerm,
  ProductTitleTermType,
} from '@/shared/contracts/products/title-terms';
import type { SettingsPanelField } from '@/shared/contracts/ui/settings';

type TitleTermFormState = {
  type: ProductTitleTermType;
  name_en: string;
  name_pl: string;
};

interface TitleTermEditorModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  editing: ProductTitleTerm | null;
  form: TitleTermFormState;
  handleChange: (values: Partial<TitleTermFormState>) => void;
  handleSave: () => Promise<void>;
  isSaving: boolean;
  fields: Array<SettingsPanelField<TitleTermFormState>>;
}

export function TitleTermEditorModal({
  open,
  setOpen,
  editing,
  form,
  handleChange,
  handleSave,
  isSaving,
  fields,
}: TitleTermEditorModalProps): React.JSX.Element {
  return (
    <SettingsPanelBuilder
      open={open}
      onClose={() => setOpen(false)}
      title={editing !== null ? 'Edit Title Term' : 'Create Title Term'}
      fields={fields}
      values={form}
      onChange={handleChange}
      onSave={handleSave}
      isSaving={isSaving}
      size='sm'
    />
  );
}
