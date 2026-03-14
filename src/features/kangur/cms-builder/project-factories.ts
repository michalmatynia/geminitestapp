import type {
  BlockInstance,
  PageComponentInput,
} from '@/shared/contracts/cms';
import type { KangurWidgetId } from './project-contracts';

export const makeHeadingBlock = (
  id: string,
  headingText: string,
  fontSize = 40,
  settings: Record<string, unknown> = {}
): PageComponentInput['content']['blocks'][number] => ({
  id,
  type: 'Heading',
  settings: {
    headingText,
    fontSize,
    fontWeight: '700',
    textColor: '#f8fafc',
    ...settings,
  },
});

export const makeTextBlock = (
  id: string,
  textContent: string,
  settings: Record<string, unknown> = {}
): PageComponentInput['content']['blocks'][number] => ({
  id,
  type: 'Text',
  settings: {
    textContent,
    fontSize: 16,
    lineHeight: 1.6,
    textColor: '#cbd5e1',
    ...settings,
  },
});

export const makeButtonBlock = (
  id: string,
  buttonLabel: string,
  settings: Record<string, unknown> = {}
): BlockInstance => ({
  id,
  type: 'Button',
  settings: {
    buttonLabel,
    buttonLink: '',
    buttonStyle: 'solid',
    runtimeActionSource: '',
    runtimeActionPath: '',
    ...settings,
  },
});

export const makeInputBlock = (id: string, settings: Record<string, unknown> = {}): BlockInstance => ({
  id,
  type: 'Input',
  settings: {
    inputValue: '',
    inputPlaceholder: '',
    inputType: 'text',
    inputAutoComplete: '',
    inputMaxLength: 0,
    inputDisabled: 'false',
    inputChangeActionSource: '',
    inputChangeActionPath: '',
    inputSubmitActionSource: '',
    inputSubmitActionPath: '',
    ...settings,
  },
});

export const makeProgressBlock = (id: string, settings: Record<string, unknown> = {}): BlockInstance => ({
  id,
  type: 'Progress',
  settings: {
    progressValue: 0,
    progressMax: 100,
    progressHeight: 12,
    borderRadius: 999,
    fillColor: '#6366f1',
    trackColor: '#e2e8f0',
    showPercentage: 'false',
    ...settings,
  },
});

export const makeRepeaterBlock = (
  id: string,
  blocks: BlockInstance[],
  settings: Record<string, unknown> = {}
): BlockInstance => ({
  id,
  type: 'Repeater',
  settings: {
    collectionSource: '',
    collectionPath: '',
    emptyMessage: 'No items to show yet.',
    itemLimit: 0,
    itemsGap: 16,
    listLayoutDirection: 'column',
    listWrap: 'wrap',
    listAlignItems: 'stretch',
    listJustifyContent: 'start',
    itemGap: 12,
    itemLayoutDirection: 'column',
    itemWrap: 'wrap',
    itemAlignItems: 'stretch',
    itemJustifyContent: 'start',
    ...settings,
  },
  blocks,
});

export const makeContainerBlock = (input: {
  id: string;
  blocks: BlockInstance[];
  settings?: Record<string, unknown>;
}): BlockInstance => ({
  id: input.id,
  type: 'Block',
  settings: {
    colorScheme: 'none',
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    blockGap: 12,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    contentAlignment: 'left',
    layoutDirection: 'column',
    wrap: 'wrap',
    alignItems: 'stretch',
    justifyContent: 'inherit',
    minHeight: 0,
    maxWidth: 0,
    overflow: 'visible',
    opacity: 100,
    zIndex: 0,
    background: { type: 'none' },
    sectionBorder: { width: 0, style: 'none', color: '#4b5563', radius: 0 },
    sectionShadow: { x: 0, y: 0, blur: 0, spread: 0, color: '#00000000' },
    customCss: '',
    ...(input.settings ?? {}),
  },
  blocks: input.blocks,
});

export const makeWidgetBlock = (
  id: string,
  widgetId: KangurWidgetId,
  settings: Record<string, unknown> = {}
): PageComponentInput['content']['blocks'][number] => ({
  id,
  type: 'KangurWidget',
  settings: {
    widgetId,
    title: '',
    emptyLabel: '',
    limit: 3,
    ...settings,
  },
});

export const makeBlockSection = (input: {
  id: string;
  title?: string;
  description?: string;
  blocks: PageComponentInput['content']['blocks'];
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  settings?: Record<string, unknown>;
}): PageComponentInput => ({
  type: 'Block',
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
      blockGap: 16,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      contentAlignment: 'left',
      layoutDirection: 'column',
      wrap: 'wrap',
      alignItems: 'stretch',
      justifyContent: 'inherit',
      minHeight: 0,
      maxWidth: 0,
      overflow: 'visible',
      opacity: 100,
      zIndex: 0,
      customCss: '',
      ...(input.settings ?? {}),
    },
    blocks: input.blocks,
  },
});

export const withOrders = (components: PageComponentInput[]): PageComponentInput[] =>
  components.map((c, i) => ({ ...c, order: i }));
