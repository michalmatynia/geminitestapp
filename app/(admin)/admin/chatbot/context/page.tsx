"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

export default function ChatbotContextPage() {
  const { toast } = useToast();
  const [globalContext, setGlobalContext] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadContext = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) {
          const error = (await res.json()) as { error?: string };
          throw new Error(error.error || "Failed to load context.");
        }
        const data = (await res.json()) as Array<{ key: string; value: string }>;
        const stored = data.find((item) => item.key === "chatbot_global_context");
        if (isMounted) {
          setGlobalContext(stored?.value || "");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load context.";
        toast(message, { variant: "error" });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void loadContext();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/chatbot" aria-label="Back to chatbot">
            <ChevronLeftIcon className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">Chatbot Context</h1>
          <p className="text-sm text-gray-400">
            Define global instructions applied to every chat.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
        <Textarea
          placeholder="Add system-wide guidance for the assistant..."
          value={globalContext}
          onChange={(event) => setGlobalContext(event.target.value)}
          rows={6}
          disabled={loading}
        />
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            onClick={async () => {
              setSaving(true);
              try {
                const res = await fetch("/api/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    key: "chatbot_global_context",
                    value: globalContext,
                  }),
                });
                if (!res.ok) {
                  const error = (await res.json()) as { error?: string };
                  throw new Error(error.error || "Failed to save context.");
                }
                toast("Global context saved", { variant: "success" });
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : "Failed to save context.";
                toast(message, { variant: "error" });
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || loading}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
