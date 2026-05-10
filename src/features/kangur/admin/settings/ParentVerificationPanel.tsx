import { AdminPanel } from '../shared/AdminPanel';
import { KangurParentVerificationSettingsPanel } from '../components/KangurParentVerificationSettingsPanel';

export function ParentVerificationPanel({ controller, className }: any) {
  return (
    <AdminPanel title='Parent Verification' description='Manage email verification and CAPTCHA rules.' className={className}>
      <KangurParentVerificationSettingsPanel
        requireEmailVerification={controller.parentVerificationRequireEmailVerification}
        setRequireEmailVerification={controller.setParentVerificationRequireEmailVerification}
        requireCaptcha={controller.parentVerificationRequireCaptcha}
        setRequireCaptcha={controller.setParentVerificationRequireCaptcha}
        notificationsEnabled={controller.parentVerificationNotificationsEnabled}
        setNotificationsEnabled={controller.setParentVerificationNotificationsEnabled}
        notificationsDisabledUntilInput={controller.parentVerificationNotificationsDisabledUntilInput}
        setNotificationsDisabledUntilInput={controller.setParentVerificationNotificationsDisabledUntilInput}
        resendCooldownInput={controller.parentVerificationResendCooldownInput}
        setResendCooldownInput={controller.setParentVerificationResendCooldownInput}
        notificationsPausedUntil={controller.parentVerificationNotificationsPausedUntil}
      />
    </AdminPanel>
  );
}
