/**
 * TODO: Flesh out once client-side RTL (React Testing Library + vitest +
 * jsdom) is installed. See `deferred-work.md` — "Client-side Vitest + React
 * Testing Library (2-3)".
 *
 * Planned coverage:
 *  - Returns `false` when `matchMedia` is unavailable (SSR / node env)
 *  - Reflects initial `matches` value from `matchMedia(prefers-reduced-motion: reduce)`
 *  - Updates when the `change` event fires with a new `matches` value
 *  - Removes its `change` listener on unmount (no leak)
 */
export {};
