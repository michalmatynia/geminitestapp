import { redirect } from 'next/navigation';

export default function Page(): never {
  redirect('/admin/ai-paths/queue?tab=paths-external');
}
