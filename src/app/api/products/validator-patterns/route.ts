export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/features/products/constants';
import { getValidationPatternRepository } from '@/features/products/server';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

const replacementFieldSchema = z.enum(PRODUCT_VALIDATION_REPLACEMENT_FIELDS);

const createPatternSchema = z.object({
  label: z.string().trim().min(1, 'Label is required'),
  target: z.enum(['name', 'description']),
  locale: z.string().trim().nullable().optional(),
  regex: z.string().min(1, 'Regex is required'),
  flags: z.string().trim().nullable().optional(),
  message: z.string().trim().min(1, 'Message is required'),
  severity: z.enum(['error', 'warning']).optional(),
  enabled: z.boolean().optional(),
  replacementEnabled: z.boolean().optional(),
  replacementValue: z.string().trim().nullable().optional(),
  replacementFields: z.array(replacementFieldSchema).optional(),
});

const assertValidRegex = (regexSource: string, flags: string | null | undefined): void => {
  try {
    const normalizedFlags = flags?.trim() || undefined;
    // Compile once on write to avoid persisting invalid rules.
    void new RegExp(regexSource, normalizedFlags);
  } catch (error) {
    throw badRequestError('Invalid regex or flags', {
      regex: regexSource,
      flags: flags ?? null,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
};

const normalizeReplacementFields = (fields: string[] | undefined): string[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  return [...new Set(fields)];
};

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const repository = await getValidationPatternRepository();
  const patterns = await repository.listPatterns();
  return NextResponse.json(patterns);
}

async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as z.infer<typeof createPatternSchema>;
  const label = body.label.trim();
  const locale = body.locale?.trim().toLowerCase() || null;
  const regex = body.regex.trim();
  const flags = body.flags?.trim() || null;
  const message = body.message.trim();
  const replacementEnabled = body.replacementEnabled ?? false;
  const replacementValue = body.replacementValue?.trim() || null;
  const replacementFields = normalizeReplacementFields(body.replacementFields);
  if (replacementEnabled && !replacementValue) {
    throw badRequestError('replacementValue is required when replacementEnabled is true');
  }

  assertValidRegex(regex, flags);

  const repository = await getValidationPatternRepository();
  const pattern = await repository.createPattern({
    label,
    target: body.target,
    locale,
    regex,
    flags,
    message,
    severity: body.severity ?? 'error',
    enabled: body.enabled ?? true,
    replacementEnabled,
    replacementValue,
    replacementFields,
  });

  return NextResponse.json(pattern, { status: 201 });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  {
    source: 'products.validator-patterns.GET',
    cacheControl: 'no-store',
  },
);

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  {
    source: 'products.validator-patterns.POST',
    parseJsonBody: true,
    bodySchema: createPatternSchema,
  },
);
