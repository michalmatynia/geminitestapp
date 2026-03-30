import type { ReactNode } from 'react';

import { type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import {
  KangurMobileActionButton as MobileActionButton,
  KangurMobileCard as MobileCard,
  KangurMobileLinkButton as MobileLinkButton,
  KangurMobilePill as MobilePill,
} from './KangurMobileUi';

export type Tone = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

export const BASE_TONE: Tone = {
  backgroundColor: '#f8fafc',
  borderColor: '#cbd5e1',
  textColor: '#475569',
};

export const SUCCESS_TONE: Tone = {
  backgroundColor: '#ecfdf5',
  borderColor: '#a7f3d0',
  textColor: '#047857',
};

export const WARNING_TONE: Tone = {
  backgroundColor: '#fffbeb',
  borderColor: '#fde68a',
  textColor: '#b45309',
};

export const INDIGO_TONE: Tone = {
  backgroundColor: '#eef2ff',
  borderColor: '#c7d2fe',
  textColor: '#4338ca',
};

export function ChoiceCardButton({
  description,
  disabled = false,
  helperText,
  indexLabel,
  label,
  onPress,
  tone = BASE_TONE,
}: {
  description?: string;
  disabled?: boolean;
  helperText?: ReactNode;
  indexLabel: string;
  label: string;
  onPress: () => void;
  tone?: Tone;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole='button'
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: tone.backgroundColor,
        borderColor: tone.borderColor,
        borderRadius: 20,
        borderWidth: 1,
        gap: 8,
        opacity: disabled ? 0.8 : 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderColor: tone.borderColor,
            borderRadius: 999,
            borderWidth: 1,
            height: 28,
            justifyContent: 'center',
            width: 28,
          }}
        >
          <Text style={{ color: '#0f172a', fontWeight: '800' }}>{indexLabel}</Text>
        </View>
        <Text
          style={{
            color: '#0f172a',
            flex: 1,
            fontSize: 15,
            fontWeight: '700',
          }}
        >
          {label}
        </Text>
      </View>
      {description ? (
        <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>{description}</Text>
      ) : null}
      {helperText}
    </Pressable>
  );
}

export function SectionCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}): React.JSX.Element {
  return (
    <MobileCard gap={12} padding={20}>
      <Text
        accessibilityRole='header'
        style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}
      >
        {title}
      </Text>
      {children}
    </MobileCard>
  );
}

export function StatusPill({
  label,
  tone = BASE_TONE,
}: {
  label: string;
  tone?: Tone;
}): React.JSX.Element {
  return (
    <MobilePill
      label={label}
      style={{ paddingHorizontal: 10, paddingVertical: 6 }}
      textStyle={{ fontSize: 12 }}
      tone={tone}
    />
  );
}

export function OutlineLink({
  href,
  hint,
  label,
}: {
  href: Href;
  hint?: string;
  label: string;
}): React.JSX.Element {
  return (
    <MobileLinkButton
      accessibilityHint={hint}
      accessibilityLabel={label}
      href={href}
      label={label}
      stretch
      tone='secondary'
    />
  );
}

export function PrimaryButton({
  disabled = false,
  hint,
  label,
  onPress,
  tone = INDIGO_TONE,
}: {
  disabled?: boolean;
  hint?: string;
  label: string;
  onPress?: () => void;
  tone?: Tone;
}): React.JSX.Element {
  return (
    <MobileActionButton
      accessibilityHint={hint}
      accessibilityLabel={label}
      centered
      disabled={disabled}
      label={label}
      minHeight={44}
      onPress={onPress ?? (() => {})}
      stretch
      style={{
        backgroundColor: disabled ? '#e2e8f0' : tone.backgroundColor,
        borderColor: disabled ? '#cbd5e1' : tone.borderColor,
        opacity: disabled ? 0.7 : 1,
        paddingHorizontal: 16,
      }}
      textStyle={{
        color: disabled ? '#64748b' : tone.textColor,
      }}
      tone='secondary'
    />
  );
}
