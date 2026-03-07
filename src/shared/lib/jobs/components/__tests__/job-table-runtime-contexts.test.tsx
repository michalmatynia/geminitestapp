import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  useJobTableActionsRuntime,
  useJobTablePanelRuntime,
} from '@/shared/lib/jobs/components/context/JobTableRuntimeContext';

function JobTablePanelRuntimeConsumer(): React.JSX.Element {
  useJobTablePanelRuntime();
  return <div>ok</div>;
}

function JobTableActionsRuntimeConsumer(): React.JSX.Element {
  useJobTableActionsRuntime();
  return <div>ok</div>;
}

describe('job table runtime contexts', () => {
  it('throws when JobTable panel runtime context is missing', () => {
    expect(() => render(<JobTablePanelRuntimeConsumer />)).toThrow(
      'useJobTablePanelRuntime must be used within JobTablePanelRuntimeProvider'
    );
  });

  it('throws when JobTable actions runtime context is missing', () => {
    expect(() => render(<JobTableActionsRuntimeConsumer />)).toThrow(
      'useJobTableActionsRuntime must be used within JobTableActionsRuntimeProvider'
    );
  });
});
