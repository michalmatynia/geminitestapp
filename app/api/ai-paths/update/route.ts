import { NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/lib/api/api-handler";
import { parseJsonBody } from "@/lib/api/parse-json";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError, notFoundError, validationError } from "@/lib/errors/app-error";
import { productUpdateSchema } from "@/lib/validations/product";
import { noteUpdateSchema } from "@/lib/validations/notes";
import { getProductRepository } from "@/lib/services/product-repository";
import { noteService } from "@/lib/services/noteService/index";
import { removeUndefined } from "@/lib/utils";

const updateSchema = z.object({
  entityType: z.enum(["product", "note", "custom"]),
  entityId: z.string().trim().optional(),
  updates: z.record(z.any()).optional(),
  mode: z.enum(["replace", "append"]).optional(),
});

const mergeAppendValue = (current: unknown, next: unknown): unknown => {
  if (next === undefined) return undefined;
  if (current === undefined || current === null) return next;
  if (Array.isArray(current)) {
    const currentArr = current as unknown[];
    if (Array.isArray(next)) {
      return [...currentArr, ...(next as unknown[])];
    }
    return [...currentArr, next];
  }
  if (typeof current === "string" && typeof next === "string") {
    if (!current) return next;
    if (!next) return current;
    return `${current}\n${next}`;
  }
  if (
    current &&
    typeof current === "object" &&
    next &&
    typeof next === "object" &&
    !Array.isArray(next)
  ) {
    return { ...(current as Record<string, unknown>), ...(next as Record<string, unknown>) };
  }
  return next;
};

const applyAppendMode = (
  updates: Record<string, unknown>,
  current: Record<string, unknown>
) => {
  const next: Record<string, unknown> = {};
  Object.entries(updates).forEach(([key, value]) => {
    next[key] = mergeAppendValue(current[key], value);
  });
  return next;
};

async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, updateSchema, {
      logPrefix: "ai-paths.update",
    });
    if (!parsed.ok) return parsed.response;

    const { entityType, entityId, updates, mode } = parsed.data;
    const normalizedUpdates =
      updates && typeof updates === "object" ? (updates as Record<string, unknown>) : {};

    if (Object.keys(normalizedUpdates).length === 0) {
      throw badRequestError("No updates provided");
    }

    if (entityType !== "custom" && !entityId?.trim()) {
      throw badRequestError("Entity id is required");
    }

    if (entityType === "custom") {
      return NextResponse.json({
        ok: true,
        entityType,
        entityId: entityId ?? null,
        updates: normalizedUpdates,
        note: "Custom entities are not persisted yet.",
      });
    }

    if (entityType === "product") {
      const productRepository = await getProductRepository();
      const existing =
        mode === "append" ? await productRepository.getProductById(entityId as string) : null;
      if (mode === "append" && !existing) {
        throw notFoundError("Product not found", { productId: entityId });
      }
      const prepared =
        mode === "append" && existing
          ? applyAppendMode(normalizedUpdates, existing as Record<string, unknown>)
          : normalizedUpdates;
      const validated = productUpdateSchema.safeParse(prepared);
      if (!validated.success) {
        throw validationError("Invalid product update", {
          issues: validated.error.flatten(),
        });
      }
      const updateData = removeUndefined(validated.data);
      if (Object.keys(updateData).length === 0) {
        throw badRequestError("No valid product fields to update");
      }
      const updated = await productRepository.updateProduct(
        entityId as string,
        updateData
      );
      if (!updated) {
        throw notFoundError("Product not found", { productId: entityId });
      }
      return NextResponse.json({
        ok: true,
        entityType,
        entityId,
        updates: updateData,
      });
    }

    if (entityType === "note") {
      const existing =
        mode === "append" ? await noteService.getById(entityId as string) : null;
      if (mode === "append" && !existing) {
        throw notFoundError("Note not found", { noteId: entityId });
      }
      const prepared =
        mode === "append" && existing
          ? applyAppendMode(normalizedUpdates, existing as Record<string, unknown>)
          : normalizedUpdates;
      const validated = noteUpdateSchema.safeParse(prepared);
      if (!validated.success) {
        throw validationError("Invalid note update", {
          issues: validated.error.flatten(),
        });
      }
      const updateData = removeUndefined(validated.data);
      if (Object.keys(updateData).length === 0) {
        throw badRequestError("No valid note fields to update");
      }
      const updated = await noteService.update(entityId as string, updateData);
      if (!updated) {
        throw notFoundError("Note not found", { noteId: entityId });
      }
      return NextResponse.json({
        ok: true,
        entityType,
        entityId,
        updates: updateData,
      });
    }

    throw badRequestError("Unsupported entity type");
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.update",
      fallbackMessage: "Failed to update entity",
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "ai-paths.update" });
