import { useState } from "react";
import type { MasterCvData, MasterExperience } from "@cvie/shared";
import type { CvData } from "@cvie/shared";

// ---------------------------------------------------------------------------
// Selection state
// ---------------------------------------------------------------------------

interface Selection {
  summaryId: string | null;
  experiences: Set<string>;
  achievementsByExp: Map<string, Set<number>>;
  formations: Set<string>;
  skills: Set<string>;
  languages: Set<string>;
  interests: Set<string>;
}

function emptySelection(): Selection {
  return {
    summaryId: null,
    experiences: new Set(),
    achievementsByExp: new Map(),
    formations: new Set(),
    skills: new Set(),
    languages: new Set(),
    interests: new Set(),
  };
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function assemble(master: MasterCvData, sel: Selection): CvData {
  const summary =
    sel.summaryId
      ? master.summaries.find((s) => s.id === sel.summaryId)?.text ?? ""
      : "";
  return {
    personalInfo: { ...master.personalInfo, summary: summary || master.personalInfo.summary },
    experiences: master.experiences
      .filter((e) => sel.experiences.has(e.id))
      .map((e) => ({
        id: `exp_${crypto.randomUUID()}`,
        jobTitle: e.jobTitle,
        company: e.company,
        city: e.city,
        startDate: e.startDate,
        endDate: e.endDate,
        bullets: e.achievements.filter((_, i) => sel.achievementsByExp.get(e.id)?.has(i)),
        description: e.description,
      })),
    formations: master.formations
      .filter((f) => sel.formations.has(f.id))
      .map((f) => ({
        id: `form_${crypto.randomUUID()}`,
        degree: f.degree,
        school: f.school,
        city: f.city,
        startDate: f.startDate,
        endDate: f.endDate,
        description: f.description,
      })),
    skills: master.skills
      .filter((s) => sel.skills.has(s.id))
      .map((s) => ({
        id: `sk_${crypto.randomUUID()}`,
        name: s.name,
        level: s.level,
        category: s.category,
      })),
    languages: master.languages
      .filter((l) => sel.languages.has(l.id))
      .map((l) => ({
        id: `lng_${crypto.randomUUID()}`,
        name: l.name,
        level: l.level,
      })),
    interests: master.interests
      .filter((i) => sel.interests.has(i.id))
      .map((i) => ({
        id: `int_${crypto.randomUUID()}`,
        name: i.name,
      })),
    themeId: "community-stackoverflow",
    customization: {},
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MasterCvPicker({
  master,
  onCancel,
  onCreate,
}: {
  master: MasterCvData;
  onCancel: () => void;
  onCreate: (cv: CvData) => void;
}) {
  const [sel, setSel] = useState<Selection>(emptySelection);

  // Toggle helpers
  function toggleSet(
    key: "experiences" | "formations" | "skills" | "languages" | "interests",
    id: string,
  ) {
    setSel((prev) => {
      const next = { ...prev, [key]: new Set(prev[key]) };
      if (next[key].has(id)) next[key].delete(id);
      else next[key].add(id);
      return next;
    });
  }

  function toggleAchievement(expId: string, idx: number) {
    setSel((prev) => {
      const byExp = new Map(prev.achievementsByExp);
      const indices = new Set(byExp.get(expId) ?? []);
      if (indices.has(idx)) indices.delete(idx);
      else indices.add(idx);
      byExp.set(expId, indices);
      return { ...prev, achievementsByExp: byExp };
    });
  }

  function setSummary(id: string) {
    setSel((prev) => ({ ...prev, summaryId: prev.summaryId === id ? null : id }));
  }

  // Disable Créer when no experience AND no skill selected
  const canCreate = sel.experiences.size > 0 || sel.skills.size > 0;

  function handleCreate() {
    onCreate(assemble(master, sel));
  }

  return (
    <div
      role="dialog"
      aria-label="Sélectionner depuis le Master CV"
      className="flex flex-col gap-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-6"
    >
      <h2 className="font-display text-lg text-[var(--color-ink)]">
        Créer un CV depuis le Master
      </h2>

      {/* Summaries */}
      {master.summaries.length > 0 && (
        <details open>
          <summary className="cursor-pointer select-none font-mono text-xs tracking-[0.18em] text-[var(--color-ink-soft)] uppercase">
            Accroche
          </summary>
          <ul className="mt-2 flex flex-col gap-1 pl-2">
            {master.summaries.map((s) => (
              <li key={s.id}>
                <label
                  htmlFor={`sum-${s.id}`}
                  className="flex items-start gap-2 text-sm text-[var(--color-ink)]"
                >
                  <input
                    type="radio"
                    id={`sum-${s.id}`}
                    name="summary"
                    checked={sel.summaryId === s.id}
                    onChange={() => setSummary(s.id)}
                    className="mt-0.5"
                  />
                  <span>{s.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Experiences */}
      {master.experiences.length > 0 && (
        <details open>
          <summary className="cursor-pointer select-none font-mono text-xs tracking-[0.18em] text-[var(--color-ink-soft)] uppercase">
            Expériences —{" "}
            <span>
              {sel.experiences.size} / {master.experiences.length} sélectionnée
              {sel.experiences.size > 1 ? "s" : ""}
            </span>
          </summary>
          <ul className="mt-2 flex flex-col gap-3 pl-2">
            {master.experiences.map((exp) => (
              <ExperienceRow
                key={exp.id}
                exp={exp}
                checked={sel.experiences.has(exp.id)}
                achievementSet={sel.achievementsByExp.get(exp.id) ?? new Set()}
                onToggle={() => toggleSet("experiences", exp.id)}
                onToggleAchievement={(i) => toggleAchievement(exp.id, i)}
              />
            ))}
          </ul>
        </details>
      )}

      {/* Formations */}
      {master.formations.length > 0 && (
        <details open>
          <summary className="cursor-pointer select-none font-mono text-xs tracking-[0.18em] text-[var(--color-ink-soft)] uppercase">
            Formations
          </summary>
          <ul className="mt-2 flex flex-col gap-1 pl-2">
            {master.formations.map((f) => (
              <li key={f.id}>
                <label
                  htmlFor={`form-${f.id}`}
                  className="flex items-center gap-2 text-sm text-[var(--color-ink)]"
                >
                  <input
                    type="checkbox"
                    id={`form-${f.id}`}
                    checked={sel.formations.has(f.id)}
                    onChange={() => toggleSet("formations", f.id)}
                  />
                  {f.degree}{f.school ? `, ${f.school}` : ""}
                </label>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Skills */}
      {master.skills.length > 0 && (
        <details open>
          <summary className="cursor-pointer select-none font-mono text-xs tracking-[0.18em] text-[var(--color-ink-soft)] uppercase">
            Compétences —{" "}
            <span>
              {sel.skills.size} / {master.skills.length} sélectionnée
              {sel.skills.size > 1 ? "s" : ""}
            </span>
          </summary>
          <ul className="mt-2 flex flex-wrap gap-2 pl-2">
            {master.skills.map((s) => (
              <li key={s.id}>
                <label
                  htmlFor={`sk-${s.id}`}
                  className="flex items-center gap-1.5 text-sm text-[var(--color-ink)]"
                >
                  <input
                    type="checkbox"
                    id={`sk-${s.id}`}
                    checked={sel.skills.has(s.id)}
                    onChange={() => toggleSet("skills", s.id)}
                  />
                  {s.name}
                </label>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Languages */}
      {master.languages.length > 0 && (
        <details open>
          <summary className="cursor-pointer select-none font-mono text-xs tracking-[0.18em] text-[var(--color-ink-soft)] uppercase">
            Langues
          </summary>
          <ul className="mt-2 flex flex-col gap-1 pl-2">
            {master.languages.map((l) => (
              <li key={l.id}>
                <label
                  htmlFor={`lng-${l.id}`}
                  className="flex items-center gap-2 text-sm text-[var(--color-ink)]"
                >
                  <input
                    type="checkbox"
                    id={`lng-${l.id}`}
                    checked={sel.languages.has(l.id)}
                    onChange={() => toggleSet("languages", l.id)}
                  />
                  {l.name}
                </label>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Interests */}
      {master.interests.length > 0 && (
        <details open>
          <summary className="cursor-pointer select-none font-mono text-xs tracking-[0.18em] text-[var(--color-ink-soft)] uppercase">
            Centres d'intérêt
          </summary>
          <ul className="mt-2 flex flex-wrap gap-2 pl-2">
            {master.interests.map((i) => (
              <li key={i.id}>
                <label
                  htmlFor={`int-${i.id}`}
                  className="flex items-center gap-1.5 text-sm text-[var(--color-ink)]"
                >
                  <input
                    type="checkbox"
                    id={`int-${i.id}`}
                    checked={sel.interests.has(i.id)}
                    onChange={() => toggleSet("interests", i.id)}
                  />
                  {i.name}
                </label>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Actions */}
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="font-mono-caps rounded-full px-4 py-2 text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
        >
          ANNULER
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!canCreate}
          className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-40"
        >
          Créer
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExperienceRow sub-component
// ---------------------------------------------------------------------------

function ExperienceRow({
  exp,
  checked,
  achievementSet,
  onToggle,
  onToggleAchievement,
}: {
  exp: MasterExperience;
  checked: boolean;
  achievementSet: Set<number>;
  onToggle: () => void;
  onToggleAchievement: (i: number) => void;
}) {
  const label = `${exp.jobTitle}, ${exp.company}`;
  return (
    <li className="flex flex-col gap-1">
      <label
        htmlFor={`exp-${exp.id}`}
        className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink)]"
      >
        <input
          type="checkbox"
          id={`exp-${exp.id}`}
          checked={checked}
          onChange={onToggle}
        />
        {label}
      </label>

      {checked && exp.achievements.length > 0 && (
        <ul className="ml-6 flex flex-col gap-0.5">
          {exp.achievements.map((ach, i) => (
            <li key={i}>
              <label
                htmlFor={`ach-${exp.id}-${i}`}
                className="flex items-start gap-2 text-sm text-[var(--color-ink-soft)]"
              >
                <input
                  type="checkbox"
                  id={`ach-${exp.id}-${i}`}
                  checked={achievementSet.has(i)}
                  onChange={() => onToggleAchievement(i)}
                  className="mt-0.5"
                />
                {ach}
              </label>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
