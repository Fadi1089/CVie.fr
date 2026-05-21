import { useEffect, useRef, useState } from "react";
import { useAuthApi } from "@/features/auth/hooks/useAuthApi";

export function useAiInstructions() {
  const { fetch } = useAuthApi();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "error">("loading");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");

  useEffect(() => {
    fetch("/api/v1/ai-instructions")
      .then((r) => r.json())
      .then((data: { text: string }) => {
        setText(data.text);
        lastSaved.current = data.text;
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  }, [fetch]);

  const save = async (next: string) => {
    setStatus("saving");
    try {
      const res = await fetch("/api/v1/ai-instructions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: next }),
      });
      if (!res.ok) throw new Error("save failed");
      const data = (await res.json()) as { text: string };
      lastSaved.current = data.text;
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const update = (next: string) => {
    const trimmed = next.slice(0, 4000);
    setText(trimmed);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (trimmed !== lastSaved.current) save(trimmed);
    }, 1000);
  };

  const flush = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text !== lastSaved.current) return save(text);
  };

  return { text, status, update, flush };
}
