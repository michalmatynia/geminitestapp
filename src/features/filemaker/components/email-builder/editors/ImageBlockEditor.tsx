import React from 'react';
import { View, Text, TextInput } from 'react-native';

interface EditorProps<T> {
  block: T;
  onUpdate: (updates: Partial<T>) => void;
}

// Placeholder types for the actual EmailImageBlock definition
type EmailImageBlock = {
  src: string;
  alt: string;
  href: string | null;
  width: number | null;
  align: 'left' | 'right' | 'center';
};

const ALIGN_OPTIONS = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
];

export function ImageBlockEditor({ block, onUpdate }: EditorProps<EmailImageBlock>): React.JSX.Element {
  return (
    <View>
      <Text>Image URL</Text>
      <TextInput
        value={block.src}
        onChangeText={(text) => onUpdate({ src: text })}
        placeholder="https://..."
      />
      <Text>Alt text</Text>
      <TextInput
        value={block.alt}
        onChangeText={(text) => onUpdate({ alt: text })}
      />
      <Text>Link URL (optional)</Text>
      <TextInput
        value={block.href ?? ''}
        onChangeText={(text) => onUpdate({ href: text || null })}
        placeholder="https://..."
      />
      <Text>Width (px)</Text>
      <TextInput
        keyboardType="numeric"
        value={String(block.width ?? '')}
        onChangeText={(text) => {
          const parsed = Math.trunc(Number(text));
          onUpdate({ width: Number.isFinite(parsed) && parsed > 0 ? parsed : null });
        }}
      />
    </View>
  );
}
