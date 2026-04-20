# CV Templates

Pure-function CV rendering shared across three consumers:

1. **iframe preview** (client) — `<iframe srcDoc={html}>`
2. **PDF pipeline** (server) — `page.setContent(html)` → `page.pdf()`
3. **Portfolio page** (server SSR) — HTML response

## Contract

```typescript
renderCvHtml(data: CvData, template: TemplateId): string
```

Returns a complete `<!DOCTYPE html>` document with inline `<style>`. Self-contained, no external assets.

## CSS Isolation

All template CSS selectors are scoped under `.cv`. Templates are also sandboxed
inside iframes at render time, so app styles cannot leak in and template styles
cannot leak out.

**Never add app-level selectors** (`body`, `html`, `*`, bare tag selectors) to
a template CSS file. Every rule must start with `.cv`.

## XSS

Every user-controlled string is HTML-escaped via `escapeHtml()` in
`renderer.ts`. If you add a new field to a template, make sure it goes through
`escapeHtml()` before reaching the output.

## Typography

CV templates use Georgia (serif headings) and Helvetica/Arial (body) —
independent from the app's SF Pro UI typography. Do not import the app's
design tokens into the template CSS.
