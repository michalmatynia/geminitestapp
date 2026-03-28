import type { ReactNode } from 'react';

import { Link, type Href } from 'expo-router';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

export type KangurMobileTone = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

type KangurMobileCardProps = {
  children: ReactNode;
  gap?: number;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

type KangurMobileInsetPanelProps = {
  children: ReactNode;
  gap?: number;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

type KangurMobilePillProps = {
  label: string;
  tone: KangurMobileTone;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

type KangurMobileMetricProps = {
  description: string;
  label: string;
  value: string;
  style?: StyleProp<ViewStyle>;
};

type KangurMobileFilterChipProps = {
  fullWidth?: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
};

type KangurMobileSectionTitleProps = {
  subtitle: string;
  title: string;
};

type KangurMobileSummaryChipProps = {
  backgroundColor?: string;
  borderColor?: string;
  label: string;
  textColor?: string;
};

type KangurMobileActionButtonProps = {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void | Promise<void>;
  stretch?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  tone?: 'ghost' | 'primary' | 'secondary';
  verticalPadding?: number;
};

type KangurMobileLinkButtonProps = {
  accessibilityLabel?: string;
  href: Href;
  label: string;
  stretch?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  tone?: 'primary' | 'secondary';
  verticalPadding?: number;
};

type KangurMobileSkeletonBlockProps = {
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  width?: number | `${number}%`;
};

type KangurMobileScrollScreenProps = {
  accessibilityLabel?: string;
  backgroundColor?: string;
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never';
  testID?: string;
};

export const KANGUR_MOBILE_SCREEN_BACKGROUND_COLOR = '#fffaf2';

const KANGUR_MOBILE_CARD_STYLE: ViewStyle = {
  borderRadius: 24,
  backgroundColor: '#ffffff',
  shadowColor: '#0f172a',
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 3,
};

const KANGUR_MOBILE_INSET_METRIC_STYLE: ViewStyle = {
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#e2e8f0',
  backgroundColor: '#f8fafc',
  padding: 14,
  gap: 6,
};

const KANGUR_MOBILE_INSET_PANEL_STYLE: ViewStyle = {
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#e2e8f0',
  backgroundColor: '#f8fafc',
};

const getButtonContainerStyle = ({
  disabled = false,
  stretch = false,
  tone = 'secondary',
  verticalPadding = 10,
}: {
  disabled?: boolean;
  stretch?: boolean;
  tone?: 'ghost' | 'primary' | 'secondary';
  verticalPadding?: number;
}): ViewStyle => ({
  alignSelf: stretch ? 'stretch' : 'flex-start',
  width: stretch ? '100%' : undefined,
  opacity: disabled ? 0.55 : 1,
  borderRadius: 999,
  borderWidth: tone === 'primary' ? 0 : 1,
  borderColor:
    tone === 'primary' ? 'transparent' : tone === 'ghost' ? '#e2e8f0' : '#cbd5e1',
  backgroundColor: tone === 'primary' ? '#0f172a' : '#ffffff',
  paddingHorizontal: 14,
  paddingVertical: verticalPadding,
});

const getButtonTextStyle = (
  tone: 'ghost' | 'primary' | 'secondary',
  stretch: boolean,
): TextStyle => ({
  color: tone === 'primary' ? '#ffffff' : '#0f172a',
  fontWeight: '700',
  textAlign: stretch ? 'center' : 'left',
});

export function KangurMobileCard(props: KangurMobileCardProps): React.JSX.Element {
  const { children, gap = 12, padding = 18, style, testID } = props;

  return (
    <View testID={testID} style={[KANGUR_MOBILE_CARD_STYLE, { gap, padding }, style]}>
      {children}
    </View>
  );
}

export function KangurMobileInsetPanel(
  props: KangurMobileInsetPanelProps,
): React.JSX.Element {
  const { children, gap, padding = 14, style, testID } = props;

  return (
    <View
      testID={testID}
      style={[
        KANGUR_MOBILE_INSET_PANEL_STYLE,
        { padding },
        gap === undefined ? null : { gap },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function KangurMobilePill(props: KangurMobilePillProps): React.JSX.Element {
  const { label, tone, style, textStyle } = props;

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          borderRadius: 999,
          borderWidth: 1,
          borderColor: tone.borderColor,
          backgroundColor: tone.backgroundColor,
          paddingHorizontal: 12,
          paddingVertical: 7,
        },
        style,
      ]}
    >
      <Text style={[{ color: tone.textColor, fontSize: 12, fontWeight: '700' }, textStyle]}>
        {label}
      </Text>
    </View>
  );
}

export function KangurMobileMetric(props: KangurMobileMetricProps): React.JSX.Element {
  const { description, label, value, style } = props;

  return (
    <View style={[KANGUR_MOBILE_INSET_METRIC_STYLE, { flexBasis: '48%' }, style]}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: '#475569', fontSize: 12, lineHeight: 18 }}>{description}</Text>
    </View>
  );
}

export function KangurMobileFilterChip(
  props: KangurMobileFilterChipProps,
): React.JSX.Element {
  const { fullWidth = false, label, onPress, selected } = props;

  return (
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      style={{
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        width: fullWidth ? '100%' : undefined,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? '#1d4ed8' : '#cbd5e1',
        backgroundColor: selected ? '#dbeafe' : '#ffffff',
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text
        style={{
          color: selected ? '#1d4ed8' : '#334155',
          fontSize: 13,
          fontWeight: '700',
          textAlign: fullWidth ? 'center' : 'left',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function KangurMobileSectionTitle(
  props: KangurMobileSectionTitleProps,
): React.JSX.Element {
  const { subtitle, title } = props;

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>{title}</Text>
      <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>{subtitle}</Text>
    </View>
  );
}

export function KangurMobileSummaryChip(
  props: KangurMobileSummaryChipProps,
): React.JSX.Element {
  const {
    backgroundColor = '#eef2ff',
    borderColor = '#c7d2fe',
    label,
    textColor = '#4338ca',
  } = props;

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        borderWidth: 1,
        borderColor,
        backgroundColor,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: textColor, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function KangurMobileActionButton(
  props: KangurMobileActionButtonProps,
): React.JSX.Element {
  const {
    disabled = false,
    accessibilityLabel,
    label,
    onPress,
    stretch = false,
    style,
    textStyle,
    tone = 'primary',
    verticalPadding = 10,
  } = props;

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => {
        void onPress();
      }}
      style={[
        getButtonContainerStyle({ disabled, stretch, tone, verticalPadding }),
        style,
      ]}
    >
      <Text style={[getButtonTextStyle(tone, stretch), textStyle]}>{label}</Text>
    </Pressable>
  );
}

export function KangurMobileLinkButton(props: KangurMobileLinkButtonProps): React.JSX.Element {
  const {
    href,
    accessibilityLabel,
    label,
    stretch = false,
    style,
    textStyle,
    tone = 'secondary',
    verticalPadding = 10,
  } = props;

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole='button'
        style={[getButtonContainerStyle({ stretch, tone, verticalPadding }), style]}
      >
        <Text style={[getButtonTextStyle(tone, stretch), textStyle]}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export function KangurMobileSkeletonBlock(
  props: KangurMobileSkeletonBlockProps,
): React.JSX.Element {
  const { height, radius = 14, style, width = '100%' } = props;

  return (
    <View
      style={[
        {
          height,
          width,
          borderRadius: radius,
          backgroundColor: '#e2e8f0',
        },
        style,
      ]}
    />
  );
}

export function KangurMobileScrollScreen(
  props: KangurMobileScrollScreenProps,
): React.JSX.Element {
  const {
    accessibilityLabel,
    backgroundColor = KANGUR_MOBILE_SCREEN_BACKGROUND_COLOR,
    children,
    contentContainerStyle,
    edges,
    keyboardShouldPersistTaps,
    testID,
  } = props;

  return (
    <SafeAreaView
      accessibilityLabel={accessibilityLabel}
      edges={edges}
      style={{ flex: 1, backgroundColor }}
      testID={testID}
    >
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
