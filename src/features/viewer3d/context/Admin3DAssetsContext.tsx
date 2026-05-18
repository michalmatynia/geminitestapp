/**
 * Admin 3D Assets Context
 * 
 * React context for managing 3D assets in admin interfaces.
 * Provides:
 * - Centralized asset state management for admin views
 * - Asset CRUD operations and state synchronization
 * - Type-safe context access with strict validation
 * - Integration with asset management hooks
 * - Error handling for missing provider scenarios
 */

'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import type { FileStorageProfile } from '@/shared/lib/files/constants';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useAdmin3DAssetsState } from '../hooks/useAdmin3DAssetsState';

/** Context value type derived from the admin assets state hook */
type Admin3DAssetsContextValue = ReturnType<typeof useAdmin3DAssetsState>;

/**
 * Strict context for admin 3D assets management
 * Ensures provider is present and provides type-safe access
 */
export const {
  Context: Admin3DAssetsContext,
  useStrictContext: useAdmin3DAssetsContext,
} = createStrictContext<Admin3DAssetsContextValue>({
  hookName: 'useAdmin3DAssetsContext',
  providerName: 'an Admin3DAssetsProvider',
  displayName: 'Admin3DAssetsContext',
  errorFactory: internalError,
});

export function Admin3DAssetsProvider({
  children,
  storageProfile,
}: {
  children: React.ReactNode;
  storageProfile?: FileStorageProfile;
}): React.JSX.Element {
  const value = useAdmin3DAssetsState({ storageProfile });
  return <Admin3DAssetsContext.Provider value={value}>{children}</Admin3DAssetsContext.Provider>;
}
