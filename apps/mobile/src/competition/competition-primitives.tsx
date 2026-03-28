import {
  BASE_TONE,
  ChoiceCardButton,
  INDIGO_TONE,
} from '../shared/KangurAssessmentUi';

export {
  BASE_TONE,
  ChoiceCardButton,
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
  return (
    <ChoiceCardButton
      indexLabel={String.fromCharCode(65 + index)}
      label={label}
      onPress={onPress}
      tone={isSelected ? INDIGO_TONE : BASE_TONE}
    />
  );
}
