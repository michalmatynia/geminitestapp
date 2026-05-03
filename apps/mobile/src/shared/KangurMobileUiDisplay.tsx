import { Link, type Href } from 'expo-router';
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export type KangurMobileTone = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
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

const KANGUR_MOBILE_INSET_METRIC_STYLE: ViewStyle = {
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#e2e8f0',
  backgroundColor: '#f8fafc',
  padding: 14,
  gap: 6,
};

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

const getFilterChipContainerStyle = ({
  fullWidth,
  borderRadius,
  selected,
  selectedBorderColor,
  selectedBackgroundColor,
  centered,
  minHeight,
  horizontalPadding,
  verticalPadding,
}: {
  fullWidth: boolean;
  borderRadius: number;
  selected: boolean;
  selectedBorderColor: string;
  selectedBackgroundColor: string;
  centered: boolean;
  minHeight?: number;
  horizontalPadding: number;
  verticalPadding: number;
}): ViewStyle => ({
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
});

const getFilterChipTextStyle = ({
  selected,
  selectedTextColor,
  idleTextColor,
  centered,
  fullWidth,
}: {
  selected: boolean;
  selectedTextColor: string;
  idleTextColor: string;
  centered: boolean;
  fullWidth: boolean;
}): TextStyle => ({
  color: selected ? selectedTextColor : idleTextColor,
  fontSize: 13,
  fontWeight: '700',
  textAlign: (centered || fullWidth) ? 'center' : 'left',
});

const resolveFilterChipContent = (
  props: Pick<KangurMobileFilterChipProps, 'accessibilityLabel' | 'label' | 'onPress' | 'style'>,
  chipStyle: ViewStyle,
  chipTextStyle: TextStyle,
  textStyle?: StyleProp<TextStyle>,
): React.JSX.Element => (
  <Pressable
    accessibilityLabel={props.accessibilityLabel}
    accessibilityRole='button'
    onPress={props.onPress}
    style={[chipStyle, props.style]}
  >
    <Text style={[chipTextStyle, textStyle]}>{props.label}</Text>
  </Pressable>
);

export function KangurMobileFilterChip(
  props: KangurMobileFilterChipProps,
): React.JSX.Element {
  const {
    borderRadius = 999,
    centered = false,
    href,
    fullWidth = false,
    horizontalPadding = 14,
    idleTextColor = '#334155',
    selected,
    selectedBackgroundColor = '#dbeafe',
    selectedBorderColor = '#1d4ed8',
    selectedTextColor = '#1d4ed8',
    textStyle,
    verticalPadding = 10,
  } = props;

  const chipStyle = getFilterChipContainerStyle({
    fullWidth,
    borderRadius,
    selected,
    selectedBorderColor,
    selectedBackgroundColor,
    centered,
    minHeight: props.minHeight,
    horizontalPadding,
    verticalPadding,
  });

  const chipTextStyle = getFilterChipTextStyle({
    selected,
    selectedTextColor,
    idleTextColor,
    centered,
    fullWidth,
  });

  const content = resolveFilterChipContent(props, chipStyle, chipTextStyle, textStyle);

  if (href !== undefined) {
    return (
      <Link href={href} asChild>
        {content}
      </Link>
    );
  }

  return content;
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
