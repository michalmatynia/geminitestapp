'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Input } from '@/shared/ui/primitives.public';
import {
  resolveCmsRuntimeAction,
  useOptionalCmsRuntime,
  type CmsRuntimeContextValue,
} from '../CmsRuntimeContext';
import { useRequiredBlockSettings } from './BlockContext';

const resolveInputValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};

const resolveBoolean = (value: unknown): boolean => value === true || value === 'true';

type InputBlockResolvedSettings = {
  autoComplete: string;
  controlledValue: string;
  disabled: boolean;
  inputAriaLabel: string;
  inputType: string;
  maxLength: number | undefined;
  placeholder: string;
};

const resolveInputMaxLength = (value: unknown): number | undefined =>
  typeof value === 'number' && value > 0 ? Math.round(value) : undefined;

const resolveInputBlockSettings = (settings: Record<string, unknown>): InputBlockResolvedSettings => ({
  controlledValue: resolveInputValue(settings['inputValue']),
  placeholder: typeof settings['inputPlaceholder'] === 'string' ? settings['inputPlaceholder'] : '',
  inputAriaLabel: typeof settings['inputAriaLabel'] === 'string' ? (settings['inputAriaLabel'] as string).trim() : '',
  inputType: typeof settings['inputType'] === 'string' ? settings['inputType'] : 'text',
  autoComplete: typeof settings['inputAutoComplete'] === 'string' ? (settings['inputAutoComplete'] as string).trim() : '',
  maxLength: resolveInputMaxLength(settings['inputMaxLength']),
  disabled: resolveBoolean(settings['inputDisabled']),
});

function buildInputBlockCustomStyles(settings: Record<string, unknown>): React.CSSProperties {
  const customStyles: React.CSSProperties = {};
  const fontFamily = settings['fontFamily'] as string | undefined;
  const fontSize = settings['fontSize'] as number | undefined;
  const fontWeight = settings['fontWeight'] as string | undefined;
  const textColor = settings['textColor'] as string | undefined;
  const bgColor = settings['bgColor'] as string | undefined;
  const borderColor = settings['borderColor'] as string | undefined;
  const borderRadius = settings['borderRadius'] as number | undefined;
  const borderWidth = settings['borderWidth'] as number | undefined;
  const height = settings['height'] as number | undefined;

  if (fontFamily !== undefined) customStyles.fontFamily = fontFamily;
  if (typeof fontSize === 'number' && fontSize > 0) customStyles.fontSize = `${fontSize}px`;
  if (fontWeight !== undefined) customStyles.fontWeight = fontWeight;
  if (textColor !== undefined) customStyles.color = textColor;
  if (bgColor !== undefined) customStyles.backgroundColor = bgColor;
  if (borderColor !== undefined) customStyles.borderColor = borderColor;
  if (typeof borderRadius === 'number' && borderRadius > 0) customStyles.borderRadius = `${borderRadius}px`;
  if (typeof borderWidth === 'number' && borderWidth > 0) {
    customStyles.borderWidth = `${borderWidth}px`;
    customStyles.borderStyle = 'solid';
  }
  if (typeof height === 'number' && height > 0) customStyles.height = `${height}px`;

  return customStyles;
}

export function InputBlock(): React.JSX.Element {
  const settings = useRequiredBlockSettings();
  const runtime = useOptionalCmsRuntime();
  const { autoComplete, controlledValue, disabled, inputAriaLabel, inputType, maxLength, placeholder } =
    useMemo(() => resolveInputBlockSettings(settings), [settings]);

  const changeAction = useMemo(
    () => resolveCmsRuntimeAction(runtime as CmsRuntimeContextValue | null, settings['inputChangeActionSource'] as string, settings['inputChangeActionPath'] as string),
    [runtime, settings]
  );
  const submitAction = useMemo(
    () => resolveCmsRuntimeAction(runtime as CmsRuntimeContextValue | null, settings['inputSubmitActionSource'] as string, settings['inputSubmitActionPath'] as string),
    [runtime, settings]
  );

  const [value, setValue] = useState(controlledValue);

  useEffect(() => {
    setValue(controlledValue);
  }, [controlledValue]);

  const customStyles = useMemo(() => buildInputBlockCustomStyles(settings), [settings]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const nextValue = event.target.value;
      setValue(nextValue);
      changeAction?.(nextValue);
    },
    [changeAction]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (event.key !== 'Enter' || submitAction === null) {
        return;
      }

      event.preventDefault();
      submitAction(value);
    },
    [submitAction, value]
  );

  return (
    <Input
      type={inputType}
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete || undefined}
      maxLength={maxLength}
      disabled={disabled}
      aria-label={inputAriaLabel || placeholder || 'Input field'}
      className='cms-appearance-input w-full'
      style={customStyles}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      title={placeholder}
    />
  );
}
