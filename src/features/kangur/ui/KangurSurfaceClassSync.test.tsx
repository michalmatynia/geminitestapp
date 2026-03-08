import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';

describe('KangurSurfaceClassSync', () => {
  beforeEach(() => {
    document.body.className = '';
    document.body.innerHTML = '';
    const appContent = document.createElement('main');
    appContent.id = 'app-content';
    document.body.appendChild(appContent);
  });

  it('applies the Kangur surface class to the page chrome while mounted', () => {
    const appContent = document.getElementById('app-content');
    expect(appContent).not.toBeNull();

    const { unmount } = render(
      <KangurSurfaceClassSync>
        <div>Surface</div>
      </KangurSurfaceClassSync>
    );

    expect(document.body).toHaveClass('kangur-surface-active');
    expect(appContent).toHaveClass('kangur-surface-active');

    unmount();

    expect(document.body).not.toHaveClass('kangur-surface-active');
    expect(appContent).not.toHaveClass('kangur-surface-active');
  });
});
