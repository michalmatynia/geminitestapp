export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import prisma from "@/shared/lib/db/prisma";
import { ObjectId } from "mongodb";

type BrowseParams = {
  collection: string;
  limit?: number;
  skip?: number;
  query?: string;
};

type BrowseResponse = {
  provider: "mongodb" | "prisma";
  collection: string;
  documents: Record<string, unknown>[];
  total: number;
  limit: number;
  skip: number;
};

async function browseMongoCollection(params: BrowseParams): Promise<BrowseResponse> {
  const db = await getMongoDb();
  const { collection, limit = 20, skip = 0, query } = params;

  const coll = db.collection(collection);

  // Parse query filter if provided
  let filter: Record<string, unknown> = {};
  if (query) {
    try {
      filter = JSON.parse(query) as Record<string, unknown>;
    } catch {
      // If not valid JSON, try text search on common fields
      filter = {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { title: { $regex: query, $options: "i" } },
          { _id: query },
        ],
      };
    }
  }

  const [documents, total] = await Promise.all([
    coll.find(filter).skip(skip).limit(limit).toArray(),
    coll.countDocuments(filter),
  ]);

  // Convert ObjectId and Date to strings for JSON serialization
  const serializedDocs = (documents as Record<string, unknown>[]).map((doc: Record<string, unknown>) => {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(doc)) {
      if (value instanceof ObjectId) {
        serialized[key] = value.toString();
      } else if (value instanceof Date) {
        serialized[key] = value.toISOString();
      } else if (Array.isArray(value)) {
        serialized[key] = (value as unknown[]).map((item: unknown) => {
          if (item instanceof ObjectId) {
            return item.toString();
          }
          return item;
        });
      } else {
        serialized[key] = value;
      }
    }
    return serialized;
  });

  return {
    provider: "mongodb",
    collection,
    documents: serializedDocs,
    total,
    limit,
    skip,
  };
}

async function browsePrismaCollection(params: BrowseParams): Promise<BrowseResponse> {
  const { collection, limit = 20, skip = 0, query } = params;

  // Get the Prisma model dynamically
  const modelName = collection.charAt(0).toLowerCase() + collection.slice(1);
  const model = (prisma as unknown as Record<string, {
    findMany: (args: unknown) => Promise<unknown[]>;
    count: (args: unknown) => Promise<number>;
  }>)[modelName];

  if (!model) {
    return {
      provider: "prisma",
      collection,
      documents: [],
      total: 0,
      limit,
      skip,
    };
  }

  // Build where clause if query provided
  let where: Record<string, unknown> = {};
      if (query) {
        try {
          where = JSON.parse(query) as Record<string, unknown>;
        } catch {
  
      // Try to search by common fields
      where = {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { title: { contains: query, mode: "insensitive" } },
          { id: query },
        ],
      };
    }
  }

  try {
    const [documents, total] = await Promise.all([
      model.findMany({
        where,
        skip,
        take: limit,
      }),
      model.count({ where }),
    ]);

    return {
      provider: "prisma",
      collection,
      documents: documents as Record<string, unknown>[],
      total,
      limit,
      skip,
    };
  } catch (error) {
    console.error(`[browse] Error querying ${collection}:`, error);
    return {
      provider: "prisma",
      collection,
      documents: [],
      total: 0,
      limit,
      skip,
    };
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const collection = searchParams.get("collection");
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const skip = parseInt(searchParams.get("skip") ?? "0", 10);
    const query = searchParams.get("query") ?? undefined;

    if (!collection) {
      return NextResponse.json(
        { error: "Collection parameter is required" },
        { status: 400 }
      );
    }

    const provider = await getAppDbProvider();

    const params: BrowseParams = { collection, limit, skip };
    if (query !== undefined) {
      params.query = query;
    }

    if (provider === "mongodb") {
      const result = await browseMongoCollection(params);
      return NextResponse.json(result);
    } else {
      const result = await browsePrismaCollection(params);
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("[api/databases/browse] Error:", error);
    return NextResponse.json(
      { error: "Failed to browse collection", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
