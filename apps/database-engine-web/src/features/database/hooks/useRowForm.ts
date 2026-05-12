/**
 * Database Row Form Hook
 * 
 * Form state management for database row operations.
 * Provides:
 * - Dynamic form generation based on column definitions
 * - Input value parsing and validation
 * - Add/edit mode handling with appropriate defaults
 * - Form submission coordination
 * - Type-safe data transformation
 */

import { useState, useRef } from 'react';
import type { DatabaseColumnInfo } from '@/shared/contracts/database';
import { parseInputValue } from '../utils/database-utils';

const formatInitialFieldValue = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export function useRowForm(
  columns: DatabaseColumnInfo[],
  initialData: Record<string, unknown> | undefined,
  mode: 'add' | 'edit',
  onSubmit: (data: Record<string, unknown>) => void
): {
  formRef: React.RefObject<HTMLFormElement | null>;
  formData: Record<string, string>;
  handleSubmit: (e: React.FormEvent) => void;
  setFieldValue: (key: string, value: string) => void;
  getPlaceholder: (col: DatabaseColumnInfo) => string;
} {
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const col of columns) {
      initial[col.name] = formatInitialFieldValue(initialData?.[col.name]);
    }
    return initial;
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const parsed: Record<string, unknown> = {};
    for (const col of columns) {
      const val = formData[col.name] ?? '';
      const isAutoPK = mode === 'add' && col.isPrimaryKey && val.trim() === '';
      if (!isAutoPK) {
        parsed[col.name] = parseInputValue(val, col.type);
      }
    }
    onSubmit(parsed);
  };

  const setFieldValue = (key: string, value: string): void => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const getPlaceholder = (col: DatabaseColumnInfo): string => {
    if (typeof col.defaultValue === 'string') return col.defaultValue;
    return col.nullable ? 'NULL' : 'required';
  };

  return { formRef, formData, handleSubmit, setFieldValue, getPlaceholder };
}
