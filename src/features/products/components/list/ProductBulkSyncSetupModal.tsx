'use client';

import { useEffect, useMemo, useState } from 'react';

import { useProductSyncProfiles } from '@/features/product-sync/hooks/useProductSyncSettings';
import type { ProductSyncProfile } from '@/shared/contracts/product-sync';
import { AppModal } from '@/shared/ui/app-modal';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

interface ProductBulkSyncSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  isRunning: boolean;
  onStart: (profileId: string) => void;
}

export function ProductBulkSyncSetupModal(
  props: ProductBulkSyncSetupModalProps
): React.JSX.Element {
  const { isOpen, onClose, selectedCount, isRunning, onStart } = props;
  const profilesQuery = useProductSyncProfiles();
  const profiles = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data]);
  const [profileId, setProfileId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    if (profiles.length === 0) return;
    const defaultProfile =
      profiles.find((profile: ProductSyncProfile) => profile.isDefault) ?? profiles[0];
    if (defaultProfile) {
      setProfileId((prev) => prev || defaultProfile.id);
    }
  }, [isOpen, profiles]);

  const options = useMemo(
    () =>
      profiles.map((profile: ProductSyncProfile) => ({
        value: profile.id,
        label: profile.isDefault ? `${profile.name} (default)` : profile.name,
      })),
    [profiles]
  );

  const selectedProfile = profiles.find(
    (profile: ProductSyncProfile) => profile.id === profileId
  ) ?? null;

  const handleStart = (): void => {
    if (!profileId) return;
    onStart(profileId);
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title='Sync with Base.com'
      subtitle={`${selectedCount} product${selectedCount === 1 ? '' : 's'} selected.`}
      size='sm'
      footer={
        <>
          <Button type='button' variant='outline' onClick={onClose} disabled={isRunning}>
            Cancel
          </Button>
          <Button
            type='button'
            onClick={handleStart}
            disabled={isRunning || !profileId || profiles.length === 0}
            loading={isRunning}
            loadingText='Syncing...'
          >
            Start Sync
          </Button>
        </>
      }
    >
      <div className='space-y-4'>
        {profilesQuery.isLoading ? (
          <p className='text-sm text-muted-foreground'>Loading sync profiles...</p>
        ) : profiles.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            No sync profiles configured. Create one in Base.com Synchronization Engine first.
          </p>
        ) : (
          <>
            <div>
              <label className='mb-1 block text-xs font-medium text-gray-400'>Sync Profile</label>
              <SelectSimple
                size='sm'
                variant='subtle'
                value={profileId}
                onValueChange={setProfileId}
                options={options}
                triggerClassName='w-full'
                ariaLabel='Sync profile'
                title='Sync profile'
              />
            </div>
            {selectedProfile ? (
              <div className='rounded-md border border-border/60 bg-card/40 p-3 text-xs text-gray-400 space-y-1'>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline' className='text-[10px] uppercase'>
                    Connection
                  </Badge>
                  <span className='font-mono text-[11px]'>{selectedProfile.connectionId}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline' className='text-[10px] uppercase'>
                    Inventory
                  </Badge>
                  <span className='font-mono text-[11px]'>{selectedProfile.inventoryId}</span>
                </div>
                {selectedProfile.catalogId ? (
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='text-[10px] uppercase'>
                      Catalog
                    </Badge>
                    <span className='font-mono text-[11px]'>{selectedProfile.catalogId}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </AppModal>
  );
}
