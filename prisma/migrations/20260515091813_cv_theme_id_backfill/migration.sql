-- Backfill cvs.data.themeId from the legacy template_id column.
-- The plan-era CV rows have template_id ∈ {classique, moderne, minimaliste} as a
-- top-level column. The new render pipeline reads themeId out of the JSON data
-- field instead. Map each legacy id to its closest atelier theme so existing
-- CVs keep rendering after Phases 1–9. atelier-moderne is now premium, so free
-- users with legacy `moderne` are migrated to the closest free theme.
UPDATE "cvs"
SET data = jsonb_set(
  data,
  '{themeId}',
  to_jsonb(
    CASE template_id
      WHEN 'classique' THEN 'atelier-classique'
      WHEN 'moderne' THEN 'atelier-classique'
      WHEN 'minimaliste' THEN 'atelier-minimaliste'
      ELSE 'atelier-classique'
    END
  )
)
WHERE NOT (data ? 'themeId');
