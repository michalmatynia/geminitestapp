import { NextResponse } from "next/server";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { decryptSecret, encryptSecret } from "@/lib/utils/encryption";
import { callBaseApi, fetchBaseInventories } from "@/lib/services/imports/base-client";
import { randomUUID } from "crypto";

type TestLogEntry = {
  step: string;
  status: "pending" | "ok" | "failed";
  timestamp: string;
  detail: string;
};

/**
 * POST /api/integrations/[id]/connections/[connectionId]/base/test
 * Tests the Base.com API connection by verifying the token and fetching inventories.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  let integrationId: string | null = null;
  let integrationConnectionId: string | null = null;
  const steps: TestLogEntry[] = [];

  const pushStep = (
    step: string,
    status: "pending" | "ok" | "failed",
    detail: string
  ) => {
    steps.push({
      step,
      status,
      detail,
      timestamp: new Date().toISOString(),
    });
  };

  const fail = (step: string, detail: string, status = 400) => {
    const errorId = randomUUID();
    const safeDetail = detail?.trim() ? detail : "Unknown error";
    pushStep(step, "failed", safeDetail);
    console.error("[integrations][connections][base][test] Failed", {
      errorId,
      integrationId,
      connectionId: integrationConnectionId,
      step,
      status,
      detail: safeDetail,
    });
    return NextResponse.json(
      {
        error: safeDetail,
        steps,
        errorId,
        integrationId,
        connectionId: integrationConnectionId,
      },
      { status }
    );
  };

  try {
    const { id, connectionId } = await params;
    integrationId = id;
    integrationConnectionId = connectionId;

    pushStep("Loading connection", "pending", "Fetching stored credentials");
    const repo = await getIntegrationRepository();
    const connection = await repo.getConnectionByIdAndIntegration(connectionId, id);

    if (!connection) {
      return fail("Loading connection", "Connection not found", 404);
    }
    pushStep("Loading connection", "ok", "Connection loaded");

    const integration = await repo.getIntegrationById(id);

    if (!integration) {
      return fail("Loading integration", "Integration not found", 404);
    }

    if (integration.slug !== "baselinker") {
      return fail(
        "Connection test",
        `This endpoint is for Base.com/Baselinker connections only. Got: ${integration.name}`,
        400
      );
    }

    // Get the Base API token - it can be stored either in baseApiToken field or password field
    let baseToken: string | null = null;

    if (connection.baseApiToken) {
      pushStep("Decrypting token", "pending", "Decrypting Base API token");
      try {
        baseToken = decryptSecret(connection.baseApiToken);
        pushStep("Decrypting token", "ok", "Base API token decrypted");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        pushStep("Decrypting token", "failed", `Failed to decrypt token: ${message}`);
      }
    }

    // Fallback: use password field if baseApiToken is not set
    if (!baseToken && connection.password) {
      pushStep("Using password as token", "pending", "Attempting to use password field as API token");
      try {
        baseToken = decryptSecret(connection.password);
        pushStep("Using password as token", "ok", "Password field used as API token");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return fail("Using password as token", `Failed to decrypt: ${message}`);
      }
    }

    if (!baseToken) {
      return fail("Token validation", "No Base API token configured for this connection");
    }

    // Test 1: Make a simple API call to verify the token works
    pushStep("Testing API connection", "pending", "Calling Base.com API");
    try {
      // Try to get inventories as a simple API test
      const inventories = await fetchBaseInventories(baseToken);
      pushStep(
        "Testing API connection",
        "ok",
        `API connection successful. Found ${inventories.length} inventory/inventories.`
      );

      // Store the token if it was from password field and not yet in baseApiToken
      if (!connection.baseApiToken) {
        pushStep("Storing token", "pending", "Saving API token to connection");
        try {
          await repo.updateConnection(connection.id, {
            baseApiToken: encryptSecret(baseToken),
            baseTokenUpdatedAt: new Date(),
          });
          pushStep("Storing token", "ok", "API token saved to connection");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          pushStep("Storing token", "failed", `Failed to save token: ${message}`);
        }
      } else {
        // Update the token timestamp
        await repo.updateConnection(connection.id, {
          baseTokenUpdatedAt: new Date(),
        });
      }

      // Store the first inventory ID as default if available
      if (inventories.length > 0 && !connection.baseLastInventoryId) {
        pushStep("Storing default inventory", "pending", "Setting default inventory");
        try {
          await repo.updateConnection(connection.id, {
            baseLastInventoryId: inventories[0].id,
          });
          pushStep(
            "Storing default inventory",
            "ok",
            `Default inventory set to: ${inventories[0].name} (${inventories[0].id})`
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          pushStep("Storing default inventory", "failed", `Failed to set default: ${message}`);
        }
      }

      // Return success with inventory information
      return NextResponse.json({
        ok: true,
        steps,
        inventories: inventories.map((inv) => ({ id: inv.id, name: inv.name })),
        inventoryCount: inventories.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return fail("Testing API connection", `Base.com API error: ${message}`);
    }
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      pushStep("Unexpected error", "failed", error.message);
      console.error("[integrations][connections][base][test] Unexpected error", {
        errorId,
        integrationId,
        connectionId: integrationConnectionId,
        message: error.message,
      });
      return NextResponse.json(
        {
          error: error.message,
          steps,
          errorId,
          integrationId,
          connectionId: integrationConnectionId,
        },
        { status: 400 }
      );
    }
    pushStep("Unexpected error", "failed", "Failed to test connection");
    console.error("[integrations][connections][base][test] Unknown error", {
      errorId,
      integrationId,
      connectionId: integrationConnectionId,
      error,
    });
    return NextResponse.json(
      {
        error: "Failed to test connection",
        steps,
        errorId,
        integrationId,
        connectionId: integrationConnectionId,
      },
      { status: 500 }
    );
  }
}
