import { type AriaAttributes, type ReactNode, type Ref } from 'react';

export type KangurPrimaryNavigationPage =
  | 'Competition'
  | 'Game'
  | 'GamesLibrary'
  | 'Lessons'
  | 'Tests'
  | 'LearnerProfile'
  | 'ParentDashboard'
  | 'Duels'
  | 'SocialUpdates';

export type KangurNavActionConfig = {
  active?: boolean;
  ariaControls?: string;
  ariaExpanded?: boolean;
  ariaHasPopup?: AriaAttributes['aria-haspopup'];
  ariaLabel?: string;
  className?: string;
  content: ReactNode;
  disabled?: boolean;
  docId: string;
  elementRef?: Ref<HTMLButtonElement>;
  href?: string;
  onFocus?: React.FocusEventHandler<HTMLElement>;
  onClick?: () => void;
  onMouseEnter?: React.MouseEventHandler<HTMLElement>;
  prefetch?: boolean;
  targetPageKey?: KangurPrimaryNavigationPage;
  testId?: string;
  title?: string;
  transition?: {
    active?: boolean;
    acknowledgeMs?: number;
    sourceId?: string;
  };
};

export type KangurPrimaryNavigationProps = {
  basePath: string;
  canManageLearners?: boolean;
  className?: string;
  contentClassName?: string;
  currentPage: KangurPrimaryNavigationPage;
  forceLanguageSwitcherFallbackPath?: boolean;
  guestPlayerName?: string;
  guestPlayerNamePlaceholder?: string;
  homeActive?: boolean;
  isAuthenticated: boolean;
  navLabel?: string;
  onGuestPlayerNameChange?: (value: string) => void;
  onHomeClick?: () => void;
  onLogin?: () => void;
  onLogout: () => void;
  rightAccessory?: ReactNode;
  showParentDashboard?: boolean;
};

export type KangurPrimaryNavigationFallbackCopy = {
  adminLabel: string;
  avatarLabel: string;
  enableTutorLabel: string;
  disableTutorLabel: string;
  guestPlayerNameLabel: string;
  guestPlayerNamePlaceholder: string;
  homeLabel: string;
  loginLabel: string;
  logoutLabel: string;
  logoutPendingLabel: string;
  navLabel: string;
  profileLabel: string;
  profileLabelWithName: (name: string) => string;
};
