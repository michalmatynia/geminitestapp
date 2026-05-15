'use client';

import React, { useMemo } from 'react';

import {
  resolveCmsRuntimeValue,
  resolveCmsRuntimeAction,
  useOptionalCmsRuntime,
} from '../CmsRuntimeContext';
import { useRequiredBlockSettings } from './BlockContext';
import {
  isRuntimeTruthyValue,
  parseBoolean,
  parseRuntimeActionArgs,
} from './ButtonBlock.helpers';

const BASE_CLASSES = 'cms-hover-button inline-block rounded-md px-6 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55';

function getButtonStyles(settings: Record<string, unknown>): React.CSSProperties {
  const customStyles: React.CSSProperties = {};
  const fontFamily = settings['fontFamily'] as string | undefined;
  const fontSize = settings['fontSize'] as number | undefined;
  const fontWeight = settings['fontWeight'] as string | undefined;
  const textColor = settings['textColor'] as string | undefined;
  const bgColor = settings['bgColor'] as string | undefined;
  const borderColor = settings['borderColor'] as string | undefined;
  const borderRadius = settings['borderRadius'] as number | undefined;
  const borderWidth = settings['borderWidth'] as number | undefined;

  if (fontFamily !== undefined) customStyles.fontFamily = fontFamily;
  if (fontSize !== undefined && fontSize > 0) customStyles.fontSize = `${fontSize}px`;
  if (fontWeight !== undefined) customStyles.fontWeight = fontWeight;
  if (textColor !== undefined) customStyles.color = textColor;
  if (bgColor !== undefined) customStyles.backgroundColor = bgColor;
  if (borderColor !== undefined) customStyles.borderColor = borderColor;
  if (borderRadius !== undefined && borderRadius > 0) customStyles.borderRadius = `${borderRadius}px`;
  if (borderWidth !== undefined && borderWidth > 0) customStyles.borderWidth = `${borderWidth}px`;
  
  return customStyles;
}

export function ButtonBlock(): React.JSX.Element {
  const settings = useRequiredBlockSettings();
  const runtime = useOptionalCmsRuntime();
  
  const label = (settings['buttonLabel'] as string) || 'Button';
  const link = (settings['buttonLink'] as string) || '#';
  const style = (settings['buttonStyle'] as string) || 'solid';
  
  const runtimeActionArgs = useMemo(() => parseRuntimeActionArgs(settings['runtimeActionArgs']), [settings]);
  const runtimeAction = useMemo(() => resolveCmsRuntimeAction(runtime, settings['buttonDisabledSource'] as string, settings['buttonDisabledPath'] as string), [runtime, settings]);
  const runtimeDisabledValue = useMemo(() => resolveCmsRuntimeValue(runtime, settings['buttonDisabledSource'] as string, settings['buttonDisabledPath'] as string), [runtime, settings]);
  
  const isDisabled = useMemo(() => {
    const hasRuntimeBinding =
      typeof settings['buttonDisabledSource'] === 'string' &&
      (settings['buttonDisabledSource'] as string).trim().length > 0 &&
      typeof settings['buttonDisabledPath'] === 'string' &&
      (settings['buttonDisabledPath'] as string).trim().length > 0;

    if (!hasRuntimeBinding) {
      return parseBoolean(settings['buttonDisabled']);
    }

    const disabledWhen = settings['buttonDisabledWhen'] === 'falsy' ? 'falsy' : 'truthy';
    const resolvedTruthy = isRuntimeTruthyValue(runtimeDisabledValue);
    return disabledWhen === 'truthy' ? resolvedTruthy : !resolvedTruthy;
  }, [runtimeDisabledValue, settings]);

  const customStyles = getButtonStyles(settings);

  const className = `${BASE_CLASSES} ${style === 'outline' ? 'cms-appearance-button-outline border-2 hover:text-current' : 'cms-appearance-button-primary border'} focus-visible:ring-white`.trim();

  if (runtimeAction !== null || isDisabled) {
    return (
      <button
        type='button'
        onClick={() => runtimeAction?.(...runtimeActionArgs)}
        disabled={!!isDisabled}
        className={className}
        style={customStyles}
        aria-label={label}
        title={label}
      >
        {label}
      </button>
    );
  }

  return (
    <a
      href={link}
      className={className}
      style={customStyles}
      aria-label={label}
      title={label}
    >
      {label}
    </a>
  );
}
