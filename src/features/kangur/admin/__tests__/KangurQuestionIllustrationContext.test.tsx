/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@/__tests__/test-utils';
import { describe, expect, it } from 'vitest';

import {
  useKangurIllustrationPanelContext,
  useKangurQuestionIllustrationContext,
} from '@/features/kangur/admin/context/KangurQuestionIllustrationContext';

function KangurQuestionIllustrationConsumer(): React.JSX.Element {
  useKangurQuestionIllustrationContext();
  return <div>ok</div>;
}

function KangurIllustrationPanelConsumer(): React.JSX.Element {
  useKangurIllustrationPanelContext();
  return <div>ok</div>;
}

describe('KangurQuestionIllustrationContext', () => {
  it('throws when illustration runtime context is missing', () => {
    expect(() => render(<KangurQuestionIllustrationConsumer />)).toThrow(
      'useKangurQuestionIllustrationContext must be used within a KangurQuestionIllustrationProvider'
    );
  });

  it('throws when illustration panel context is missing', () => {
    expect(() => render(<KangurIllustrationPanelConsumer />)).toThrow(
      'useKangurIllustrationPanelContext must be used within a KangurIllustrationPanelProvider'
    );
  });
});
