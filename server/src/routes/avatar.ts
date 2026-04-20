import { Hono } from "hono";
import { rateLimit } from "../middleware/rateLimit";

const AVATAR_RATE_LIMIT_PER_MIN = (() => {
  const raw = process.env.AVATAR_RATE_LIMIT_PER_MIN;
  if (!raw) return 20;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
})();

export const avatarRoutes = new Hono();

avatarRoutes.use(
  "*",
  rateLimit({ max: AVATAR_RATE_LIMIT_PER_MIN, windowMs: 60_000 }),
);

function sanitizeGithubUser(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(
    /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))/i,
  );
  const candidate = urlMatch?.[1] ?? trimmed;
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(candidate)) return null;
  return candidate;
}

function isLinkedinUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return /(^|\.)linkedin\.com$/i.test(u.hostname);
  } catch {
    return false;
  }
}

avatarRoutes.get("/github", async (c) => {
  const value = c.req.query("value") ?? "";
  const user = sanitizeGithubUser(value);
  if (!user) {
    return c.json(
      { error: "Nom d'utilisateur GitHub invalide.", code: "INVALID_INPUT" },
      400,
    );
  }
  try {
    const res = await fetch(`https://api.github.com/users/${user}`, {
      headers: { "User-Agent": "cvie-fr", Accept: "application/vnd.github+json" },
    });
    if (res.status === 404) {
      return c.json(
        { error: "Profil GitHub introuvable.", code: "NOT_FOUND" },
        404,
      );
    }
    if (!res.ok) throw new Error(`github api ${res.status}`);
    const data = (await res.json()) as { avatar_url?: string };
    if (!data.avatar_url) throw new Error("no avatar_url");
    return c.json({ url: data.avatar_url });
  } catch (err) {
    console.error("[avatar/github] failed:", err);
    return c.json(
      { error: "Impossible de récupérer l'avatar GitHub.", code: "FETCH_FAILED" },
      502,
    );
  }
});

avatarRoutes.get("/linkedin", async (c) => {
  const value = c.req.query("value") ?? "";
  if (!isLinkedinUrl(value)) {
    return c.json(
      { error: "URL LinkedIn invalide.", code: "INVALID_INPUT" },
      400,
    );
  }
  try {
    const res = await fetch(value, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; cvie-fr/1.0; +https://github.com)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`linkedin ${res.status}`);
    const html = await res.text();
    const match =
      html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      ) ??
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      );
    if (!match) {
      return c.json(
        {
          error:
            "Photo LinkedIn indisponible (profil protégé par authwall). Connectez-vous et utilisez l'URL directe de l'image.",
          code: "UNAVAILABLE",
        },
        404,
      );
    }
    const url = (match[1] ?? "").replace(/&amp;/g, "&");
    if (!url) throw new Error("empty og:image");
    return c.json({ url });
  } catch (err) {
    console.error("[avatar/linkedin] failed:", err);
    return c.json(
      {
        error: "Impossible de récupérer la photo LinkedIn.",
        code: "FETCH_FAILED",
      },
      502,
    );
  }
});
