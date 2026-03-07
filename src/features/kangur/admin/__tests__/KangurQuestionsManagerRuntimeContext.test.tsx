/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useKangurQuestionsManagerRuntimeContext } from '@/features/kangur/admin/context/KangurQuestionsManagerRuntimeContext';

function KangurQuestionsManagerRuntimeConsumer(): React.JSX.Element {
  useKangurQuestionsManagerRuntimeContext();
  return <div>ok</div>;
}

describe('KangurQuestionsManagerRuntimeContext', () => {
  it('throws when the runtime provider is missing', () => {
    expect(() => render(<KangurQuestionsManagerRuntimeConsumer />)).toThrow(
      'useKangurQuestionsManagerRuntimeContext must be used within a KangurQuestionsManagerRuntimeProvider'
    );
  });
});
