import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { revalidateLocalizedPath, type RevalidatePathType } from '@/lib/cmsRevalidation';
import { DEFAULT_LOCALE, normalizeLocale, type EcomLocale } from '@/lib/locales';

type LocalizedRevalidationTarget = {
  path: string;
  type?: RevalidatePathType;
};

export async function deleteLocalizedCmsRouteContent({
  req,
  label,
  deleteContent,
  revalidate,
}: {
  req: NextRequest;
  label: string;
  deleteContent: (locale: EcomLocale) => Promise<boolean>;
  revalidate: readonly LocalizedRevalidationTarget[];
}): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const locale = normalizeLocale(req.nextUrl.searchParams.get('locale'));
  if (locale === DEFAULT_LOCALE) {
    return NextResponse.json({ error: `Default locale ${label} CMS content cannot be deleted.` }, { status: 400 });
  }

  try {
    const deleted = await deleteContent(locale);
    for (const target of revalidate) {
      revalidateLocalizedPath(target.path, target.type);
    }
    return NextResponse.json({ ok: true, locale, deleted });
  } catch {
    return NextResponse.json({ error: `Failed to delete ${label} CMS content` }, { status: 500 });
  }
}
