import { describe, expect, it } from 'vitest';

import { createMobileDevelopmentKangurStorage } from '../storage/createMobileDevelopmentKangurStorage';
import { createDevelopmentKangurAuthAdapter } from './createDevelopmentKangurAuthAdapter';

describe('createDevelopmentKangurAuthAdapter', () => {
  it('restores the demo session from the provided storage adapter', async () => {
    const storage = createMobileDevelopmentKangurStorage();
    const firstAdapter = createDevelopmentKangurAuthAdapter(storage);

    await expect(firstAdapter.getSession()).resolves.toMatchObject({
      status: 'anonymous',
    });

    await firstAdapter.signIn();

    const secondAdapter = createDevelopmentKangurAuthAdapter(storage);

    await expect(secondAdapter.getSession()).resolves.toMatchObject({
      status: 'authenticated',
      user: expect.objectContaining({
        id: 'mobile-demo-parent',
      }),
    });

    await secondAdapter.signOut();

    const thirdAdapter = createDevelopmentKangurAuthAdapter(storage);

    await expect(thirdAdapter.getSession()).resolves.toMatchObject({
      status: 'anonymous',
    });
  });
});
