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
  accessibilityLabel?: string;
  borderRadius?: number;
  centered?: boolean;
  href?: Href;
  fullWidth?: boolean;
  horizontalPadding?: number;
  idleTextColor?: string;
  label: string;
  minHeight?: number;
  onPress?: () => void;
  selectedBackgroundColor?: string;
  selectedBorderColor?: string;
  selectedTextColor?: string;
  selected: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  verticalPadding?: number;
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

type KangurMobileMutedActionChipProps = {
  compact?: boolean;
  label: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

type KangurMobileActionButtonProps = {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  borderRadius?: number;
  centered?: boolean;
  disabledOpacity?: number;
  disabled?: boolean;
  horizontalPadding?: number;
  label: string;
  minHeight?: number;
  onPress: () => void | Promise<void>;
  stretch?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  tone?: 'brand' | 'ghost' | 'primary' | 'secondary';
  verticalPadding?: number;
};

type KangurMobileLinkButtonProps = {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  borderRadius?: number;
  centered?: boolean;
  href: Href;
  label: string;
  minHeight?: number;
  onPress?: () => void;
  stretch?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  tone?: 'brand' | 'primary' | 'secondary';
  verticalPadding?: number;
};

type KangurMobilePendingActionButtonProps = {
  accessibilityLabel?: string;
  horizontalPadding?: number;
  label: string;
  onPress: () => void | Promise<void>;
  pending: boolean;
  pendingLabel: string;
  stretch?: boolean;
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
  borderRadius = 999,
  centered = false,
  disabledOpacity = 0.55,
  disabled = false,
  horizontalPadding = 14,
  minHeight,
  stretch = false,
  tone = 'secondary',
  verticalPadding = 10,
}: {
  borderRadius?: number;
  centered?: boolean;
  disabledOpacity?: number;
  disabled?: boolean;
  horizontalPadding?: number;
  minHeight?: number;
  stretch?: boolean;
  tone?: 'brand' | 'ghost' | 'primary' | 'secondary';
  verticalPadding?: number;
}): ViewStyle => ({
  alignSelf: stretch ? 'stretch' : 'flex-start',
  width: stretch ? '100%' : undefined,
  opacity: disabled ? disabledOpacity : 1,
  borderRadius,
  borderWidth: tone === 'primary' || tone === 'brand' ? 0 : 1,
  borderColor:
    tone === 'primary' || tone === 'brand'
      ? 'transparent'
      : tone === 'ghost'
        ? '#e2e8f0'
        : '#cbd5e1',
  backgroundColor: tone === 'primary' ? '#0f172a' : tone === 'brand' ? '#1d4ed8' : '#ffffff',
  alignItems: centered ? 'center' : undefined,
  justifyContent: centered ? 'center' : undefined,
  minHeight,
  paddingHorizontal: horizontalPadding,
  paddingVertical: verticalPadding,
});

const getButtonTextStyle = (
  centered: boolean,
  tone: 'brand' | 'ghost' | 'primary' | 'secondary',
  stretch: boolean,
): TextStyle => ({
  color: tone === 'primary' || tone === 'brand' ? '#ffffff' : '#0f172a',
  fontWeight: '700',
  textAlign: centered || stretch ? 'center' : 'left',
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
  const {
    accessibilityLabel,
    borderRadius = 999,
    centered = false,
    href,
    fullWidth = false,
    horizontalPadding = 14,
    idleTextColor = '#334155',
    label,
    minHeight,
    onPress,
    selected,
    selectedBackgroundColor = '#dbeafe',
    selectedBorderColor = '#1d4ed8',
    selectedTextColor = '#1d4ed8',
    style,
    textStyle,
    verticalPadding = 10,
  } = props;

  const chipStyle: ViewStyle = {
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
    width: fullWidth ? '100%' : undefined,
    borderRadius,
    borderWidth: 1,
    borderColor: selected ? selectedBorderColor : '#cbd5e1',
    backgroundColor: selected ? selectedBackgroundColor : '#ffffff',
    alignItems: centered ? 'center' : undefined,
    justifyContent: centered ? 'center' : undefined,
    minHeight,
    paddingHorizontal: horizontalPadding,
    paddingVertical: verticalPadding,
  };

  const chipText = (
    <Text
      style={[
        {
          color: selected ? selectedTextColor : idleTextColor,
          fontSize: 13,
          fontWeight: '700',
          textAlign: centered || fullWidth ? 'center' : 'left',
        },
        textStyle,
      ]}
    >
      {label}
    </Text>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole='button'
          style={[chipStyle, style]}
        >
          {chipText}
        </Pressable>
      </Link>
    );
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole='button'
      onPress={onPress}
      style={[chipStyle, style]}
    >
      {chipText}
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

export function KangurMobileMutedActionChip(
  props: KangurMobileMutedActionChipProps,
): React.JSX.Element {
  const { compact = false, label, style, textStyle } = props;

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          borderRadius: 999,
          backgroundColor: '#e2e8f0',
          paddingHorizontal: compact ? 12 : 14,
          paddingVertical: compact ? 9 : 10,
        },
        style,
      ]}
    >
      <Text style={[{ color: '#475569', fontWeight: '700' }, textStyle]}>{label}</Text>
    </View>
  );
}

export function KangurMobileActionButton(
  props: KangurMobileActionButtonProps,
): React.JSX.Element {
  const {
    accessibilityHint,
    disabled = false,
    accessibilityLabel,
    borderRadius,
    centered = false,
    disabledOpacity,
    horizontalPadding,
    label,
    minHeight,
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
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => {
        void onPress();
      }}
      style={[
        getButtonContainerStyle({
          borderRadius,
          centered,
          disabledOpacity,
          disabled,
          horizontalPadding,
          minHeight,
          stretch,
          tone,
          verticalPadding,
        }),
        style,
      ]}
    >
      <Text style={[getButtonTextStyle(centered, tone, stretch), textStyle]}>{label}</Text>
    </Pressable>
  );
}

export function KangurMobileLinkButton(props: KangurMobileLinkButtonProps): React.JSX.Element {
  const {
    href,
    accessibilityHint,
    accessibilityLabel,
    borderRadius,
    centered = false,
    label,
    minHeight,
    onPress,
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
        accessibilityHint={accessibilityHint}
        accessibilityRole='button'
        onPress={onPress}
        style={[
          getButtonContainerStyle({
            borderRadius,
            centered,
            minHeight,
            stretch,
            tone,
            verticalPadding,
          }),
          style,
        ]}
      >
        <Text style={[getButtonTextStyle(centered, tone, stretch), textStyle]}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export function KangurMobilePendingActionButton(
  props: KangurMobilePendingActionButtonProps,
): React.JSX.Element {
  const {
    accessibilityLabel,
    horizontalPadding,
    label,
    onPress,
    pending,
    pendingLabel,
    stretch = false,
    verticalPadding = 10,
  } = props;

  return (
    <KangurMobileActionButton
      accessibilityLabel={accessibilityLabel}
      disabled={pending}
      disabledOpacity={1}
      horizontalPadding={horizontalPadding}
      label={pending ? pendingLabel : label}
      onPress={onPress}
      stretch={stretch}
      style={{
        backgroundColor: pending ? '#94a3b8' : '#1d4ed8',
      }}
      tone='brand'
      verticalPadding={verticalPadding}
    />
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
