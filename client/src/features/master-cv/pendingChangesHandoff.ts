import type { PendingChange } from "@/features/editor/hooks/usePendingChanges";

type ServerPendingChange = Omit<PendingChange, "toolCallId">;

let pending: { cvId: string; changes: ServerPendingChange[] } | null = null;

export const pendingChangesHandoff = {
  set(cvId: string, changes: ServerPendingChange[]) {
    pending = { cvId, changes };
  },
  takeFor(cvId: string): ServerPendingChange[] {
    if (pending?.cvId !== cvId) return [];
    const out = pending.changes;
    pending = null;
    return out;
  },
};

export type { ServerPendingChange };
