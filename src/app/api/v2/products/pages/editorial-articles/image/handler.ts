import { type NextRequest, NextResponse } from 'next/server';

import { uploadEcommercePagesCmsEditorialArticleImage } from '@/features/products/pages/ecommerce-pages-cms/ecommerce-pages-cms.server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError, badRequestError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const isFileLike = (entry: FormDataEntryValue | null): entry is File =>
  typeof entry === 'object' &&
  entry !== null &&
  'arrayBuffer' in entry &&
  'size' in entry &&
  'name' in entry;

const assertAuthenticated = (ctx: ApiHandlerContext): string => {
  const userId = ctx.userId?.trim() ?? '';
  if (userId.length === 0) {
    throw authError('Unauthorized.');
  }
  return userId;
};

const readEditorialArticleImageFile = (formData: FormData): File => {
  const entry = formData.get('file');
  if (!isFileLike(entry)) {
    throw badRequestError('Lore article image file is required.');
  }
  return entry;
};

export async function postHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  assertAuthenticated(ctx);
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'products.pages-cms',
      action: 'parseEditorialArticleImageUploadFormData',
    });
    throw badRequestError('Invalid multipart lore article image upload.');
  }

  const result = await uploadEcommercePagesCmsEditorialArticleImage({
    file: readEditorialArticleImageFile(formData),
  });

  return NextResponse.json({ ok: true, image: result });
}
