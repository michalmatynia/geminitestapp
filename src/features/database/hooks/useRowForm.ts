import { useState, useRef } from 'react';
import type { DatabaseColumnInfo } from '@/shared/contracts/database';
import { parseInputValue } from '../utils/database-utils';

export function useRowForm(
  columns: DatabaseColumnInfo[],
  initialData: Record<string, unknown> | undefined,
  mode: 'add' | 'edit',
  onSubmit: (data: Record<string, unknown>) => void
) {
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const col of columns) {
      const val = initialData?.[col.name];
      initial[col.name] = (typeof val === 'string' || typeof val === 'number') 
        ? String(val) 
        : '';
    }
    return initial;
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const parsed: Record<string, unknown> = {};
    for (const col of columns) {
      const val = formData[col.name] ?? '';
      const isAutoPK = mode === 'add' && col.isPrimaryKey && typeof col.defaultValue !== 'undefined' && col.defaultValue !== null && val === '';
      if (!isAutoPK) {
        parsed[col.name] = parseInputValue(val, col.type);
      }
    }
    onSubmit(parsed);
  };

  const setFieldValue = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const getPlaceholder = (col: DatabaseColumnInfo): string => {
    if (typeof col.defaultValue === 'string') return col.defaultValue;
    return col.nullable ? 'NULL' : 'required';
  };

  return { formRef, formData, handleSubmit, setFieldValue, getPlaceholder };
}
