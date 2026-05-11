import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { optionalAuth } from "./middleware/optionalAuth";
import { authRoutes } from "./routes/auth";
import { cvRoutes } from "./routes/cv";
import { avatarRoutes } from "./routes/avatar";
import { cvImportRoutes } from "./routes/cvImport";
import { cvTranslateRoutes } from "./routes/cvTranslate";
import { cvAssistantRoutes } from "./routes/cvAssistant";
import { folderRoutes } from "./routes/folders";
import { aiKeyRoutes } from "./routes/aiKeys";
import { aiPreferenceRoutes } from "./routes/aiPreferences";
import { shutdownPdfService, warmupPdfService } from "./services/pdfService";

const app = new Hono();

// Optional authentication runs before every API route.
app.use("/api/*", optionalAuth());

// API routes
app.get("/api/v1/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.route("/api/v1", authRoutes); // exposes /api/v1/me
app.route("/api/v1/cv/import", cvImportRoutes);
app.route("/api/v1/cv/translate", cvTranslateRoutes);
app.route("/api/v1/cv/assistant", cvAssistantRoutes);
app.route("/api/v1/cv", cvRoutes);
app.route("/api/v1/avatar", avatarRoutes);
app.route("/api/v1/folders", folderRoutes);
app.route("/api/v1/ai-keys", aiKeyRoutes);
app.route("/api/v1/ai-preferences", aiPreferenceRoutes);

// Serve the built SPA's static assets from the client workspace
app.use("/*", serveStatic({ root: "../client/dist" }));

// SPA fallback — serve index.html for all unmatched non-API routes
app.get("*", serveStatic({ root: "../client/dist", path: "index.html" }));

// Pre-launch Chromium so the first /pdf request doesn't pay cold-start cost.
// Fire-and-forget: server starts immediately, browser warms in the background.
void warmupPdfService();

// Release Chromium on shutdown so it doesn't leak on deploy restarts.
for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, async () => {
    await shutdownPdfService();
    process.exit(0);
  });
}

export default {
  port: Number.parseInt(process.env.PORT ?? "3001"),
  fetch: app.fetch,
};
