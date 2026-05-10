import { type NextRequest, NextResponse } from 'next/server';

import {
  readEcommercePagesCmsLogo,
  uploadEcommercePagesCmsLogo,
} from '@/features/products/pages/ecommerce-pages-cms/ecommerce-pages-cms.server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError, badRequestError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const readOptionalString = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value.trim() : '';

const isFileLike = (entry: FormDataEntryValue | null): entry is File =>
  typeof entry === 'object' &&
  entry !== null &&
  'arrayBuffer' in entry &&
  'size' in entry &&
  'name' in entry;

const readLogoFile = (formData: FormData): File => {
  const entry = formData.get('file');
  if (!isFileLike(entry)) {
    throw badRequestError('Logo file is required.');
  }
  return entry;
};

const assertAuthenticated = (ctx: ApiHandlerContext): string => {
  const userId = ctx.userId?.trim() ?? '';
  if (userId.length === 0) {
    throw authError('Unauthorized.');
  }
  return userId;
};

export async function getHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  assertAuthenticated(ctx);
  return NextResponse.json({ ok: true, logo: await readEcommercePagesCmsLogo() });
}

export async function postHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  const userId = assertAuthenticated(ctx);
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'products.pages-cms',
      action: 'parseLogoUploadFormData',
    });
    throw badRequestError('Invalid multipart logo upload.');
  }

  const result = await uploadEcommercePagesCmsLogo({
    file: readLogoFile(formData),
    logoAlt: readOptionalString(formData.get('alt')),
    userId,
  });

  return NextResponse.json({ ok: true, logo: result });
}
