import type {
  BlockInstance,
} from '../../../types/page-builder';


export interface PreviewBlockItemProps {
  block: BlockInstance;
}

export interface PreviewSectionBlockProps {
  block: BlockInstance;
  stretch?: boolean | undefined;
}
