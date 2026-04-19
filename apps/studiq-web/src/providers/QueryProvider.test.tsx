/**
 * @vitest-environment jsdom
 */

import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { StudiqQueryProvider } from './QueryProvider';

const WindowWithLiteSettings = globalThis as typeof globalThis & { __LITE_SETTINGS__?: unknown[] };

function QueryClientProbe(): React.JSX.Element {
  const queryClient = useQueryClient();
  const cached = queryClient.getQueryData(QUERY_KEYS.settings.scope('lite')) as
    | Array<{ key: string; value: string }>
    | undefined;

  return (
    <div data-testid='query-provider-lite-settings'>
      {cached?.find((entry) => entry.key === 'kangur_storefront_default_mode')?.value ?? 'missing'}
    </div>
  );
}

describe('StudiqQueryProvider', () => {
  afterEach(() => {
    delete WindowWithLiteSettings.__LITE_SETTINGS__;
  });

  it('hydrates lite settings into the query cache before descendants mount', () => {
    WindowWithLiteSettings.__LITE_SETTINGS__ = [
      { key: 'kangur_storefront_default_mode', value: 'default' },
    ];

    render(
      <StudiqQueryProvider>
        <QueryClientProbe />
      </StudiqQueryProvider>
    );

    expect(screen.getByTestId('query-provider-lite-settings')).toHaveTextContent('default');
  });
});
