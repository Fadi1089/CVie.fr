import { useRef, useState } from "react";
import type { AiProvider } from "@cvie/shared";
import { useAuthApi } from "@/features/auth/hooks/useAuthApi";
import {
  pendingChangesHandoff,
  type ServerPendingChange,
} from "../pendingChangesHandoff";

export type TailorEvent = { name: string; summary: string };

type TailorPhase = "idle" | "streaming" | "done" | "error";

type TailorStartArgs = {
  title: string;
  templateId: string;
  folderId?: string;
  jdText: string;
  provider: AiProvider;
  model: string;
};

type SseEvent =
  | { type: "tool"; name: string; result: { ok: boolean; summary?: string; error?: string } }
  | { type: "done"; cvId: string; pendingChanges: ServerPendingChange[] }
  | { type: "error"; code: string; message?: string };

export function useMasterCvTailor() {
  const { fetch: authFetch } = useAuthApi();
  const [events, setEvents] = useState<TailorEvent[]>([]);
  const [cvId, setCvId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<TailorPhase>("idle");
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const phaseRef = useRef<TailorPhase>("idle");

  const start = async (req: TailorStartArgs) => {
    if (phaseRef.current === "streaming") return;
    cancelledRef.current = false;
    phaseRef.current = "streaming";
    setEvents([]);
    setCvId(null);
    setError(null);
    setPhase("streaming");
    abortRef.current = new AbortController();
    const res = await authFetch("/api/v1/master-cv/tailor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: abortRef.current.signal,
    });
    if (cancelledRef.current) return;
    if (!res.ok || !res.body) {
      phaseRef.current = "error";
      setPhase("error");
      setError(`HTTP ${res.status}`);
      return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (cancelledRef.current) return;
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const blocks = buf.split("\n\n");
      buf = blocks.pop() ?? "";
      for (const block of blocks) {
        if (cancelledRef.current) return;
        const m = block.match(/^data: (.+)$/m);
        if (!m) continue;
        const evt = JSON.parse(m[1]!) as SseEvent;
        if (evt.type === "tool" && evt.result.ok) {
          setEvents((es) => [...es, { name: evt.name, summary: evt.result.summary ?? "" }]);
        } else if (evt.type === "done") {
          phaseRef.current = "done";
          setCvId(evt.cvId);
          setPhase("done");
          pendingChangesHandoff.set(evt.cvId, evt.pendingChanges);
        } else if (evt.type === "error") {
          phaseRef.current = "error";
          setError(evt.message ?? evt.code);
          setPhase("error");
        }
      }
    }
  };

  const cancel = () => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    phaseRef.current = "idle";
    setPhase("idle");
  };

  return { events, cvId, error, phase, start, cancel };
}
