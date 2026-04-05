import type {
  KangurAssignmentCreateInput,
  KangurAssignmentSnapshot,
  KangurAssignmentUpdateInput,
  KangurLearnerProfile,
  KangurScoreRecord,
  KangurUser,
} from '@kangur/platform';
import type { KangurAuthMode } from '@/features/kangur/shared/contracts/kangur-auth';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';

export type KangurParentDashboardTabId =
  | 'progress'
  | 'assign'
  | 'monitoring'
  | 'ai-tutor';

export type KangurParentDashboardPanelDisplayMode = 'always' | 'active-tab';

export type KangurParentDashboardCreateForm = {
  displayName: string;
  age: string;
  loginName: string;
  password: string;
};

export type KangurParentDashboardEditForm = {
  displayName: string;
  loginName: string;
  password: string;
  status: 'active' | 'disabled';
};

export type KangurParentDashboardRuntimeStateContextValue = {
  assignments: KangurAssignmentSnapshot[];
  assignmentsError: string | null;
  basePath: string;
  user: KangurUser | null;
  learners: KangurLearnerProfile[];
  lessons: KangurLesson[];
  activeLearner: KangurLearnerProfile | null;
  isAuthenticated: boolean;
  canManageLearners: boolean;
  canAccessDashboard: boolean;
  scores: KangurScoreRecord[];
  scoresError: string | null;
  viewerName: string;
  scoreViewerName: string | null;
  scoreViewerEmail: string | null;
  viewerRoleLabel: string | null;
  progress: KangurProgressState;
  activeTab: KangurParentDashboardTabId;
  isCreateLearnerModalOpen: boolean;
  createForm: KangurParentDashboardCreateForm;
  editForm: KangurParentDashboardEditForm;
  isSubmitting: boolean;
  feedback: string | null;
  isLoadingAssignments: boolean;
  isLoadingScores: boolean;
};

export type KangurParentDashboardRuntimeShellStateContextValue = Pick<
  KangurParentDashboardRuntimeStateContextValue,
  | 'activeLearner'
  | 'activeTab'
  | 'basePath'
  | 'canAccessDashboard'
  | 'canManageLearners'
  | 'isAuthenticated'
  | 'user'
  | 'viewerName'
  | 'viewerRoleLabel'
>;

export type KangurParentDashboardRuntimeHeroStateContextValue = Pick<
  KangurParentDashboardRuntimeStateContextValue,
  | 'activeLearner'
  | 'basePath'
  | 'canManageLearners'
  | 'isAuthenticated'
  | 'lessons'
  | 'progress'
  | 'viewerName'
  | 'viewerRoleLabel'
>;

export type KangurParentDashboardRuntimeOverviewStateContextValue = Pick<
  KangurParentDashboardRuntimeStateContextValue,
  | 'activeLearner'
  | 'basePath'
  | 'canAccessDashboard'
  | 'canManageLearners'
  | 'createForm'
  | 'editForm'
  | 'feedback'
  | 'isAuthenticated'
  | 'isCreateLearnerModalOpen'
  | 'isSubmitting'
  | 'learners'
  | 'lessons'
  | 'progress'
  | 'viewerName'
  | 'viewerRoleLabel'
>;

export type KangurParentDashboardRuntimeActionsContextValue = {
  createAssignment: (input: KangurAssignmentCreateInput) => Promise<KangurAssignmentSnapshot>;
  refreshAssignments: () => Promise<void>;
  reassignAssignment: (id: string) => Promise<KangurAssignmentSnapshot>;
  navigateToLogin: (options?: { authMode?: KangurAuthMode }) => void;
  logout: (shouldRedirect?: boolean) => void;
  selectLearner: (learnerId: string) => Promise<void>;
  setActiveTab: (tabId: KangurParentDashboardTabId) => void;
  setCreateLearnerModalOpen: (open: boolean) => void;
  updateCreateField: <K extends keyof KangurParentDashboardCreateForm>(
    key: K,
    value: KangurParentDashboardCreateForm[K]
  ) => void;
  updateEditField: <K extends keyof KangurParentDashboardEditForm>(
    key: K,
    value: KangurParentDashboardEditForm[K]
  ) => void;
  handleCreateLearner: () => Promise<boolean>;
  handleSaveLearner: () => Promise<boolean>;
  handleDeleteLearner: (learnerId: string) => Promise<boolean>;
  updateAssignment: (
    id: string,
    input: KangurAssignmentUpdateInput
  ) => Promise<KangurAssignmentSnapshot>;
};

export type KangurParentDashboardRuntimeShellActionsContextValue = Pick<
  KangurParentDashboardRuntimeActionsContextValue,
  'logout' | 'setActiveTab' | 'setCreateLearnerModalOpen'
>;
