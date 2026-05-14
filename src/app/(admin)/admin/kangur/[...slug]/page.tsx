import { redirect } from 'next/navigation';

export default async function AdminKangurSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<never> {
  const resolvedParams = await params;
  redirect(`/admin/page-manager/studiq/${resolvedParams.slug.join('/')}`);
}
