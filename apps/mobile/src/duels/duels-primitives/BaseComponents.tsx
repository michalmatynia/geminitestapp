import type { Href } from 'expo-router';
import { Text } from 'react-native';

import {
  KangurMobileActionButton,
  KangurMobileFilterChip,
  KangurMobileInsetPanel,
  KangurMobileLinkButton,
} from '../../shared/KangurMobileUi';

export function ActionButton({
  disabled = false,
  label,
  onPress,
  stretch = false,
  tone = 'primary',
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void | Promise<void>;
  stretch?: boolean;
  tone?: 'primary' | 'secondary' | 'ghost';
}): React.JSX.Element {
  return (
    <KangurMobileActionButton
      centered
      disabled={disabled}
      label={label}
      onPress={onPress}
      stretch={stretch}
      tone={tone}
      verticalPadding={12}
    />
  );
}

export function LinkButton({
  href,
  label,
  stretch = false,
  tone = 'secondary',
}: {
  href: Href;
  label: string;
  stretch?: boolean;
  tone?: 'primary' | 'secondary';
}): React.JSX.Element {
  return (
    <KangurMobileLinkButton
      centered
      href={href}
      label={label}
      stretch={stretch}
      tone={tone}
      verticalPadding={12}
    />
  );
}

export const renderOptionalLinkButton = ({
  href,
  label,
  stretch,
  tone,
}: {
  href?: Href | null;
  label: string;
  stretch?: boolean;
  tone?: 'primary' | 'secondary';
}): React.JSX.Element | null => {
  if (href === null || href === undefined) {
    return null;
  }

  return <LinkButton href={href} label={label} stretch={stretch} tone={tone} />;
};

export function AutoRefreshChip({
  enabled,
  label,
  onToggle,
  fullWidth = false,
}: {
  enabled: boolean;
  label: string;
  onToggle: () => void;
  fullWidth?: boolean;
}): React.JSX.Element {
  return (
    <KangurMobileFilterChip
      centered
      fullWidth={fullWidth}
      idleTextColor='#475569'
      label={label}
      onPress={onToggle}
      selected={enabled}
      selectedBackgroundColor='#dcfce7'
      selectedBorderColor='#22c55e'
      selectedTextColor='#15803d'
      textStyle={{ fontSize: 12 }}
      verticalPadding={8}
    />
  );
}

export function MessageCard({
  description,
  title,
  tone = 'neutral',
}: {
  description: string;
  title: string;
  tone?: 'error' | 'neutral';
}): React.JSX.Element {
  return (
    <KangurMobileInsetPanel
      gap={8}
      style={
        tone === 'error'
          ? {
              borderColor: '#fecaca',
              backgroundColor: '#fef2f2',
            }
          : undefined
      }
    >
      <Text
        style={{
          color: tone === 'error' ? '#991b1b' : '#0f172a',
          fontSize: 16,
          fontWeight: '800',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: tone === 'error' ? '#7f1d1d' : '#475569',
          fontSize: 14,
          lineHeight: 20,
        }}
      >
        {description}
      </Text>
    </KangurMobileInsetPanel>
  );
}
