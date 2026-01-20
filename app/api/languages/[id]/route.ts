import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { getMongoDb } from "@/lib/db/mongo-client";

export const runtime = "nodejs";

const languageUpdateSchema = z.object({
  code: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  nativeName: z.string().trim().min(1).optional(),
  countryIds: z.array(z.string().trim().min(1)).optional(),
});

type LanguageCountryDoc = {
  countryId: string;
  country: {
    id: string;
    code: string;
    name: string;
  };
};

type LanguageDoc = {
  id: string;
  code: string;
  name: string;
  nativeName?: string | null;
  countries: LanguageCountryDoc[];
  createdAt: Date;
  updatedAt: Date;
};

const LANGUAGES_COLLECTION = "languages";

/**
 * PUT /api/languages/[id]
 * Updates language country assignments.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let languageId = "";
  try {
    const { id } = await params;
    languageId = id;
    if (!id) {
      const errorId = randomUUID();
      console.error("[languages][PUT] Missing language id", { errorId });
      return NextResponse.json(
        { error: "Language id is required", errorId },
        { status: 400 }
      );
    }
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      const errorId = randomUUID();
      console.error("[languages][PUT] Failed to parse JSON body", {
        errorId,
        error,
        languageId: id,
      });
      return NextResponse.json(
        { error: "Invalid JSON payload", errorId },
        { status: 400 }
      );
    }
    const data = languageUpdateSchema.parse(body);

    const provider = await getProductDataProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        return NextResponse.json(
          { error: "MongoDB is not configured." },
          { status: 500 }
        );
      }
      const mongo = await getMongoDb();
      const existingLang = await mongo
        .collection<LanguageDoc>(LANGUAGES_COLLECTION)
        .findOne({ id });

      if (!existingLang) {
        return NextResponse.json(
          { error: "Language not found." },
          { status: 404 }
        );
      }

      const updateFields: Partial<LanguageDoc> = {
        updatedAt: new Date(),
      };

      if (data.code) {
        updateFields.code = data.code.toUpperCase();
      }
      if (data.name) {
        updateFields.name = data.name;
      }
      if (data.nativeName !== undefined) {
        updateFields.nativeName = data.nativeName;
      }

      if (data.countryIds) {
        const uniqueIds = Array.from(new Set(data.countryIds));
        const countries: LanguageCountryDoc[] = [];

        if (uniqueIds.length > 0) {
          const countriesCollection = mongo.collection("countries");
          for (const countryId of uniqueIds) {
            const country = await countriesCollection.findOne({ id: countryId });
            if (country) {
              countries.push({
                countryId: country.id,
                country: {
                  id: country.id,
                  code: country.code,
                  name: country.name,
                },
              });
            }
          }
        }
        updateFields.countries = countries;
      }

      await mongo
        .collection<LanguageDoc>(LANGUAGES_COLLECTION)
        .updateOne({ id }, { $set: updateFields });

      const updated = await mongo
        .collection<LanguageDoc>(LANGUAGES_COLLECTION)
        .findOne({ id });

      return NextResponse.json(updated);
    }

    const language = await prisma.$transaction(async (tx) => {
      if (data.code || data.name || data.nativeName !== undefined) {
        await tx.language.update({
          where: { id },
          data: {
            ...(data.code && { code: data.code.toUpperCase() }),
            ...(data.name && { name: data.name }),
            ...(data.nativeName !== undefined && { nativeName: data.nativeName }),
          },
        });
      }

      if (data.countryIds) {
        const uniqueIds = Array.from(new Set(data.countryIds));
        const existing = await tx.country.findMany({
          where: { id: { in: uniqueIds } },
          select: { id: true },
        });
        const existingIds = new Set(existing.map((entry) => entry.id));
        const validIds = uniqueIds.filter((countryId) =>
          existingIds.has(countryId)
        );
        await tx.languageCountry.deleteMany({ where: { languageId: id } });
        if (validIds.length > 0) {
          await tx.languageCountry.createMany({
            data: validIds.map((countryId) => ({
              languageId: id,
              countryId,
            })),
          });
        }
      }

      return tx.language.findUnique({
        where: { id },
        include: {
          countries: {
            include: {
              country: true,
            },
          },
        },
      });
    });
    return NextResponse.json(language);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof z.ZodError) {
      console.warn("[languages][PUT] Invalid payload", {
        errorId,
        issues: error.flatten(),
        languageId,
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      console.error("[languages][PUT] Failed to update language", {
        errorId,
        message: error.message,
        languageId,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }
    console.error("[languages][PUT] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/languages/[id]
 * Deletes a language and its assignments.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let languageId = "";
  const errorId = randomUUID();
  try {
    const { id } = await params;
    languageId = id;
    if (!id) {
      console.error("[languages][DELETE] Missing language id", { errorId });
      return NextResponse.json(
        { error: "Language id is required", errorId },
        { status: 400 }
      );
    }

    const provider = await getProductDataProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        return NextResponse.json(
          { error: "MongoDB is not configured." },
          { status: 500 }
        );
      }
      const mongo = await getMongoDb();

      // Remove language from any catalogs that reference it
      await mongo.collection("catalogs").updateMany(
        { languageIds: id },
        { $pull: { languageIds: id } as any }
      );

      // Delete the language
      const result = await mongo
        .collection<LanguageDoc>(LANGUAGES_COLLECTION)
        .deleteOne({ id });

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: "Language not found.", errorId },
          { status: 404 }
        );
      }

      return new Response(null, { status: 204 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.languageCountry.deleteMany({ where: { languageId: id } });
      await tx.catalogLanguage.deleteMany({ where: { languageId: id } });
      await tx.language.delete({ where: { id } });
    });

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("[languages][DELETE] Failed to delete language", {
        errorId,
        message: error.message,
        languageId,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }
    console.error("[languages][DELETE] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}
