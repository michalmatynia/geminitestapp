import { redirect } from 'next/navigation';

export default function AdminBrainSettingsPage(): never {
  redirect('/admin/brain?tab=routing');
}
