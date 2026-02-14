'use client';

import React from 'react';

import { BenchmarkProvider } from './BenchmarkContext';
import { BindingsProvider } from './BindingsContext';
import { DocumentProvider } from './DocumentContext';
import { LibraryProvider } from './LibraryContext';
import { SegmentEditorProvider } from './SegmentEditorContext';
import { SettingsProvider } from './SettingsContext';

export function PromptExploderProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <SettingsProvider>
      <DocumentProvider>
        <BenchmarkProvider>
          <LibraryProvider>
            <SegmentEditorProvider>
              <BindingsProvider>
                {children}
              </BindingsProvider>
            </SegmentEditorProvider>
          </LibraryProvider>
        </BenchmarkProvider>
      </DocumentProvider>
    </SettingsProvider>
  );
}
