import { NextResponse } from "next/server";
import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import prisma from "@/shared/lib/db/prisma";

type FieldInfo = {
  name: string;
  type: string;
  isRequired?: boolean;
  isId?: boolean;
  isUnique?: boolean;
  hasDefault?: boolean;
  relationTo?: string;
};

type CollectionSchema = {
  name: string;
  fields: FieldInfo[];
  relations?: string[];
};

type SchemaResponse = {
  provider: "mongodb" | "prisma";
  collections: CollectionSchema[];
};

// Prisma DMMF types for internal use
type DmmfField = {
  name: string;
  type: string;
  isRequired?: boolean;
  isId?: boolean;
  isUnique?: boolean;
  hasDefaultValue?: boolean;
  relationName?: string;
};

type DmmfModel = {
  name: string;
  fields: DmmfField[];
};

type DmmfDatamodel = {
  models: DmmfModel[];
};

async function getMongoSchema(): Promise<SchemaResponse> {
  const db = await getMongoDb();
  const collectionInfos = await db.listCollections().toArray();
  const collections: CollectionSchema[] = [];

  for (const info of collectionInfos) {
    const collName = info.name;
    if (collName.startsWith("system.")) continue;

    const coll = db.collection(collName);
    const sample = await coll.find({}).limit(10).toArray();

    const fieldTypes = new Map<string, Set<string>>();

    for (const doc of sample) {
      for (const [key, value] of Object.entries(doc)) {
        if (!fieldTypes.has(key)) {
          fieldTypes.set(key, new Set());
        }
        const typeSet = fieldTypes.get(key)!;
        if (value === null) {
          typeSet.add("null");
        } else if (Array.isArray(value)) {
          typeSet.add("array");
        } else if (value instanceof Date) {
          typeSet.add("date");
        } else if (
          typeof value === "object" &&
          (value as { constructor?: { name?: string } })?.constructor?.name === "ObjectId"
        ) {
          typeSet.add("ObjectId");
        } else {
          typeSet.add(typeof value);
        }
      }
    }

    const fields: FieldInfo[] = [];
    for (const [name, types] of fieldTypes) {
      const typeArray = Array.from(types);
      const fieldType =
        typeArray.length === 1 ? (typeArray[0] ?? "unknown") : typeArray.join(" | ");
      const fieldInfo: FieldInfo = {
        name,
        type: fieldType,
      };
      if (name === "_id") {
        fieldInfo.isId = true;
      }
      fields.push(fieldInfo);
    }

    // Sort fields: _id first, then alphabetically
    fields.sort((a: FieldInfo, b: FieldInfo) => {
      if (a.name === "_id") return -1;
      if (b.name === "_id") return 1;
      return a.name.localeCompare(b.name);
    });

    collections.push({ name: collName, fields });
  }

  collections.sort((a: CollectionSchema, b: CollectionSchema) => a.name.localeCompare(b.name));
  return { provider: "mongodb", collections };
}

function getPrismaSchema(): SchemaResponse {
  // @ts-expect-error - Accessing internal DMMF for schema introspection
  const dmmf = prisma._dmmf?.datamodel as DmmfDatamodel;
  const collections: CollectionSchema[] = [];

  if (dmmf?.models) {
    for (const model of dmmf.models) {
      const fields: FieldInfo[] = model.fields.map((field: DmmfField) => ({
        name: field.name,
        type: field.type,
        isRequired: field.isRequired,
        isId: field.isId,
        isUnique: field.isUnique,
        hasDefault: field.hasDefaultValue,
        relationTo: field.relationName,
      }));

      collections.push({
        name: model.name,
        fields,
      });
    }
  }

  collections.sort((a: CollectionSchema, b: CollectionSchema) => a.name.localeCompare(b.name));
  return { provider: "prisma", collections };
}

export async function GET() {
  try {
    const provider = await getAppDbProvider();

    if (provider === "mongodb") {
      const schema = await getMongoSchema();
      return NextResponse.json(schema);
    } else {
      const schema = getPrismaSchema();
      return NextResponse.json(schema);
    }
  } catch (error) {
    console.error("[api/databases/schema] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch schema", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
