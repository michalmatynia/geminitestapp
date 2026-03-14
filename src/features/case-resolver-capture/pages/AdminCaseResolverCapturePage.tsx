'use client';

import { ArrowLeft, RefreshCcw, Settings2 } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  AdminAiEyebrow,
  Button,
  FormSection,
  SectionHeader,
  SelectSimple,
  useToast,
  FormActions,
  FormField,
} from '@/shared/ui';
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
        error instanceof Error ? error.message : 'Failed to save Case Resolver Capture settings.',
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
        subject: { ...DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.subject },
        reference: { ...DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.reference },
        other: { ...DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.other },
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
          eyebrow={<AdminAiEyebrow section='Case Resolver Capture' />}
          title='Case Resolver Capture'
          subtitle={headerBreadcrumb}
        />
      </div>
    );
  }

  return (
    <div className='container mx-auto space-y-4 py-6'>
      <SectionHeader
        eyebrow={<AdminAiEyebrow section='Case Resolver Capture' />}
        title='Case Resolver Capture'
        subtitle={headerBreadcrumb}
        actions={
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
        }
      />

      <FormSection
        title='Runtime'
        description='Control whether Case Resolver Capture runs when Prompt Exploder content is injected back into Case Resolver.'
        variant='subtle'
        className='p-4'
      >
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='Capture Pipeline' id='capture-pipeline'>
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
             ariaLabel="Capture Pipeline" title="Capture Pipeline"/>
          </FormField>
          <FormField label='Auto-open Proposal Modal' id='auto-open-modal'>
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
             ariaLabel="Auto-open Proposal Modal" title="Auto-open Proposal Modal"/>
          </FormField>
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
            actions={
              <div className='flex items-center gap-2 text-xs text-gray-400'>
                <Settings2 className='size-3.5' />
                <span>Source role: {role}</span>
              </div>
            }
          >
            <div className='grid gap-3 md:grid-cols-2'>
              <FormField label='Role Mapping Enabled' id={`mapping-enabled-${role}`}>
                <SelectSimple
                  value={toBooleanOptionValue(mapping.enabled ?? false)}
                  onValueChange={(value: string): void => {
                    updateRoleMapping(role, 'enabled', fromBooleanOptionValue(value));
                  }}
                  options={BOOLEAN_OPTIONS}
                 ariaLabel="Role Mapping Enabled" title="Role Mapping Enabled"/>
              </FormField>
              <FormField label='Target Case Role' id={`target-role-${role}`}>
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
                 ariaLabel="Target Case Role" title="Target Case Role"/>
              </FormField>
              <FormField label='Default Action' id={`default-action-${role}`}>
                <SelectSimple
                  value={mapping.defaultAction}
                  onValueChange={(value: string): void => {
                    updateRoleMapping(
                      role,
                      'defaultAction',
                      value === 'createInFilemaker' || value === 'keepText' || value === 'ignore'
                        ? value
                        : 'useMatched'
                    );
                  }}
                  options={CASE_RESOLVER_CAPTURE_ACTION_OPTIONS}
                 ariaLabel="Default Action" title="Default Action"/>
              </FormField>
              <FormField label='Auto-match Filemaker Party' id={`auto-match-party-${role}`}>
                <SelectSimple
                  value={toBooleanOptionValue(mapping.autoMatchPartyReference ?? false)}
                  onValueChange={(value: string): void => {
                    updateRoleMapping(
                      role,
                      'autoMatchPartyReference',
                      fromBooleanOptionValue(value)
                    );
                  }}
                  options={BOOLEAN_OPTIONS}
                 ariaLabel="Auto-match Filemaker Party" title="Auto-match Filemaker Party"/>
              </FormField>
              <FormField
                label='Auto-match Filemaker Address'
                id={`auto-match-address-${role}`}
                className='md:col-span-2'
              >
                <SelectSimple
                  value={toBooleanOptionValue(mapping.autoMatchAddress ?? false)}
                  onValueChange={(value: string): void => {
                    updateRoleMapping(role, 'autoMatchAddress', fromBooleanOptionValue(value));
                  }}
                  options={BOOLEAN_OPTIONS}
                 ariaLabel="Auto-match Filemaker Address" title="Auto-match Filemaker Address"/>
              </FormField>
            </div>
          </FormSection>
        );
      })}

      <FormActions
        onCancel={handleReset}
        onSave={() => {
          void handleSave();
        }}
        cancelText='Reset to Defaults'
        saveText='Save Capture Settings'
        cancelVariant='outline'
        isSaving={updateSetting.isPending}
        isDisabled={saveDisabled}
      />
    </div>
  );
}
