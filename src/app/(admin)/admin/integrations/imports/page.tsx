import { redirect } from 'next/navigation';

export default function Page(): never {
  redirect('/admin/integrations/aggregators/base-com/import-export');
}
