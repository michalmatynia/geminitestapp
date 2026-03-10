import { Extension, Mark, mergeAttributes } from '@tiptap/core';

import type { TextAlignOption } from '../RichTextEditorTypes';

export const fontFamilyMark = Mark.create({
  name: 'fontFamilyStyle',
  inclusive: true,
  parseHTML() {
    return [{ tag: 'span[style*="font-family"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
  addAttributes() {
    return {
      fontFamily: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const value = element.style.fontFamily?.trim();
          return value && value.length > 0 ? value : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const fontFamily =
            typeof attributes['fontFamily'] === 'string' ? attributes['fontFamily'].trim() : '';
          if (!fontFamily) {
            return {};
          }
          return { style: `font-family: ${fontFamily}` };
        },
      },
    };
  },
});

export const underlineMark = Mark.create({
  name: 'underlineStyle',
  parseHTML() {
    return [
      { tag: 'u' },
      {
        style: 'text-decoration',
        getAttrs: (value: string | Record<string, unknown>): false | null => {
          if (typeof value !== 'string') return false;
          return value.toLowerCase().includes('underline') ? null : false;
        },
      },
    ];
  },
  renderHTML() {
    return ['u', 0];
  },
});

export const TEXT_ALIGN_OPTIONS: TextAlignOption[] = ['left', 'center', 'right', 'justify'];

export const inlineTextAlignMark = Mark.create({
  name: 'inlineTextAlignStyle',
  inclusive: false,
  parseHTML() {
    return [
      { tag: 'span[data-inline-text-align]' },
      {
        style: 'text-align',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
  addAttributes() {
    return {
      textAlign: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const datasetValue = element.getAttribute('data-inline-text-align')?.trim().toLowerCase();
          if (datasetValue && TEXT_ALIGN_OPTIONS.includes(datasetValue as TextAlignOption)) {
            return datasetValue;
          }
          const styleValue = element.style.textAlign?.trim().toLowerCase();
          if (styleValue && TEXT_ALIGN_OPTIONS.includes(styleValue as TextAlignOption)) {
            return styleValue;
          }
          return null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const textAlign =
            typeof attributes['textAlign'] === 'string'
              ? attributes['textAlign'].trim().toLowerCase()
              : '';
          if (!TEXT_ALIGN_OPTIONS.includes(textAlign as TextAlignOption) || textAlign === 'left') {
            return {};
          }
          return {
            'data-inline-text-align': textAlign,
            style: `display: inline-block; width: 100%; text-align: ${textAlign};`,
          };
        },
      },
    };
  },
});

export const textAlignExtension = Extension.create({
  name: 'textAlign',
  addGlobalAttributes() {
    return [
      {
        types: ['heading', 'paragraph'],
        attributes: {
          textAlign: {
            default: 'left',
            parseHTML: (element: HTMLElement) => {
              const value = element.style.textAlign?.trim().toLowerCase();
              return TEXT_ALIGN_OPTIONS.includes(value as TextAlignOption)
                ? (value as TextAlignOption)
                : 'left';
            },
            renderHTML: (attributes: Record<string, unknown>) => {
              const textAlign =
                typeof attributes['textAlign'] === 'string'
                  ? attributes['textAlign'].trim().toLowerCase()
                  : '';
              if (
                !TEXT_ALIGN_OPTIONS.includes(textAlign as TextAlignOption) ||
                textAlign === 'left'
              ) {
                return {};
              }
              return { style: `text-align: ${textAlign}` };
            },
          },
        },
      },
    ];
  },
});
