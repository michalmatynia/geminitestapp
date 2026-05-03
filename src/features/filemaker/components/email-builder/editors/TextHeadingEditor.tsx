import React from 'react';
import { View, Text, TextInput } from '@/shared/ui/react-native-web-shim';

interface EditorProps<T> {
  block: T;
  onUpdate: (updates: Partial<T>) => void;
}

type EmailTextBlock = { text: string };
type EmailHeadingBlock = { text: string; level: number };

export function TextBlockEditor({ block, onUpdate }: EditorProps<EmailTextBlock>): React.JSX.Element {
  return (
    <View>
      <Text>Text Content</Text>
      <TextInput value={block.text} onChangeText={(text) => onUpdate({ text })} />
    </View>
  );
}

export function HeadingBlockEditor({ block, onUpdate }: EditorProps<EmailHeadingBlock>): React.JSX.Element {
  return (
    <View>
      <Text>Heading</Text>
      <TextInput value={block.text} onChangeText={(text) => onUpdate({ text })} />
    </View>
  );
}
