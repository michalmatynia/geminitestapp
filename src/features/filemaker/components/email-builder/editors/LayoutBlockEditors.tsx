import React from 'react';
import { View, Text } from '@/shared/ui/react-native-web-shim';

interface EditorProps<T> {
  block: T;
  onUpdate: (updates: Partial<T>) => void;
}

type LayoutEditorBlock = object;

export function DividerBlockEditor(_props: EditorProps<LayoutEditorBlock>): React.JSX.Element {
  return <View><Text>Divider Editor</Text></View>;
}

export function SpacerBlockEditor(_props: EditorProps<LayoutEditorBlock>): React.JSX.Element {
  return <View><Text>Spacer Editor</Text></View>;
}

export function SectionBlockEditor(_props: EditorProps<LayoutEditorBlock>): React.JSX.Element {
  return <View><Text>Section Editor</Text></View>;
}

export function ColumnsBlockEditor(_props: EditorProps<LayoutEditorBlock>): React.JSX.Element {
  return <View><Text>Columns Editor</Text></View>;
}

export function RowBlockEditor(_props: EditorProps<LayoutEditorBlock>): React.JSX.Element {
  return <View><Text>Row Editor</Text></View>;
}
