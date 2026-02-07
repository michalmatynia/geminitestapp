import { redirect } from 'next/navigation';

export default function AiApiSettingsPage(): never {
  redirect('/admin/settings/brain');
}
