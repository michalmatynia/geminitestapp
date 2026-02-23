import type { RichTextEditorVariant } from '../types';

export type HeadingLevel = 1 | 2 | 3;
export type TextAlignOption = 'left' | 'center' | 'right' | 'justify';
export type RichTextEditorFontOption = { value: string; label: string };

export interface RichTextEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
  variant?: RichTextEditorVariant | undefined;
  headingLevels?: HeadingLevel[] | undefined;
  allowImage?: boolean | undefined;
  allowTable?: boolean | undefined;
  allowTaskList?: boolean | undefined;
  allowFontFamily?: boolean | undefined;
  allowTextAlign?: boolean | undefined;
  enableAdvancedTools?: boolean | undefined;
  fontFamilyOptions?: RichTextEditorFontOption[] | undefined;
  loadingLabel?: string | undefined;
  containerClassName?: string | undefined;
  toolbarClassName?: string | undefined;
  surfaceClassName?: string | undefined;
  editorContentClassName?: string | undefined;
  surfaceStyle?: React.CSSProperties | undefined;
}
