import { redirect } from 'next/navigation';

export default function AdminBrainSettingsCompatibilityPage(): never {
  redirect('/admin/brain?tab=routing');
}
