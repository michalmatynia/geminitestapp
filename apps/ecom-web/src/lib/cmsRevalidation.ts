import { revalidatePath } from 'next/cache';
import { localizeHref, SUPPORTED_LOCALES } from '@/lib/locales';

export type RevalidatePathType = 'page' | 'layout';

export function revalidateLocalizedPath(path: string, type?: RevalidatePathType): void {
  for (const locale of SUPPORTED_LOCALES) {
    const localizedPath = localizeHref(path, locale);
    if (type) {
      revalidatePath(localizedPath, type);
    } else {
      revalidatePath(localizedPath);
    }
  }
}
