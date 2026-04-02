'use client';

import React from 'react';

import { Input } from '@/shared/ui';

import {
  resolveCmsRuntimeAction,
  useOptionalCmsRuntime,
} from '../CmsRuntimeContext';
import { useRequiredBlockSettings } from './BlockContext';

const resolveInputValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

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

const resolveInputBlockSettings = (
  settings: Record<string, unknown>
): InputBlockResolvedSettings => ({
  controlledValue: resolveInputValue(settings['inputValue']),
  placeholder:
    typeof settings['inputPlaceholder'] === 'string' ? settings['inputPlaceholder'] : '',
  inputAriaLabel:
    typeof settings['inputAriaLabel'] === 'string' ? settings['inputAriaLabel'].trim() : '',
  inputType: typeof settings['inputType'] === 'string' ? settings['inputType'] : 'text',
  autoComplete:
    typeof settings['inputAutoComplete'] === 'string'
      ? settings['inputAutoComplete'].trim()
      : '',
  maxLength: resolveInputMaxLength(settings['inputMaxLength']),
  disabled: resolveBoolean(settings['inputDisabled']),
});

const buildInputBlockCustomStyles = (
  settings: Record<string, unknown>
): React.CSSProperties => {
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

  if (fontFamily) customStyles.fontFamily = fontFamily;
  if (fontSize && fontSize > 0) customStyles.fontSize = `${fontSize}px`;
  if (fontWeight) customStyles.fontWeight = fontWeight;
  if (textColor) customStyles.color = textColor;
  if (bgColor) customStyles.backgroundColor = bgColor;
  if (borderColor) customStyles.borderColor = borderColor;
  if (borderRadius && borderRadius > 0) customStyles.borderRadius = `${borderRadius}px`;
  if (borderWidth && borderWidth > 0) {
    customStyles.borderWidth = `${borderWidth}px`;
    customStyles.borderStyle = 'solid';
  }
  if (height && height > 0) customStyles.height = `${height}px`;

  return customStyles;
};

export function InputBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const runtime = useOptionalCmsRuntime();
  const { autoComplete, controlledValue, disabled, inputAriaLabel, inputType, maxLength, placeholder } =
    React.useMemo(() => resolveInputBlockSettings(settings), [settings]);
  const changeAction = React.useMemo(
    () =>
      resolveCmsRuntimeAction(
        runtime,
        settings['inputChangeActionSource'],
        settings['inputChangeActionPath']
      ),
    [runtime, settings]
  );
  const submitAction = React.useMemo(
    () =>
      resolveCmsRuntimeAction(
        runtime,
        settings['inputSubmitActionSource'],
        settings['inputSubmitActionPath']
      ),
    [runtime, settings]
  );
  const [value, setValue] = React.useState(controlledValue);

  React.useEffect(() => {
    setValue(controlledValue);
  }, [controlledValue]);

  const customStyles = React.useMemo(() => buildInputBlockCustomStyles(settings), [settings]);

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const nextValue = event.target.value;
      setValue(nextValue);
      changeAction?.(nextValue);
    },
    [changeAction]
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (event.key !== 'Enter' || !submitAction) {
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
