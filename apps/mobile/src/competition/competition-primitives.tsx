import { Pressable, Text, View } from 'react-native';
import {
  BASE_TONE,
  INDIGO_TONE,
  OutlineLink,
  PrimaryButton,
  SectionCard,
  StatusPill,
  SUCCESS_TONE,
  WARNING_TONE,
  type Tone,
} from '../shared/KangurAssessmentUi';

export {
  BASE_TONE,
  INDIGO_TONE,
  OutlineLink,
  PrimaryButton,
  SectionCard,
  StatusPill,
  SUCCESS_TONE,
  WARNING_TONE,
  type Tone,
} from '../shared/KangurAssessmentUi';

export function ChoiceButton({
  index,
  isSelected,
  label,
  onPress,
}: {
  index: number;
  isSelected: boolean;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  const tone = isSelected ? INDIGO_TONE : BASE_TONE;

  return (
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      style={{
        backgroundColor: tone.backgroundColor,
        borderColor: tone.borderColor,
        borderRadius: 20,
        borderWidth: 1,
        gap: 8,
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
          <Text style={{ color: '#0f172a', fontWeight: '800' }}>
            {String.fromCharCode(65 + index)}
          </Text>
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
    </Pressable>
  );
}
