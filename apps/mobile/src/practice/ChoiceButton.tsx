import React from 'react';
import { Pressable, Text } from 'react-native';

export function ChoiceButton({
  label,
  onPress,
  state,
}: {
  label: string;
  onPress: () => void;
  state: 'idle' | 'correct' | 'incorrect' | 'neutral';
}): React.JSX.Element {
  let backgroundColor = '#ffffff';
  let borderColor = '#cbd5e1';
  let textColor = '#0f172a';

  if (state === 'correct') {
    backgroundColor = '#ecfdf5';
    borderColor = '#86efac';
    textColor = '#166534';
  } else if (state === 'incorrect') {
    backgroundColor = '#fef2f2';
    borderColor = '#fca5a5';
    textColor = '#b91c1c';
  } else if (state === 'neutral') {
    backgroundColor = '#f8fafc';
  }

  return (
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor,
        backgroundColor,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <Text style={{ color: textColor, fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
