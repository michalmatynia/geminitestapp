'use client';

import React from 'react';

import { useRequiredBlockSettings } from './BlockContext';

export function ButtonBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const label = (settings['buttonLabel'] as string) || 'Button';
  const link = (settings['buttonLink'] as string) || '#';
  const style = (settings['buttonStyle'] as string) || 'solid';

  const baseClasses =
    'cms-hover-button inline-block rounded-md px-6 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

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
