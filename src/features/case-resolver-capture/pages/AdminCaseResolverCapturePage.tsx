'use client';

import { ArrowLeft, RefreshCcw, Settings2 } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { Button, FormSection, Label, SectionHeader, SelectSimple, useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  CASE_RESOLVER_CAPTURE_ACTION_OPTIONS,
  CASE_RESOLVER_CAPTURE_SETTINGS_KEY,
  CASE_RESOLVER_CAPTURE_TARGET_ROLE_OPTIONS,
  DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS,
  parseCaseResolverCaptureSettings,
  type CaseResolverCaptureRole,
  type CaseResolverCaptureRoleMapping,
  type CaseResolverCaptureSettings,
} from '../settings';

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Enabled' },
  { value: 'false', label: 'Disabled' },
];

const toBooleanOptionValue = (value: boolean): string => (value ? 'true' : 'false');
const fromBooleanOptionValue = (value: string): boolean => value === 'true';

const roleTitle = (role: CaseResolverCaptureRole): string =>
  role === 'addresser' ? 'Addresser Capture' : 'Addressee Capture';

const roleDescription = (role: CaseResolverCaptureRole): string =>
  role === 'addresser'
    ? 'Configure how captured addresser payloads are mapped back into Case Resolver.'
    : 'Configure how captured addressee payloads are mapped back into Case Resolver.';

