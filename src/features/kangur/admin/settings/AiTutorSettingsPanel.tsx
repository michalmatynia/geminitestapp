import { AdminPanel } from '../shared/AdminPanel';
import { KangurAiTutorSettingsPanel } from '../components/KangurAiTutorSettingsPanel';

export function AiTutorSettingsPanel({ controller, className }: any) {
  return (
    <AdminPanel title='AI Tutor Settings' description='Configure agent persona, motion, and onboarding.' className={className}>
      <KangurAiTutorSettingsPanel
        agentPersonaId={controller.agentPersonaId}
        setAgentPersonaId={controller.setAgentPersonaId}
        motionPresetId={controller.motionPresetId}
        setMotionPresetId={controller.setMotionPresetId}
        dailyMessageLimitInput={controller.dailyMessageLimitInput}
        setDailyMessageLimitInput={controller.setDailyMessageLimitInput}
        guestIntroMode={controller.guestIntroMode}
        setGuestIntroMode={controller.setGuestIntroMode}
        homeOnboardingMode={controller.homeOnboardingMode}
        setHomeOnboardingMode={controller.setHomeOnboardingMode}
        agentPersonas={controller.agentPersonas}
      />
    </AdminPanel>
  );
}
