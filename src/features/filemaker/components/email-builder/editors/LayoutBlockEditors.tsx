import React from 'react';
import { View, Text } from 'react-native';

interface EditorProps<T> {
  block: T;
  onUpdate: (updates: Partial<T>) => void;
}

export function DividerBlockEditor({ block, onUpdate }: EditorProps<any>): React.JSX.Element {
  return <View><Text>Divider Editor</Text></View>;
}

export function SpacerBlockEditor({ block, onUpdate }: EditorProps<any>): React.JSX.Element {
  return <View><Text>Spacer Editor</Text></View>;
}

export function SectionBlockEditor({ block, onUpdate }: EditorProps<any>): React.JSX.Element {
  return <View><Text>Section Editor</Text></View>;
}

export function ColumnsBlockEditor({ block, onUpdate }: EditorProps<any>): React.JSX.Element {
  return <View><Text>Columns Editor</Text></View>;
}

export function RowBlockEditor({ block, onUpdate }: EditorProps<any>): React.JSX.Element {
  return <View><Text>Row Editor</Text></View>;
}
