import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { useMasterCv } from "../hooks/useMasterCv";
import { useMasterCvDraft } from "../hooks/useMasterCvDraft";
import { createEmptyMaster, type MasterCvData } from "@cvie/shared";

export function MasterCvEditor() {
  const { isAuthenticated, isLoading } = useAuth0();
  const navigate = useNavigate();
  const { state, setData } = useMasterCv();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/", { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  if (state.phase === "loading" || isLoading) {
    return <div className="px-6 py-10 text-sm text-[var(--color-ink-soft)]">Chargement…</div>;
  }
  if (state.phase === "error") {
    return <div className="px-6 py-10 text-sm text-red-600">{state.error}</div>;
  }
  if (state.phase === "needs-seed") {
    return <Editor initial={createEmptyMaster()} onCreate={setData} />;
  }
  return <Editor initial={state.data} onCreate={setData} />;
}

function Editor({
  initial,
  onCreate: _onCreate, // wired in later tasks
}: {
  initial: MasterCvData;
  onCreate: (d: MasterCvData) => void;
}) {
  const { data, status, update } = useMasterCvDraft(initial);
  void update; // update wired in later tasks
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Mon Master CV</h1>
        <span className="text-xs text-[var(--color-ink-soft)]">
          {status === "saving" ? "Enregistrement…" : status === "offline" ? "Hors-ligne" : "Enregistré"}
        </span>
      </header>
      <pre className="mt-6 text-xs">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
