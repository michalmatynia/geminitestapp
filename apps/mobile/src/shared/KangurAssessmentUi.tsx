import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

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

export function SectionCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 24,
        elevation: 3,
        gap: 12,
        padding: 20,
        shadowColor: '#0f172a',
        shadowOffset: { height: 10, width: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      }}
    >
      <Text
        accessibilityRole='header'
        style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}
      >
        {title}
      </Text>
      {children}
    </View>
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
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: tone.backgroundColor,
        borderColor: tone.borderColor,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: tone.textColor, fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
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
    <Link href={href} asChild>
      <Pressable
        accessibilityHint={hint}
        accessibilityLabel={label}
        accessibilityRole='button'
        style={{
          alignSelf: 'stretch',
          backgroundColor: '#ffffff',
          borderColor: '#cbd5e1',
          borderRadius: 999,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 10,
          width: '100%',
        }}
      >
        <Text
          style={{
            color: '#0f172a',
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
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
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole='button'
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: disabled ? '#e2e8f0' : tone.backgroundColor,
        borderColor: disabled ? '#cbd5e1' : tone.borderColor,
        borderRadius: 999,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: 44,
        opacity: disabled ? 0.7 : 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <Text
        style={{
          color: disabled ? '#64748b' : tone.textColor,
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
