import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/db/mongo-client";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!process.env.MONGODB_URI) {
      // If no MongoDB, we just skip this part or return success if we don't want to block
      return NextResponse.json({ success: true, message: "MongoDB not configured, skipping." });
    }
    
    const mongo = await getMongoDb();
    const collection = mongo.collection("ai_configurations");
    
    const result = await collection.updateOne(
      { type: "description_config" },
      { 
        $set: { 
          ...data,
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, id: result.upsertedId });
  } catch (error) {
    console.error("Failed to save AI configuration to MongoDB:", error);
    return NextResponse.json({ error: "Failed to save to MongoDB" }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ error: "MongoDB not configured" }, { status: 404 });
    }
    const mongo = await getMongoDb();
    const config = await mongo.collection("ai_configurations").findOne({ type: "description_config" });
    if (!config) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to fetch AI configuration from MongoDB:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
