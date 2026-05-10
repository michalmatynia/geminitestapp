import { type NextRequest, NextResponse } from 'next/server';

import { uploadEcommercePagesCmsManifestoBackground } from '@/features/products/pages/ecommerce-pages-cms/ecommerce-pages-cms.server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError, badRequestError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const assertAuthenticated = (ctx: ApiHandlerContext): void => {
  const userId = ctx.userId?.trim() ?? '';
  if (userId.length === 0) {
    throw authError('Unauthorized.');
  }
};

const isFileLike = (entry: FormDataEntryValue | null): entry is File =>
  typeof entry === 'object' &&
  entry !== null &&
  'arrayBuffer' in entry &&
  'size' in entry &&
  'name' in entry;

const readBackgroundFile = (formData: FormData): File => {
  const entry = formData.get('file');
  if (!isFileLike(entry)) {
    throw badRequestError('Collector Creed background image is required.');
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
      action: 'parseManifestoBackgroundFormData',
    });
    throw badRequestError('Invalid multipart Collector Creed background upload.');
  }

  const image = await uploadEcommercePagesCmsManifestoBackground({
    file: readBackgroundFile(formData),
  });

  return NextResponse.json({ ok: true, image });
}
