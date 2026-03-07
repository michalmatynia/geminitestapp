'use client';

import React from 'react';

import {
  resolveCmsRuntimeValue,
  resolveCmsRuntimeAction,
  useOptionalCmsRuntime,
} from '../CmsRuntimeContext';
import { useRequiredBlockSettings } from './BlockContext';

const parseBoolean = (value: unknown): boolean => value === true || value === 'true';

const isRuntimeTruthyValue = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 && normalized !== 'false' && normalized !== '0';
  }

  return Boolean(value);
};

const parseRuntimeActionArgs = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [trimmed];
  }
};

export function ButtonBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const runtime = useOptionalCmsRuntime();
  const label = (settings['buttonLabel'] as string) || 'Button';
  const link = (settings['buttonLink'] as string) || '#';
  const style = (settings['buttonStyle'] as string) || 'solid';
  const runtimeActionArgs = React.useMemo(
    () => parseRuntimeActionArgs(settings['runtimeActionArgs']),
    [settings]
  );
  const runtimeAction = React.useMemo(
    () =>
      resolveCmsRuntimeAction(runtime, settings['runtimeActionSource'], settings['runtimeActionPath']),
    [runtime, settings]
  );
  const runtimeDisabledValue = React.useMemo(
    () =>
      resolveCmsRuntimeValue(
        runtime,
        settings['buttonDisabledSource'],
        settings['buttonDisabledPath']
      ),
    [runtime, settings]
  );
  const isDisabled = React.useMemo(() => {
    const hasRuntimeBinding =
      typeof settings['buttonDisabledSource'] === 'string' &&
      settings['buttonDisabledSource'].trim().length > 0 &&
      typeof settings['buttonDisabledPath'] === 'string' &&
      settings['buttonDisabledPath'].trim().length > 0;

    if (!hasRuntimeBinding) {
      return parseBoolean(settings['buttonDisabled']);
    }

    const disabledWhen = settings['buttonDisabledWhen'] === 'falsy' ? 'falsy' : 'truthy';
    const resolvedTruthy = isRuntimeTruthyValue(runtimeDisabledValue);
    return disabledWhen === 'truthy' ? resolvedTruthy : !resolvedTruthy;
  }, [runtimeDisabledValue, settings]);

  const baseClasses =
    'cms-hover-button inline-block rounded-md px-6 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55';

  const customStyles: React.CSSProperties = {};
  const fontFamily = settings['fontFamily'] as string | undefined;
  const fontSize = settings['fontSize'] as number | undefined;
  const fontWeight = settings['fontWeight'] as string | undefined;
  const textColor = settings['textColor'] as string | undefined;
  const bgColor = settings['bgColor'] as string | undefined;
  const borderColor = settings['borderColor'] as string | undefined;
  const borderRadius = settings['borderRadius'] as number | undefined;
  const borderWidth = settings['borderWidth'] as number | undefined;

  if (fontFamily) customStyles.fontFamily = fontFamily;
  if (fontSize && fontSize > 0) customStyles.fontSize = `${fontSize}px`;
  if (fontWeight) customStyles.fontWeight = fontWeight;
  if (textColor) customStyles.color = textColor;
  if (bgColor) customStyles.backgroundColor = bgColor;
  if (borderColor) customStyles.borderColor = borderColor;
  if (borderRadius && borderRadius > 0) customStyles.borderRadius = `${borderRadius}px`;
  if (borderWidth && borderWidth > 0) customStyles.borderWidth = `${borderWidth}px`;

  if (style === 'outline') {
    if (runtimeAction || isDisabled) {
      return (
        <button
          type='button'
          onClick={() => runtimeAction?.(...runtimeActionArgs)}
          disabled={isDisabled}
          className={`${baseClasses} border-2 border-white text-white hover:bg-white hover:text-gray-900 focus:ring-white`}
          style={customStyles}
        >
          {label}
        </button>
      );
    }

    return (
      <a
        href={link}
        className={`${baseClasses} border-2 border-white text-white hover:bg-white hover:text-gray-900 focus:ring-white`}
        style={customStyles}
      >
        {label}
      </a>
    );
  }

  if (runtimeAction || isDisabled) {
    return (
      <button
        type='button'
        onClick={() => runtimeAction?.(...runtimeActionArgs)}
        disabled={isDisabled}
        className={`${baseClasses} bg-white text-gray-900 hover:bg-gray-200 focus:ring-white`}
        style={customStyles}
      >
        {label}
      </button>
    );
  }

  return (
    <a
      href={link}
      className={`${baseClasses} bg-white text-gray-900 hover:bg-gray-200 focus:ring-white`}
      style={customStyles}
    >
      {label}
    </a>
  );
}
