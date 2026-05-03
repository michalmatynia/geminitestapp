import type { ReactNode } from 'react';
import {
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

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

const KANGUR_MOBILE_INSET_PANEL_STYLE: ViewStyle = {
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#e2e8f0',
  backgroundColor: '#f8fafc',
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
