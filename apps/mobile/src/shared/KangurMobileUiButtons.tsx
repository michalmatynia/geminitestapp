import { Link, type Href } from 'expo-router';
import {
  Pressable,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export type KangurMobileActionButtonProps = {
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

export type KangurMobileLinkButtonProps = {
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

export type KangurMobilePendingActionButtonProps = {
  accessibilityLabel?: string;
  horizontalPadding?: number;
  label: string;
  onPress: () => void | Promise<void>;
  pending: boolean;
  pendingLabel: string;
  stretch?: boolean;
  verticalPadding?: number;
};

const getButtonBorderColor = (tone: string): string => {
  if (tone === 'primary' || tone === 'brand') return 'transparent';
  if (tone === 'ghost') return '#e2e8f0';
  return '#cbd5e1';
};

const getButtonBackgroundColor = (tone: string): string => {
  if (tone === 'primary') return '#0f172a';
  if (tone === 'brand') return '#1d4ed8';
  return '#ffffff';
};

const getButtonOpacity = (disabled: boolean, disabledOpacity: number): number => 
  disabled ? disabledOpacity : 1;

const getButtonBorderWidth = (tone: 'brand' | 'ghost' | 'primary' | 'secondary'): number => 
  tone === 'primary' || tone === 'brand' ? 0 : 1;

const getButtonAlignSelf = (stretch: boolean): 'flex-start' | 'stretch' =>
  stretch ? 'stretch' : 'flex-start';

const getButtonWidth = (stretch: boolean): '100%' | undefined =>
  stretch ? '100%' : undefined;

const getButtonFlexAlignment = (centered: boolean): 'center' | undefined =>
  centered ? 'center' : undefined;

const getButtonBoxStyle = (
  tone: 'brand' | 'ghost' | 'primary' | 'secondary',
): { borderWidth: number; borderColor: string; backgroundColor: string } => ({
  borderWidth: getButtonBorderWidth(tone),
  borderColor: getButtonBorderColor(tone),
  backgroundColor: getButtonBackgroundColor(tone),
});

const getButtonLayoutPadding = (
  horizontalPadding: number,
  verticalPadding: number,
): { paddingHorizontal: number; paddingVertical: number } => ({
  paddingHorizontal: horizontalPadding,
  paddingVertical: verticalPadding,
});

type ResolvedButtonBaseProps = {
  borderRadius: number;
  centered: boolean;
  disabledOpacity: number;
  disabled: boolean;
  horizontalPadding: number;
  stretch: boolean;
  tone: 'brand' | 'ghost' | 'primary' | 'secondary';
  verticalPadding: number;
};

const DEFAULT_BUTTON_BASE_PROPS: ResolvedButtonBaseProps = {
  borderRadius: 999,
  centered: false,
  disabledOpacity: 0.55,
  disabled: false,
  horizontalPadding: 14,
  stretch: false,
  tone: 'secondary',
  verticalPadding: 10,
};

const resolveButtonBaseProps = (params: {
  borderRadius?: number;
  centered?: boolean;
  disabledOpacity?: number;
  disabled?: boolean;
  horizontalPadding?: number;
  minHeight?: number;
  stretch?: boolean;
  tone?: 'brand' | 'ghost' | 'primary' | 'secondary';
  verticalPadding?: number;
}): ResolvedButtonBaseProps => ({
  ...DEFAULT_BUTTON_BASE_PROPS,
  ...params,
} as ResolvedButtonBaseProps);

export const getButtonContainerStyle = (params: {
  borderRadius?: number;
  centered?: boolean;
  disabledOpacity?: number;
  disabled?: boolean;
  horizontalPadding?: number;
  minHeight?: number;
  stretch?: boolean;
  tone?: 'brand' | 'ghost' | 'primary' | 'secondary';
  verticalPadding?: number;
}): ViewStyle => {
  const base = resolveButtonBaseProps(params);
  const box = getButtonBoxStyle(base.tone);
  const layout = getButtonLayoutPadding(
    base.horizontalPadding,
    base.verticalPadding,
  );
  
  const containerStyle: ViewStyle = {
    alignSelf: getButtonAlignSelf(base.stretch),
    width: getButtonWidth(base.stretch),
    opacity: getButtonOpacity(base.disabled, base.disabledOpacity),
    borderRadius: base.borderRadius,
    borderWidth: box.borderWidth,
    borderColor: box.borderColor,
    backgroundColor: box.backgroundColor,
  };

  containerStyle.alignItems = getButtonFlexAlignment(base.centered);
  containerStyle.justifyContent = getButtonFlexAlignment(base.centered);
  containerStyle.minHeight = params.minHeight;
  containerStyle.paddingHorizontal = layout.paddingHorizontal;
  containerStyle.paddingVertical = layout.paddingVertical;

  return containerStyle;
};

export const getButtonTextStyle = (
  centered: boolean,
  tone: 'brand' | 'ghost' | 'primary' | 'secondary',
  stretch: boolean,
): TextStyle => ({
  color: tone === 'primary' || tone === 'brand' ? '#ffffff' : '#0f172a',
  fontWeight: '700',
  textAlign: centered || stretch ? 'center' : 'left',
});

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
        // eslint-disable-next-line no-void
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
