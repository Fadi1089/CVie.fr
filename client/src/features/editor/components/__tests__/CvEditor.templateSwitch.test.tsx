/**
 * TODO: Flesh out once client-side RTL (React Testing Library + vitest +
 * jsdom) is installed. See `deferred-work.md` — "Client-side Vitest + React
 * Testing Library (2-3)".
 *
 * Planned coverage for Story 2-3 AC#3 / AC#6 / AC#8 / AC#9:
 *  - Render <MemoryRouter initialEntries={["/editor?template=classique"]}>
 *    wrapping <CvEditor />
 *  - Fill representative fields via userEvent (firstName, summary, one
 *    experience bullet)
 *  - Navigate to ?template=moderne via useNavigate / setSearchParams
 *  - Assert RHF getValues() deep-equals the pre-switch snapshot (zero data
 *    loss — no reset, no array truncation, no nested bullet lost)
 *  - Assert the preview iframe srcDoc updates to reflect the new template id
 *  - Assert switching to an unknown ?template= value surfaces the
 *    UnknownTemplateBanner without mutating form state
 *  - Manual smoke-tested this story until the harness lands
 */
export {};
