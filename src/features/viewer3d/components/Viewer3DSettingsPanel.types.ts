import type {
  Viewer3DActionsContextType,
  Viewer3DStateContextType,
} from '../context/Viewer3DContext';

export type Viewer3DSettingsActions = Viewer3DActionsContextType;
export type Viewer3DSettingsState = Viewer3DStateContextType;

export type Viewer3DSettingsSectionProps = {
  state: Viewer3DSettingsState;
  actions: Viewer3DSettingsActions;
};
