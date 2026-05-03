'use client';

import React from 'react';
import { useMemo } from 'react';

import { TRADERA_SETTINGS_KEYS, DEFAULT_TRADERA_SYSTEM_SETTINGS } from '@/features/integrations/constants/tradera';
import { useTraderaSelectorRegistry } from '@/features/integrations/hooks/useTraderaSelectorRegistry';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { cn } from '@/shared/utils/ui-utils';

const DEFAULT_PROFILE = 'default';

export interface TraderaSelectorProfileOverrideSelectProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel: string;
  title?: string;
  configuredLabel?: string;
  includeConfiguredOption?: boolean;
}

export function TraderaSelectorProfileOverrideSelect(
  props: TraderaSelectorProfileOverrideSelectProps
): React.JSX.Element {
  const {
    value,
    onChange,
    disabled = false,
    className,
    ariaLabel,
    title,
    configuredLabel = 'Configured profile',
    includeConfiguredOption = true,
  } = props;
  const registryQuery = useTraderaSelectorRegistry();
  const settingsQuery = useSettingsMap();
  const normalizedValue =
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
  const configuredProfile = useMemo(() => {
    const savedProfile = settingsQuery.data?.get(TRADERA_SETTINGS_KEYS.selectorProfile);
    return typeof savedProfile === 'string' && savedProfile.trim().length > 0
      ? savedProfile.trim()
      : DEFAULT_TRADERA_SYSTEM_SETTINGS.selectorProfile;
  }, [settingsQuery.data]);
  const resolvedConfiguredLabel = useMemo(
    () => (includeConfiguredOption ? `${configuredLabel} (${configuredProfile})` : configuredLabel),
    [configuredLabel, configuredProfile, includeConfiguredOption]
  );
  const profileOptions = useMemo(() => {
    const discoveredProfiles = (registryQuery.data?.entries ?? []).map((entry) => entry.profile);
    const mergedProfiles = new Set([DEFAULT_PROFILE, ...discoveredProfiles]);
    if (normalizedValue.length > 0) {
      mergedProfiles.add(normalizedValue);
    }
    return Array.from(mergedProfiles).sort((left, right) => left.localeCompare(right));
  }, [normalizedValue, registryQuery.data?.entries]);
  return (
    <select
      value={normalizedValue}
      onChange={(event) => {
        const nextValue = event.target.value.trim();
        onChange(nextValue.length > 0 ? nextValue : null);
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={cn(
        'h-8 min-w-[10rem] rounded-md border border-foreground/10 bg-transparent px-2 text-xs transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {includeConfiguredOption ? <option value=''>{resolvedConfiguredLabel}</option> : null}
      {profileOptions.map((profile) => (
        <option key={profile} value={profile}>
          {profile}
        </option>
      ))}
    </select>
  );
}
