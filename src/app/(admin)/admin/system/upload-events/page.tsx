import { redirect } from 'next/navigation';

export default function AdminUploadEventsPage(): never {
  redirect('/admin/ai-paths/queue?tab=file-uploads');
}
