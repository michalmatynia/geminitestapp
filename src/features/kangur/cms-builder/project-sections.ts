import type { BlockInstance, PageComponentInput } from '@/shared/contracts/cms';
import {
  makeContainerBlock,
  makeHeadingBlock,
  makeTextBlock,
} from './project-factories';

export const makeGridSection = (input: {
  id: string;
  rows: BlockInstance[];
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  settings?: Record<string, unknown>;
}): PageComponentInput => ({
  type: 'Grid',
  order: 0,
  content: {
    zone: 'template',
    sectionId: input.id,
    parentSectionId: null,
    settings: {
      colorScheme: 'none',
      paddingTop: input.paddingTop ?? 24,
      paddingBottom: input.paddingBottom ?? 24,
      paddingLeft: input.paddingLeft ?? 24,
      paddingRight: input.paddingRight ?? 24,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      customCss: '',
      ...(input.settings ?? {}),
    },
    blocks: input.rows,
  },
});

export const makeGridRow = (input: {
  id: string;
  columns: BlockInstance[];
  settings?: Record<string, unknown>;
}): BlockInstance => ({
  id: input.id,
  type: 'Row',
  settings: {
    rowGap: 24,
    ...(input.settings ?? {}),
  },
  blocks: input.columns,
});

export const makeGridColumn = (input: {
  id: string;
  blocks: BlockInstance[];
  span?: number;
  settings?: Record<string, unknown>;
}): BlockInstance => ({
  id: input.id,
  type: 'Column',
  settings: {
    columnSpan: input.span ?? 12,
    columnGap: 16,
    ...(input.settings ?? {}),
  },
  blocks: input.blocks,
});

export const makeRuntimeVisibilitySettings = (input: {
  mode: 'truthy' | 'falsy' | 'equal' | 'notEqual';
  path: string;
  value?: string;
}): Record<string, unknown> => ({
  runtimeVisibility: {
    enabled: true,
    rules: [
      {
        id: `rule-${Math.random().toString(36).slice(2, 9)}`,
        source: 'kangur',
        path: input.path,
        operator: input.mode,
        value: input.value ?? '',
      },
    ],
  },
});

export const makeGameUserVisibilitySettings = (
  mode: 'truthy' | 'falsy'
): Record<string, unknown> =>
  makeRuntimeVisibilitySettings({
    mode,
    path: 'user.isAuthenticated',
  });

export const makeGameMetricCard = (input: {
  id: string;
  label: string;
  connectionPath: string;
  fillColor: string;
  fallback?: string;
  textColor?: string;
  valueFontSize?: number;
}): BlockInstance =>
  makeContainerBlock({
    id: input.id,
    settings: {
      paddingTop: 18,
      paddingBottom: 18,
      paddingLeft: 16,
      paddingRight: 16,
      blockGap: 6,
      contentAlignment: 'center',
      alignItems: 'center',
      background: { type: 'solid', color: input.fillColor },
      sectionBorder: {
        width: 1,
        style: 'solid',
        color: input.fillColor,
        radius: 22,
      },
    },
    blocks: [
      makeHeadingBlock(`${input.id}-value`, input.fallback ?? '0', input.valueFontSize ?? 28, {
        headingSize: 'small',
        textColor: input.textColor ?? '#0f172a',
        connection: {
          enabled: true,
          source: 'kangur',
          path: input.connectionPath,
          fallback: input.fallback ?? '0',
        },
      }),
      makeTextBlock(`${input.id}-label`, input.label, {
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
        textColor: '#64748b',
      }),
    ],
  });
