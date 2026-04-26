import React from 'react';
import { View, Text } from 'react-native';
import { 
  ImageBlockEditor, 
  ButtonBlockEditor, 
  TextBlockEditor, 
  HeadingBlockEditor,
  DividerBlockEditor,
  SpacerBlockEditor,
  SectionBlockEditor,
  ColumnsBlockEditor,
  RowBlockEditor
} from './editors';

// Mock types for the orchestration
interface BlockEditorProps {
  block: any;
  onUpdate: (updates: any) => void;
}

export function BlockEditor({ block, onUpdate }: BlockEditorProps): React.JSX.Element {
  switch (block.kind) {
    case 'text':
      return <TextBlockEditor block={block} onUpdate={onUpdate} />;
    case 'heading':
      return <HeadingBlockEditor block={block} onUpdate={onUpdate} />;
    case 'image': 
      return <ImageBlockEditor block={block} onUpdate={onUpdate} />;
    case 'button': 
      return <ButtonBlockEditor block={block} onUpdate={onUpdate} />;
    case 'divider':
      return <DividerBlockEditor block={block} onUpdate={onUpdate} />;
    case 'spacer':
      return <SpacerBlockEditor block={block} onUpdate={onUpdate} />;
    case 'section':
      return <SectionBlockEditor block={block} onUpdate={onUpdate} />;
    case 'columns':
      return <ColumnsBlockEditor block={block} onUpdate={onUpdate} />;
    case 'row':
      return <RowBlockEditor block={block} onUpdate={onUpdate} />;
    default:
      return <View><Text>Editor for {block.kind} not yet migrated</Text></View>;
  }
}
