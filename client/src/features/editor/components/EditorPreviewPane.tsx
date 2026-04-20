import { useEffect, useRef, useState } from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { cvDataSchema, renderCvHtml, type CvData, type TemplateId } from "@cvie/shared";
import { cn } from "@/lib/utils";
import { useAutofillSyncContext } from "../hooks/useAutofillSync";

type Props = {
  templateId: TemplateId;
};

type PreviewPhase = "idle" | "rendering" | "ready" | "error";

const MAX_IFRAME_HEIGHT_PX = 20_000;
const MIN_IFRAME_HEIGHT_PX = 297 * 3.78;
const AUTO_REFRESH_DEBOUNCE_MS = 300;

function Spinner({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/20 border-t-current",
        className,
      )}
    />
  );
}

function firstValidationMessage(values: CvData): string {
  const parsed = cvDataSchema.safeParse(values);
  if (parsed.success) return "";
  return parsed.error.issues[0]?.message ?? "Vérifiez les champs du CV.";
}

export function EditorPreviewPane({ templateId }: Props) {
  const { getValues, control } = useFormContext<CvData>();
  const { isDirty } = useFormState({ control });
  const autofillSync = useAutofillSyncContext();
  const watchedValues = useWatch({ control });
  const [html, setHtml] = useState<string | null>(null);
  const [phase, setPhase] = useState<PreviewPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(MIN_IFRAME_HEIGHT_PX);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    setMessage(null);
  }, [templateId]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== "null" && e.origin !== "") return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data as { type?: string; height?: number };
      if (data?.type !== "cv-height") return;
      if (typeof data.height !== "number" || !Number.isFinite(data.height)) {
        return;
      }
      const next = Math.max(
        MIN_IFRAME_HEIGHT_PX,
        Math.min(data.height, MAX_IFRAME_HEIGHT_PX),
      );
      setIframeHeight((prev) => (prev === next ? prev : next));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      autofillSync?.syncAll();
      const values = getValues();
      const parsed = cvDataSchema.safeParse(values);

      if (!parsed.success) {
        setPhase("error");
        setMessage(firstValidationMessage(values));
        return;
      }

      try {
        const rendered = renderCvHtml(parsed.data, templateId);
        setHtml((prev) => {
          if (prev !== rendered) {
            queueMicrotask(() => setPhase("rendering"));
          }
          return prev === rendered ? prev : rendered;
        });
        setMessage(null);
      } catch (err) {
        console.error("[EditorPreviewPane] renderCvHtml threw:", err);
        setPhase("error");
        setMessage(
          "Une erreur est survenue pendant le rendu. Réessayez après votre prochaine modification.",
        );
      }
    }, AUTO_REFRESH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [watchedValues, templateId, autofillSync, getValues, isDirty]);

  useEffect(() => {
    if (phase !== "rendering" || !html) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => setPhase("ready");
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [phase, html]);

  const statusText =
    phase === "rendering"
      ? "Rendu en cours…"
      : phase === "ready"
        ? "Aperçu à jour"
        : phase === "error"
          ? "Aperçu figé"
          : "En attente de vos informations";

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono-caps text-[10px] text-[var(--color-ink-soft)]">
            Aperçu
          </p>
          <p className="text-[11px] text-[var(--color-ink-soft)]">{statusText}</p>
        </div>
        {phase === "rendering" ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-rule)] bg-white/80 px-3 py-1 text-[11px] text-[var(--color-ink-soft)] shadow-sm backdrop-blur">
            <Spinner />
            Mise à jour
          </div>
        ) : null}
      </div>

      <div className="relative flex-1 overflow-auto rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-deep)]">
        {html ? (
          <>
            <iframe
              ref={iframeRef}
              srcDoc={html}
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              aria-label="Aperçu du CV"
              title="Aperçu du CV"
              style={{ height: `${iframeHeight}px`, pointerEvents: "none" }}
              className="block w-full border-0 bg-white"
            />

            {phase === "error" && message ? (
              <div className="absolute inset-x-4 bottom-4 rounded-xl border border-amber-500/30 bg-amber-50/95 px-4 py-3 text-[12px] text-amber-900 shadow-sm backdrop-blur">
                <p className="font-medium">Aperçu temporairement gelé</p>
                <p className="mt-1 text-amber-900/80">{message}</p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex h-full min-h-[420px] items-center justify-center px-6 text-center">
            <div className="max-w-[24rem] space-y-3">
              {phase === "rendering" ? (
                <div className="mx-auto flex w-fit items-center gap-3 rounded-full border border-[var(--color-rule)] bg-white/80 px-4 py-2 text-[12px] text-[var(--color-ink-soft)] shadow-sm">
                  <Spinner />
                  Analyse et rendu du CV…
                </div>
              ) : null}
              <p className="text-[13px] text-[var(--color-ink-soft)]">
                {message ?? "Remplissez vos informations — l'aperçu se met à jour automatiquement."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
