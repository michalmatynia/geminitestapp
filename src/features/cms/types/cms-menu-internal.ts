export interface CmsMenuInternalProps {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  activeColor?: string;
  activeItemColor?: string;
  menuPlacement?: 'left' | 'right' | 'top' | 'bottom';
  collapsible?: boolean;
  collapsedByDefault?: boolean;
  stickyEnabled?: boolean;
  fullWidth?: boolean;
  maxWidth?: string;
  layoutStyle?: 'horizontal' | 'vertical';
  itemGap?: string;
  showItemImages?: boolean;
  itemImageSize?: number;
  transitionSpeed?: number;
  collapsedWidth?: string;
  sideWidth?: string;
}
