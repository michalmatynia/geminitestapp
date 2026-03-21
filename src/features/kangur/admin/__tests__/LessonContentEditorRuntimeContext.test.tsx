/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@/__tests__/test-utils';
import { describe, expect, it } from 'vitest';

import { useLessonContentEditorRuntimeContext } from '@/features/kangur/admin/context/LessonContentEditorRuntimeContext';

function LessonContentEditorRuntimeConsumer(): React.JSX.Element {
  useLessonContentEditorRuntimeContext();
  return <div>ok</div>;
}

describe('LessonContentEditorRuntimeContext', () => {
  it('throws when the runtime provider is missing', () => {
    expect(() => render(<LessonContentEditorRuntimeConsumer />)).toThrow(
      'useLessonContentEditorRuntimeContext must be used within a LessonContentEditorRuntimeProvider'
    );
  });
});
