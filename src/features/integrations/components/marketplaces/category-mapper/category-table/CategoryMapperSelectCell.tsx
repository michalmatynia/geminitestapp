import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Input } from '@/shared/ui';

export type CategoryMapperSelectCellProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  options: Array<{ value: string; label: string }>;
  disabled: boolean;
  datalistId: string;
};

export function CategoryMapperSelectCell({
  value,
  onChange,
  options,
  disabled,
  datalistId,
}: CategoryMapperSelectCellProps): React.JSX.Element {
  const optionByValue = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    options.forEach((option) => {
      map.set(option.value, option);
    });
    return map;
  }, [options]);

  const optionByLabel = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    options.forEach((option) => {
      const normalizedLabel = option.label.trim().toLowerCase();
      if (!normalizedLabel || map.has(normalizedLabel)) return;
      map.set(normalizedLabel, option);
    });
    return map;
  }, [options]);

  const [inputValue, setInputValue] = useState<string>('');

  useEffect(() => {
    if (!value) {
      setInputValue('');
      return;
    }
    setInputValue(optionByValue.get(value)?.label ?? '');
  }, [optionByValue, value]);

  const resolveOptionFromInput = useCallback(
    (rawValue: string): { value: string; label: string } | null => {
      const trimmed = rawValue.trim();
      if (!trimmed) return null;
      if (optionByValue.has(trimmed)) {
        return optionByValue.get(trimmed) ?? null;
      }
      return optionByLabel.get(trimmed.toLowerCase()) ?? null;
    },
    [optionByLabel, optionByValue]
  );

  const commitInput = useCallback(
    (nextValue: string): void => {
      const matchedOption = resolveOptionFromInput(nextValue);
      if (matchedOption) {
        setInputValue(matchedOption.label);
        onChange(matchedOption.value);
        return;
      }
      if (!nextValue.trim()) {
        setInputValue('');
        onChange(null);
        return;
      }
      const currentLabel = value ? optionByValue.get(value)?.label ?? '' : '';
      setInputValue(currentLabel);
    },
    [onChange, optionByValue, resolveOptionFromInput, value]
  );

  return (
    <Input
      type='text'
      list={datalistId}
      value={inputValue}
      onChange={(event): void => {
        const nextValue = event.target.value;
        setInputValue(nextValue);
        if (!nextValue.trim()) {
          onChange(null);
          return;
        }
        const matchedOption = resolveOptionFromInput(nextValue);
        if (matchedOption) {
          onChange(matchedOption.value);
        }
      }}
      onBlur={(event): void => {
        commitInput(event.target.value);
      }}
      onKeyDown={(event): void => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        commitInput((event.currentTarget as HTMLInputElement).value);
        (event.currentTarget as HTMLInputElement).blur();
      }}
      disabled={disabled}
      placeholder='Type to search internal category...'
      variant='subtle'
      size='sm'
      className='w-full max-w-md'
    />
  );
}
