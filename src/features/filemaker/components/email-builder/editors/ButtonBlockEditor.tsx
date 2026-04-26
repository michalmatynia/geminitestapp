import React from 'react';
import { View, Text, TextInput } from 'react-native';

interface EditorProps<T> {
  block: T;
  onUpdate: (updates: Partial<T>) => void;
}

type EmailButtonBlock = {
  label: string;
  href: string;
  background: string;
  color: string;
  align: 'left' | 'right' | 'center';
};

export function ButtonBlockEditor({ block, onUpdate }: EditorProps<EmailButtonBlock>): React.JSX.Element {
  return (
    <View>
      <Text>Label</Text>
      <TextInput
        value={block.label}
        onChangeText={(text) => onUpdate({ label: text })}
      />
      <Text>Link URL</Text>
      <TextInput
        value={block.href}
        onChangeText={(text) => onUpdate({ href: text })}
        placeholder="https://..."
      />
      <Text>Background colour</Text>
      <TextInput
        value={block.background}
        onChangeText={(text) => onUpdate({ background: text })}
      />
      <Text>Text colour</Text>
      <TextInput
        value={block.color}
        onChangeText={(text) => onUpdate({ color: text })}
      />
    </View>
  );
}
