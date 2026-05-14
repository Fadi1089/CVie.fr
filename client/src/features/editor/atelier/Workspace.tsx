import { useEffect, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  cvDataSchema,
  themeRegistry,
  getTheme,
  type CvData,
  type AtsMode,
} from "@cvie/shared";
import { TocRail, type SectionId } from "./TocRail";
import { PreviewPane } from "./PreviewPane";
import { ExportBar } from "./ExportBar";
import { SectionRouter } from "./forms/SectionRouter";
import { CustomizationPanel } from "../customization/CustomizationPanel";

type Props = {
  cv: CvData;
  onPatch: (patch: Partial<CvData>) => void;
  onExport: (opts: {
    themeId: string;
    atsMode: AtsMode;
    customization: Record<string, unknown>;
  }) => void | Promise<void>;
};

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "personal", label: "Informations personnelles" },
  { id: "formations", label: "Formation" },
  { id: "experiences", label: "Expériences" },
  { id: "skills", label: "Compétences" },
  { id: "languages", label: "Langues" },
  { id: "interests", label: "Intérêts" },
];

export function Workspace({ cv, onPatch, onExport }: Props) {
  const methods = useForm<CvData>({
    defaultValues: cv,
    resolver: zodResolver(cvDataSchema),
    mode: "onBlur",
  });

  const watched = useWatch({ control: methods.control });

  const [active, setActive] = useState<SectionId>("personal");
  const [savedSection, setSavedSection] = useState<SectionId | null>(null);
  const [themeId, setThemeId] = useState<string>("atelier-classique");
  const [atsMode, setAtsMode] = useState<AtsMode>("ats-balanced");
  const [exporting, setExporting] = useState(false);
  const [customization, setCustomization] = useState<Record<string, unknown>>(
    () => {
      const t = getTheme(themeId);
      return { ...(t?.meta.defaultCustomization ?? {}) };
    },
  );

  useEffect(() => {
    const t = getTheme(themeId);
    setCustomization({ ...(t?.meta.defaultCustomization ?? {}) });
  }, [themeId]);

  useEffect(() => {
    if (!methods.formState.isDirty) return;
    onPatch(watched as Partial<CvData>);
    setSavedSection(active);
    const id = setTimeout(() => setSavedSection(null), 8_000);
    return () => clearTimeout(id);
  }, [watched, active, methods.formState.isDirty, onPatch]);

  const themes = themeRegistry.map((t) => t.meta);

  return (
    <FormProvider {...methods}>
      <div className="atelier-canvas h-screen w-screen flex bg-[var(--atelier-paper)] text-[var(--atelier-ink)]">
        <TocRail
          sections={SECTIONS}
          active={active}
          onSelect={setActive}
          savedSection={savedSection}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <ExportBar
            themes={themes}
            activeThemeId={themeId}
            atsMode={atsMode}
            onThemeChange={setThemeId}
            onAtsModeChange={setAtsMode}
            exporting={exporting}
            onExport={async () => {
              setExporting(true);
              try {
                await onExport({ themeId, atsMode, customization });
              } finally {
                setExporting(false);
              }
            }}
          />
          <div className="flex-1 grid grid-cols-[1fr_minmax(340px,440px)] min-h-0">
            <main className="overflow-y-auto px-10 py-10">
              <SectionRouter active={active} />
            </main>
            <div className="flex flex-col min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <PreviewPane
                  cv={(watched as CvData) ?? cv}
                  themeId={themeId}
                  atsMode={atsMode}
                  customization={customization}
                />
              </div>
              {(() => {
                const t = getTheme(themeId);
                return t ? (
                  <CustomizationPanel
                    theme={t.meta}
                    value={customization}
                    onChange={setCustomization}
                  />
                ) : null;
              })()}
            </div>
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
