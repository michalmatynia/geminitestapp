'use client';

import { Copy, Plus, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/features/products/constants';
import {
  useCreateValidationPatternMutation,
  useDeleteValidationPatternMutation,
  useUpdateValidationPatternMutation,
  useUpdateValidatorSettingsMutation,
  useValidationPatterns,
  useValidatorSettings,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { ProductValidationPattern } from '@/shared/types/domain/products';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Label,
  MultiSelect,
  SectionPanel,
  SharedModal,
  Textarea,
  UnifiedSelect,
  useToast,
} from '@/shared/ui';

type PatternFormData = {
  label: string;
  target: 'name' | 'description';
  locale: string;
  regex: string;
  flags: string;
  message: string;
  severity: 'error' | 'warning';
  enabled: boolean;
  replacementEnabled: boolean;
  replacementValue: string;
  replacementFields: string[];
};

const EMPTY_FORM: PatternFormData = {
  label: '',
  target: 'name',
  locale: '',
  regex: '',
  flags: '',
  message: '',
  severity: 'error',
  enabled: true,
  replacementEnabled: false,
  replacementValue: '',
  replacementFields: [],
};

const REPLACEMENT_FIELD_LABELS: Record<string, string> = {
  name_en: 'Name (EN)',
  name_pl: 'Name (PL)',
  name_de: 'Name (DE)',
  description_en: 'Description (EN)',
  description_pl: 'Description (PL)',
  description_de: 'Description (DE)',
};

const REPLACEMENT_FIELD_OPTIONS = PRODUCT_VALIDATION_REPLACEMENT_FIELDS.map((field) => ({
  value: field,
  label: REPLACEMENT_FIELD_LABELS[field] ?? field,
}));

const ALLOWED_REPLACEMENT_FIELDS = new Set<string>(PRODUCT_VALIDATION_REPLACEMENT_FIELDS);

const normalizeReplacementFields = (fields: string[] | null | undefined): string[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  const unique = new Set<string>();
  for (const field of fields) {
    if (!field || !ALLOWED_REPLACEMENT_FIELDS.has(field)) continue;
    unique.add(field);
  }
  return [...unique];
};

const formatReplacementFields = (fields: string[] | null | undefined): string => {
  const normalized = normalizeReplacementFields(fields);
  if (normalized.length === 0) return 'all matching fields';
  return normalized.map((field) => REPLACEMENT_FIELD_LABELS[field] ?? field).join(', ');
};

const buildDuplicateLabel = (label: string, existingLabels: Set<string>): string => {
  const trimmed = label.trim() || 'Pattern';
  const base = `${trimmed} (copy)`;
  let candidate = base;
  let counter = 2;
  while (existingLabels.has(candidate.toLowerCase())) {
    candidate = `${base} ${counter}`;
    counter += 1;
  }
  return candidate;
};

const ToggleButton = ({
  enabled,
  disabled,
  onClick,
}: {
  enabled: boolean;
  disabled?: boolean;
  onClick: () => void;
}): React.JSX.Element => (
  <Button
    type='button'
    disabled={disabled}
    onClick={onClick}
    className={`rounded border px-3 py-1 text-xs ${
      enabled
        ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
        : 'border-red-500/60 bg-red-500/15 text-red-200 hover:bg-red-500/25'
    }`}
  >
    {enabled ? 'ON' : 'OFF'}
  </Button>
);

export function ValidatorSettings(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useValidatorSettings();
  const patternsQuery = useValidationPatterns();

  const updateSettings = useUpdateValidatorSettingsMutation();
  const createPattern = useCreateValidationPatternMutation();
  const updatePattern = useUpdateValidationPatternMutation();
  const deletePattern = useDeleteValidationPatternMutation();

  const [showModal, setShowModal] = useState(false);
  const [editingPattern, setEditingPattern] = useState<ProductValidationPattern | null>(null);
  const [formData, setFormData] = useState<PatternFormData>(EMPTY_FORM);
  const [patternToDelete, setPatternToDelete] = useState<ProductValidationPattern | null>(null);

  const patterns = patternsQuery.data ?? [];
  const enabledByDefault = settingsQuery.data?.enabledByDefault ?? true;
  const loading = settingsQuery.isLoading || patternsQuery.isLoading;
  const replacementFieldOptions = useMemo(
    () => REPLACEMENT_FIELD_OPTIONS.filter((option) => option.value.startsWith(`${formData.target}_`)),
    [formData.target]
  );

  const summary = useMemo((): { total: number; enabled: number } => {
    const total = patterns.length;
    const enabled = patterns.filter((pattern: ProductValidationPattern) => pattern.enabled).length;
    return { total, enabled };
  }, [patterns]);

  const openCreate = (): void => {
    setEditingPattern(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (pattern: ProductValidationPattern): void => {
    setEditingPattern(pattern);
    setFormData({
      label: pattern.label,
      target: pattern.target,
      locale: pattern.locale ?? '',
      regex: pattern.regex,
      flags: pattern.flags ?? '',
      message: pattern.message,
      severity: pattern.severity,
      enabled: pattern.enabled,
      replacementEnabled: pattern.replacementEnabled,
      replacementValue: pattern.replacementValue ?? '',
      replacementFields: normalizeReplacementFields(pattern.replacementFields),
    });
    setShowModal(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!formData.label.trim()) {
      toast('Pattern label is required.', { variant: 'error' });
      return;
    }
    if (!formData.regex.trim()) {
      toast('Regex is required.', { variant: 'error' });
      return;
    }
    if (!formData.message.trim()) {
      toast('Issue message is required.', { variant: 'error' });
      return;
    }
    if (formData.replacementEnabled && !formData.replacementValue.trim()) {
      toast('Replacement value is required when replacer is ON.', { variant: 'error' });
      return;
    }

    try {
      const payload = {
        label: formData.label.trim(),
        target: formData.target,
        locale: formData.locale.trim().toLowerCase() || null,
        regex: formData.regex.trim(),
        flags: formData.flags.trim() || null,
        message: formData.message.trim(),
        severity: formData.severity,
        enabled: formData.enabled,
        replacementEnabled: formData.replacementEnabled,
        replacementValue: formData.replacementValue.trim() || null,
        replacementFields: normalizeReplacementFields(formData.replacementFields),
      };

      if (editingPattern) {
        await updatePattern.mutateAsync({
          id: editingPattern.id,
          data: payload,
        });
        toast('Pattern updated.', { variant: 'success' });
      } else {
        await createPattern.mutateAsync(payload);
        toast('Pattern created.', { variant: 'success' });
      }
      setShowModal(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save pattern.', { variant: 'error' });
    }
  };

  const handleToggleDefault = async (): Promise<void> => {
    try {
      await updateSettings.mutateAsync({ enabledByDefault: !enabledByDefault });
      toast(`Validator default set to ${!enabledByDefault ? 'ON' : 'OFF'}.`, { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update validator settings.', { variant: 'error' });
    }
  };

  const handleTogglePattern = async (pattern: ProductValidationPattern): Promise<void> => {
    try {
      await updatePattern.mutateAsync({
        id: pattern.id,
        data: { enabled: !pattern.enabled },
      });
      toast(`Pattern ${!pattern.enabled ? 'enabled' : 'disabled'}.`, { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update pattern.', { variant: 'error' });
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!patternToDelete) return;
    try {
      await deletePattern.mutateAsync(patternToDelete.id);
      toast('Pattern deleted.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete pattern.', { variant: 'error' });
    } finally {
      setPatternToDelete(null);
    }
  };

  const handleDuplicatePattern = async (pattern: ProductValidationPattern): Promise<void> => {
    const existingLabels = new Set(
      patterns
        .map((item: ProductValidationPattern) => item.label.trim().toLowerCase())
        .filter((value: string) => value.length > 0)
    );
    const duplicatedLabel = buildDuplicateLabel(pattern.label, existingLabels);
    try {
      await createPattern.mutateAsync({
        label: duplicatedLabel,
        target: pattern.target,
        locale: pattern.locale,
        regex: pattern.regex,
        flags: pattern.flags,
        message: pattern.message,
        severity: pattern.severity,
        enabled: pattern.enabled,
        replacementEnabled: pattern.replacementEnabled,
        replacementValue: pattern.replacementValue,
        replacementFields: normalizeReplacementFields(pattern.replacementFields),
      });
      toast('Pattern duplicated.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to duplicate pattern.', { variant: 'error' });
    }
  };

  return (
    <div className='space-y-5'>
      <SectionPanel variant='subtle' className='p-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='space-y-1'>
            <p className='text-sm font-semibold text-white'>Product Validator Default</p>
            <p className='text-xs text-gray-400'>
              Controls whether validator checks are ON by default in Product Create/Edit forms.
            </p>
          </div>
          <ToggleButton
            enabled={enabledByDefault}
            disabled={updateSettings.isPending || settingsQuery.isLoading}
            onClick={() => {
              void handleToggleDefault();
            }}
          />
        </div>
      </SectionPanel>

      <SectionPanel variant='subtle' className='p-4'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-sm font-semibold text-white'>Regex Pattern Table</p>
            <p className='text-xs text-gray-400'>
              Active patterns: {summary.enabled}/{summary.total}
            </p>
          </div>
          <Button
            onClick={openCreate}
            className='bg-white text-gray-900 hover:bg-gray-200'
          >
            <Plus className='mr-2 size-4' />
            Add Pattern
          </Button>
        </div>

        {loading ? (
          <div className='rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
            Loading validator patterns...
          </div>
        ) : patterns.length === 0 ? (
          <EmptyState
            title='No validator patterns'
            description='Create your first regex rule to validate product names and descriptions.'
            action={
              <Button onClick={openCreate} variant='outline'>
                <Plus className='mr-2 size-4' />
                Create Pattern
              </Button>
            }
          />
        ) : (
          <div className='space-y-2'>
            {patterns.map((pattern: ProductValidationPattern) => (
              <SectionPanel
                key={pattern.id}
                variant='subtle-compact'
                className='flex flex-col gap-3 bg-gray-900'
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='truncate text-sm font-medium text-white'>{pattern.label}</span>
                      <span className='rounded border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-[10px] uppercase text-blue-200'>
                        {pattern.target}
                      </span>
                      <span className='rounded border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-[10px] uppercase text-indigo-200'>
                        {pattern.locale || 'any locale'}
                      </span>
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] uppercase ${
                          pattern.severity === 'warning'
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                            : 'border-red-500/40 bg-red-500/10 text-red-200'
                        }`}
                      >
                        {pattern.severity}
                      </span>
                    </div>
                    <div className='mt-1 truncate font-mono text-xs text-gray-300'>
                      /{pattern.regex}/{pattern.flags ?? ''}
                    </div>
                    <p className='mt-1 text-xs text-gray-400'>{pattern.message}</p>
                    {pattern.replacementEnabled && pattern.replacementValue && (
                      <p className='mt-1 text-xs text-emerald-300'>
                        Replacer: <span className='font-mono'>{pattern.replacementValue}</span>
                      </p>
                    )}
                    {pattern.replacementEnabled && (
                      <p className='mt-1 text-[11px] text-emerald-200/90'>
                        Fields: {formatReplacementFields(pattern.replacementFields)}
                      </p>
                    )}
                  </div>

                  <div className='flex items-center gap-2'>
                    <ToggleButton
                      enabled={pattern.enabled}
                      disabled={updatePattern.isPending}
                      onClick={() => {
                        void handleTogglePattern(pattern);
                      }}
                    />
                    <Button
                      type='button'
                      onClick={() => {
                        void handleDuplicatePattern(pattern);
                      }}
                      className='rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 hover:bg-slate-700'
                      title='Duplicate pattern'
                      disabled={createPattern.isPending}
                    >
                      <Copy className='size-3' />
                    </Button>
                    <Button
                      type='button'
                      onClick={() => openEdit(pattern)}
                      className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-100 hover:bg-gray-700'
                      title='Edit pattern'
                    >
                      <Pencil className='size-3' />
                    </Button>
                    <Button
                      type='button'
                      onClick={() => setPatternToDelete(pattern)}
                      className='rounded bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-600'
                      title='Delete pattern'
                    >
                      <Trash2 className='size-3' />
                    </Button>
                  </div>
                </div>
              </SectionPanel>
            ))}
          </div>
        )}
      </SectionPanel>

      <ConfirmDialog
        open={!!patternToDelete}
        onOpenChange={(open: boolean) => !open && setPatternToDelete(null)}
        onConfirm={() => {
          void handleDelete();
        }}
        title='Delete Pattern'
        description={`Delete validator pattern "${patternToDelete?.label}"? This cannot be undone.`}
        confirmText='Delete'
        variant='destructive'
      />

      {showModal && (
        <SharedModal
          open={showModal}
          onClose={() => setShowModal(false)}
          title={editingPattern ? 'Edit Validator Pattern' : 'Create Validator Pattern'}
          size='lg'
        >
          <div className='space-y-4'>
            <div>
              <Label className='text-xs text-gray-400'>Label</Label>
              <Input
                className='mt-2'
                value={formData.label}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: PatternFormData) => ({ ...prev, label: event.target.value }))
                }
                placeholder='Double spaces'
              />
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div>
                <Label className='text-xs text-gray-400'>Target</Label>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={formData.target}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => {
                        const nextTarget = value as 'name' | 'description';
                        return {
                          ...prev,
                          target: nextTarget,
                          replacementFields: prev.replacementFields.filter((field: string) =>
                            field.startsWith(`${nextTarget}_`)
                          ),
                        };
                      })
                    }
                    options={[
                      { value: 'name', label: 'Name' },
                      { value: 'description', label: 'Description' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <Label className='text-xs text-gray-400'>Locale Context</Label>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={formData.locale || 'any'}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        locale: value === 'any' ? '' : value,
                      }))
                    }
                    options={[
                      { value: 'any', label: 'Any locale' },
                      { value: 'en', label: 'English (en)' },
                      { value: 'pl', label: 'Polish (pl)' },
                      { value: 'de', label: 'German (de)' },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div>
                <Label className='text-xs text-gray-400'>Severity</Label>
                <div className='mt-2'>
                  <UnifiedSelect
                    value={formData.severity}
                    onValueChange={(value: string): void =>
                      setFormData((prev: PatternFormData) => ({
                        ...prev,
                        severity: value as 'error' | 'warning',
                      }))
                    }
                    options={[
                      { value: 'error', label: 'Error' },
                      { value: 'warning', label: 'Warning' },
                    ]}
                  />
                </div>
              </div>
              <div>
                <Label className='text-xs text-gray-400'>Replacer Value</Label>
                <Input
                  className='mt-2'
                  value={formData.replacementValue}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      replacementValue: event.target.value,
                    }))
                  }
                  placeholder='e.g. Przypinka'
                />
              </div>
            </div>

            <div>
              <Label className='text-xs text-gray-400'>Replacer Fields</Label>
              <p className='mt-1 text-[11px] text-gray-500'>
                Leave empty to apply replacement globally on all matching fields.
              </p>
              <div className='mt-2'>
                <MultiSelect
                  options={replacementFieldOptions}
                  selected={formData.replacementFields}
                  onChange={(values: string[]) =>
                    setFormData((prev: PatternFormData) => ({
                      ...prev,
                      replacementFields: normalizeReplacementFields(values),
                    }))
                  }
                  placeholder='All matching fields (global)'
                  searchPlaceholder='Search fields...'
                  emptyMessage='No fields found.'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-[1fr_140px]'>
              <div>
                <Label className='text-xs text-gray-400'>Regex</Label>
                <Input
                  className='mt-2 font-mono'
                  value={formData.regex}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({ ...prev, regex: event.target.value }))
                  }
                  placeholder='\\s{2,}|\\*{2,}'
                />
              </div>
              <div>
                <Label className='text-xs text-gray-400'>Flags</Label>
                <Input
                  className='mt-2 font-mono'
                  value={formData.flags}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: PatternFormData) => ({ ...prev, flags: event.target.value }))
                  }
                  placeholder='gim'
                />
              </div>
            </div>

            <div>
              <Label className='text-xs text-gray-400'>Message</Label>
              <Textarea
                className='mt-2 min-h-[90px]'
                value={formData.message}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                  setFormData((prev: PatternFormData) => ({ ...prev, message: event.target.value }))
                }
                placeholder='Remove duplicate spaces from product name.'
              />
            </div>

            <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
              <span className='text-xs text-gray-300'>Pattern enabled</span>
              <ToggleButton
                enabled={formData.enabled}
                onClick={() =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    enabled: !prev.enabled,
                  }))
                }
              />
            </div>

            <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
              <span className='text-xs text-gray-300'>Replacer enabled</span>
              <ToggleButton
                enabled={formData.replacementEnabled}
                onClick={() =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    replacementEnabled: !prev.replacementEnabled,
                  }))
                }
              />
            </div>

            <div className='flex items-center justify-end gap-3 pt-2'>
              <Button
                type='button'
                className='rounded-md border border-border px-3 py-2 text-sm text-gray-300 hover:bg-muted/50'
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button
                type='button'
                className='rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200'
                onClick={() => {
                  void handleSave();
                }}
                disabled={createPattern.isPending || updatePattern.isPending}
              >
                {createPattern.isPending || updatePattern.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </SharedModal>
      )}
    </div>
  );
}
