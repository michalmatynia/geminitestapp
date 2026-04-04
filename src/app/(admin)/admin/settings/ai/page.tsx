import { redirect } from 'next/navigation';

export default function AdminAiSettingsCompatibilityPage(): never {
  redirect('/admin/brain?tab=routing');
}
