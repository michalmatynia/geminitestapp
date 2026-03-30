'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import type { RichTextEditorProps } from './RichTextEditorTypes';

const RichTextEditorImpl = dynamic(() => import('./RichTextEditorImpl'), {
  ssr: false,
  loading: () => <div className='h-64 w-full animate-pulse rounded-md bg-muted/20' />,
});

export function RichTextEditor(props: RichTextEditorProps): React.JSX.Element {
  const {
    value,
    onChange,
    disabled,
    placeholder,
    variant,
    headingLevels,
    allowImage,
    allowTable,
    allowTaskList,
    allowFontFamily,
    allowTextAlign,
    enableAdvancedTools,
    fontFamilyOptions,
    loadingLabel,
    containerClassName,
    toolbarClassName,
    surfaceOptions,
  } = props;

  return (
    <RichTextEditorImpl
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      variant={variant}
      headingLevels={headingLevels}
      allowImage={allowImage}
      allowTable={allowTable}
      allowTaskList={allowTaskList}
      allowFontFamily={allowFontFamily}
      allowTextAlign={allowTextAlign}
      enableAdvancedTools={enableAdvancedTools}
      fontFamilyOptions={fontFamilyOptions}
      loadingLabel={loadingLabel}
      containerClassName={containerClassName}
      toolbarClassName={toolbarClassName}
      surfaceOptions={surfaceOptions}
    />
  );
}

export type { RichTextEditorProps };
