'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import type { RichTextEditorProps } from './RichTextEditorTypes';

const RichTextEditorImpl = dynamic(() => import('./RichTextEditorImpl'), {
  ssr: false,
  loading: () => <div className='h-64 w-full animate-pulse rounded-md bg-muted/20' />,
});

export function RichTextEditor(props: RichTextEditorProps): React.JSX.Element {
  return <RichTextEditorImpl {...props} />;
}

export type { RichTextEditorProps };
