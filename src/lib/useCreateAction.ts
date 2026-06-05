"use client";

import { useCallback } from "react";
import { useStore } from "@/store/useStore";

export interface NewActionInput {
  title: string;
  priority?: string;
  targetKpi?: string;
  notes?: string;
  status?: string;
}

export interface CreateActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

/**
 * "Close the loop" — create an Action Plan page in Notion from the UI.
 * Uses the Notion token + Action DB id stored in settings. Returns a clear
 * result so callers can show success/needs-config/error states.
 */
export function useCreateAction() {
  const { notionToken, actionDbId } = useStore();
  const canCreate = !!notionToken && !!actionDbId;

  const createAction = useCallback(
    async (input: NewActionInput): Promise<CreateActionResult> => {
      if (!notionToken || !actionDbId) {
        return {
          success: false,
          error: "Configure the Notion token and Action Plans DB ID in Settings.",
        };
      }
      try {
        const res = await fetch("/api/notion/create-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: notionToken, actionDbId, ...input }),
        });
        const data = await res.json();
        return data?.success
          ? { success: true, id: data.id, url: data.url }
          : { success: false, error: data?.error || "Failed" };
      } catch (e: any) {
        return { success: false, error: e?.message || "Network error" };
      }
    },
    [notionToken, actionDbId]
  );

  return { createAction, canCreate };
}
