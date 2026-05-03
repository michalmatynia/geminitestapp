import { Link, type Href } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';

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

export function OutlineLink({
  href,
  hint,
  label,
  fullWidth = true,
}: {
  href: Href;
  hint?: string;
  label: string;
  fullWidth?: boolean;
}): React.JSX.Element {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityHint={hint}
        accessibilityLabel={label}
        accessibilityRole='button'
        style={{
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          width: fullWidth ? '100%' : undefined,
          backgroundColor: '#ffffff',
          borderColor: '#cbd5e1',
          borderRadius: 999,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text
          style={{
            color: '#0f172a',
            fontWeight: '700',
            textAlign: fullWidth ? 'center' : 'left',
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
}: {
  disabled?: boolean;
  hint?: string;
  label: string;
  onPress: () => void | Promise<void>;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole='button'
      disabled={disabled}
      onPress={() => {
        if (disabled === false) {
          void onPress();
        }
      }}
      style={{
        alignSelf: 'flex-start',
        backgroundColor: '#2563eb',
        borderRadius: 999,
        opacity: disabled ? 0.55 : 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text style={{ color: '#ffffff', fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export function LabeledTextField(props: {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  hint?: string;
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  textContentType?: 'username' | 'password';
  value: string;
}): React.JSX.Element {
  const {
    autoCapitalize = 'sentences',
    hint,
    label,
    onChangeText,
    placeholder,
    secureTextEntry,
    textContentType,
    value,
  } = props;

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700' }}>
        {label}
      </Text>
      <TextInput
        accessibilityHint={hint}
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#cbd5e1',
          borderRadius: 16,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
        textContentType={textContentType}
        value={value}
      />
    </View>
  );
}

export function SummaryChip({
  accent,
  label,
}: {
  accent: 'amber' | 'blue' | 'emerald' | 'rose';
  label: string;
}): React.JSX.Element {
  let backgroundColor = '#eef2ff';
  let borderColor = '#c7d2fe';
  let textColor = '#4338ca';

  if (accent === 'emerald') {
    backgroundColor = '#ecfdf5';
    borderColor = '#a7f3d0';
    textColor = '#047857';
  } else if (accent === 'amber') {
    backgroundColor = '#fff7ed';
    borderColor = '#fdba74';
    textColor = '#c2410c';
  } else if (accent === 'rose') {
    backgroundColor = '#fef2f2';
    borderColor = '#fecaca';
    textColor = '#b91c1c';
  }

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor,
        borderColor,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: textColor, fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

export function BadgeChip({
  item,
}: {
  item: { emoji: string; name: string };
}): React.JSX.Element {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: '#eef2ff',
        borderColor: '#c7d2fe',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
        {item.emoji} {item.name}
      </Text>
    </View>
  );
}