export function AdminCaseResolverCapturePage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'heavy' });
  const updateSetting = useUpdateSetting();

  const [draft, setDraft] = useState<CaseResolverCaptureSettings | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);

  const rawSettings = settingsQuery.data?.get(CASE_RESOLVER_CAPTURE_SETTINGS_KEY) ?? null;
  const parsedSettings = useMemo(
    () => parseCaseResolverCaptureSettings(rawSettings),
    [rawSettings]
  );
  const hydrationSignature = rawSettings ?? '__missing__';

  useEffect(() => {
    if (loadedFrom === hydrationSignature && draft) return;
    setDraft(parsedSettings);
    setLoadedFrom(hydrationSignature);
  }, [draft, hydrationSignature, loadedFrom, parsedSettings]);

  const saveDisabled = !draft || settingsQuery.isLoading || updateSetting.isPending;

  const updateRoleMapping = <K extends keyof CaseResolverCaptureRoleMapping>(
    role: CaseResolverCaptureRole,
    key: K,
    value: CaseResolverCaptureRoleMapping[K]
  ): void => {
    setDraft((current: CaseResolverCaptureSettings | null) => {
      if (!current) return current;
      return {
        ...current,
        roleMappings: {
          ...current.roleMappings,
          [role]: {
            ...current.roleMappings[role],
            [key]: value,
          },
        },
      };
    });
  };

  const handleSave = async (): Promise<void> => {
    if (!draft) return;

    try {
      await updateSetting.mutateAsync({
        key: CASE_RESOLVER_CAPTURE_SETTINGS_KEY,
        value: serializeSetting(draft),
      });
      setLoadedFrom(hydrationSignature);
      toast('Case Resolver Capture settings saved.', { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to save Case Resolver Capture settings.',
        { variant: 'error' }
      );
    }
  };

  const handleReset = (): void => {
    setDraft({
      ...DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS,
      roleMappings: {
        addresser: { ...DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.addresser },
        addressee: { ...DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.addressee },
      },
    });
  };
  const headerBreadcrumb = (
    <nav
      aria-label='Breadcrumb'
      className='mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-400'
    >
      <Link href='/admin' className='transition-colors hover:text-gray-200'>
        Admin
      </Link>
      <span>/</span>
      <Link href='/admin/case-resolver' className='transition-colors hover:text-gray-200'>
        Case Resolver
      </Link>
      <span>/</span>
      <span className='text-gray-300'>Capture</span>
    </nav>
  );

  if (!draft) {
    return (
      <div className='container mx-auto py-6'>
        <SectionHeader
          eyebrow='AI · Case Resolver Capture'
          title='Case Resolver Capture'
          subtitle={headerBreadcrumb}
        />
      </div>
    );
  }

  return (
    <div className='container mx-auto space-y-4 py-6'>
      <SectionHeader
        eyebrow='AI · Case Resolver Capture'
        title='Case Resolver Capture'
        subtitle={headerBreadcrumb}
        actions={(
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='xs'
              onClick={(): void => {
                void settingsQuery.refetch();
              }}
              disabled={settingsQuery.isLoading}
            >
              <RefreshCcw className='mr-2 size-4' />
              Refresh
            </Button>
            <Button type='button' variant='outline' size='xs' asChild>
              <Link href='/admin/case-resolver'>
                <ArrowLeft className='mr-2 size-4' />
                Back to Case Resolver
              </Link>
            </Button>
          </div>
        )}
      />

      <FormSection
        title='Runtime'
        description='Control whether Case Resolver Capture runs when Prompt Exploder content is injected back into Case Resolver.'
        variant='subtle'
        className='p-4'
      >
        <div className='grid gap-3 md:grid-cols-2'>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Capture Pipeline</Label>
            <SelectSimple
              value={toBooleanOptionValue(draft.enabled)}
              onValueChange={(value: string): void => {
                setDraft((current: CaseResolverCaptureSettings | null) =>
                  current
                    ? {
                      ...current,
                      enabled: fromBooleanOptionValue(value),
                    }
                    : current
                );
              }}
              options={BOOLEAN_OPTIONS}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Auto-open Proposal Modal</Label>
            <SelectSimple
              value={toBooleanOptionValue(draft.autoOpenProposalModal)}
              onValueChange={(value: string): void => {
                setDraft((current: CaseResolverCaptureSettings | null) =>
                  current
                    ? {
                      ...current,
                      autoOpenProposalModal: fromBooleanOptionValue(value),
                    }
                    : current
                );
              }}
              options={BOOLEAN_OPTIONS}
            />
          </div>
        </div>
      </FormSection>

      {(['addresser', 'addressee'] as const).map((role: CaseResolverCaptureRole) => {
        const mapping = draft.roleMappings[role];
        return (
          <FormSection
            key={role}
            title={roleTitle(role)}
            description={roleDescription(role)}
            variant='subtle'
            className='p-4'
            actions={(
              <div className='flex items-center gap-2 text-xs text-gray-400'>
                <Settings2 className='size-3.5' />
                <span>Source role: {role}</span>
              </div>
            )}
          >
            <div className='grid gap-3 md:grid-cols-2'>
              <div className='space-y-1'>
                <Label className='text-[11px] text-gray-400'>Role Mapping Enabled</Label>
                <SelectSimple
                  value={toBooleanOptionValue(mapping.enabled)}
                  onValueChange={(value: string): void => {
                    updateRoleMapping(role, 'enabled', fromBooleanOptionValue(value));
                  }}
                  options={BOOLEAN_OPTIONS}
                />
              </div>
              <div className='space-y-1'>
                <Label className='text-[11px] text-gray-400'>Target Case Role</Label>
                <SelectSimple
                  value={mapping.targetRole}
                  onValueChange={(value: string): void => {
                    updateRoleMapping(
                      role,
                      'targetRole',
                      value === 'addressee' ? 'addressee' : 'addresser'
                    );
                  }}
                  options={CASE_RESOLVER_CAPTURE_TARGET_ROLE_OPTIONS}
                />
              </div>
              <div className='space-y-1'>
                <Label className='text-[11px] text-gray-400'>Default Action</Label>
                <SelectSimple
                  value={mapping.defaultAction}
                  onValueChange={(value: string): void => {
                    updateRoleMapping(
                      role,
                      'defaultAction',
                      value === 'text' || value === 'ignore' ? value : 'database'
                    );
                  }}
                  options={CASE_RESOLVER_CAPTURE_ACTION_OPTIONS}
                />
              </div>
              <div className='space-y-1'>
                <Label className='text-[11px] text-gray-400'>Auto-match Filemaker Party</Label>
                <SelectSimple
                  value={toBooleanOptionValue(mapping.autoMatchPartyReference)}
                  onValueChange={(value: string): void => {
                    updateRoleMapping(role, 'autoMatchPartyReference', fromBooleanOptionValue(value));
                  }}
                  options={BOOLEAN_OPTIONS}
                />
              </div>
              <div className='space-y-1 md:col-span-2'>
                <Label className='text-[11px] text-gray-400'>Auto-match Filemaker Address</Label>
                <SelectSimple
                  value={toBooleanOptionValue(mapping.autoMatchAddress)}
                  onValueChange={(value: string): void => {
                    updateRoleMapping(role, 'autoMatchAddress', fromBooleanOptionValue(value));
                  }}
                  options={BOOLEAN_OPTIONS}
                />
              </div>
            </div>
          </FormSection>
        );
      })}

      <div className='flex items-center justify-between gap-3'>
        <Button
          type='button'
          variant='outline'
          onClick={handleReset}
          disabled={updateSetting.isPending}
          className='border-yellow-600 text-yellow-600 hover:bg-yellow-600/10'
        >
          Reset to Defaults
        </Button>
        <Button
          type='button'
          onClick={(): void => {
            void handleSave();
          }}
          disabled={saveDisabled}
          className='min-w-[130px]'
        >
          Save Capture Settings
        </Button>
      </div>
    </div>
  );
}
