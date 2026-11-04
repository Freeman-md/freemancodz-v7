# Freemancodz V7

A Next.js App Router portfolio using TypeScript and CSS Modules, with persistent dark/light themes and accessible desktop/mobile navigation. The homepage contains the approved Hero, Work, Services, Experience, Testimonials and Contact sections.

## Run locally

Use Node.js 22.x and npm. With nvm installed, `nvm use` selects the declared Node major.

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Stop the development server before building or starting the production application, since both use `.next`.

## Commands

| Command                | What it does                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Starts the development server with the default bundler.                                             |
| `npm run build`        | Creates and validates the production build.                                                         |
| `npm run start`        | Serves that production build.                                                                       |
| `npm run lint`         | Checks Next.js, React, TypeScript and selected readability rules; warnings fail.                    |
| `npm run typecheck`    | Generates route types, then checks TypeScript without emitting JavaScript.                          |
| `npm run format`       | Applies Prettier formatting.                                                                        |
| `npm run format:check` | Checks formatting without changing files.                                                           |
| `npm run test:server`  | Verifies Assistant contracts, grounding, the SDK adapter and HTTP boundaries without paid requests. |
| `npm run test:e2e`     | Exercises the production shell in Chromium and WebKit on port 3100.                                 |
| `npm run check`        | Runs format checking, linting and type checking.                                                    |

ESLint catches rule violations; TypeScript checks types; Prettier formats code. They do not prove that a feature behaves correctly. Playwright exercises the production shell in Chromium and WebKit.

## File responsibilities

Hooks are grouped by ownership: `src/hooks/home/<section>/` for homepage-only behaviour, `src/hooks/work/` for the collection shared by both routes, and `src/hooks/shared/` for site-wide/reused behaviour. Assistant hooks live together in `src/hooks/shared/assistant/`. Components and their CSS Modules remain in their existing directories.

- `src/app/layout.tsx` owns the root HTML document, metadata, font loading and composition of the single theme provider, site header and persistent floating assistant.
- `src/app/page.tsx` composes the server-rendered Hero, selected Work, Services, Experience, Testimonials and Contact sections. Anchors scroll smoothly, or immediately under reduced motion; mobile journeys begin after modal exit. The logo returns to the actual page-top hero section. Contact's compact page-end destination naturally clamps to the available scroll distance while keeping its heading focused and unobscured.
- `src/app/work/page.tsx` is the thin collection route with its own metadata, main/skip target and header clearance. Both routes use `src/components/sections/work/Work.tsx`; `src/data/projects.ts` holds the eight serializable records and derives the five-project homepage selection.
- `WorkGallery` composes native per-instance filters, cards and the optional view-all link, and owns the gallery reference connecting its hooks. `use-work-filter.ts` coordinates filtering and cancellable native reflow in `src/lib/work/animate-grid-change.ts`; `use-work-reveal.ts` owns scoped viewport entrances and completed project reveals. SSR/no-JavaScript content stays readable; filters enable after hydration. Reduced motion settles all content and filtering.
- `ProjectArtwork` chooses genuine images under `public/images/projects/` or the approved static previews, whose CSS preserves artwork colours across themes. Shared `SectionHeading` owns the semantic heading, decorative watermark, centred/start alignment and neutral reveal markers; the focus target stays stationary while its inner text animates.
- `src/data/services.ts` holds the two serializable service records. Server `Services` composes its shared heading and client `ServiceList`; `ServiceItem` owns native disclosure markup and `ServicePreview` owns the genuine JPScents image or compact workflow illustration. `use-service-disclosure.ts` coordinates single selection and cancellable mouse intent; `src/hooks/shared/use-section-reveal.ts` owns its once-only introduction/row entrance with the section-context focus policy. Colocated CSS owns grid expansion, preview clearance and motion. Both static details remain readable without JavaScript; enhancement enables the controls and preserves a following fragment target’s position when the fallback collapses.
- `src/data/experience.ts` holds the three ordered employment records. Server `Experience` composes the unchanged shared heading and fixed summary; client `ExperienceList` owns the semantic list. The same `use-section-reveal.ts` coordinates its four-stage entrance and later rows with the heading-context focus policy, preserving immediate heading/summary recovery and reduced motion. Section and list CSS own responsive typography, natural heights and motion timing; static content stays readable without JavaScript or observation.
- `src/data/testimonials.ts` preserves the two original recommendations and source links. Server `Testimonials` composes the unchanged centred heading; client `TestimonialCarousel` owns native controls, semantic `TestimonialQuote` figures and the composition reference passed to its reveal hook. `use-testimonial-carousel.ts` measures and observes only the selected natural figure, `use-testimonials-reveal.ts` owns the once-only entrance, and `use-testimonial-scroll.ts` coalesces reversible word colouring independently of transitions. Selection and layout changes rebase held reading progress; reduced motion shows full text and immediate selected height. Both complete figures remain readable before enhancement or without JavaScript.
- `src/data/contact.ts` holds confirmed native email/profile destinations. Server `Contact` composes availability, a stationary heading, copy and the shared CTA; client `ContactSocialLinks` renders the ordered local artwork and connects `use-contact-reveal.ts`. The hook owns once-only entrance observation, focus/restoration recovery and reduced-motion completion. The Contact portrait preserves the approved Paper original-photo crop, distinct from the Hero cutout; LinkedIn/X/GitHub assets preserve the approved official mark geometry under `public/images/contact/`.
- `src/app/globals.css` owns the shared foundation variables and application-wide base styles.
- `next.config.ts` keeps framework defaults. Next.js maintains its version-specific guidance in `AGENTS.md` alongside the project rules; human instructions and approved scope take precedence. `tsconfig.json` enables strict TypeScript; `@/*` resolves into `src/`.
- `eslint.config.mjs` combines the Next.js rules, Prettier compatibility and three readability rules: required braces, no nested ternaries and one variable declaration per statement.
- `.prettierrc.json` selects Prettier's defaults. `.editorconfig` specifies UTF-8, LF endings, two-space indentation and a final newline. The ignore files exclude generated output and secret-bearing files.
- `src/components/sections/hero/Hero.tsx` owns hero copy, reserved entrance slots and lower labels. Colocated CSS owns its finite entrance sequence and responsive layout. `HeroPortrait` is the small client boundary in the same directory; `use-hero-scroll.ts` lives in `src/hooks/home/hero/` and updates its separate scroll layer through one scheduled animation frame, without React renders on scroll. Reduced motion bypasses entrance and scroll effects, including preference changes during a visit.
- `src/components/shared/ActionLink.tsx` owns the pill link and intercepts only existing same-page targets through the navigation helper. Other destinations and modified clicks retain native behaviour. `AssistantButton` is the presentation-only launcher connected to the persistent root `Assistant`; its controller owns dialog state.
- `src/components/shared/` owns the shell presentation, with PascalCase components and matching CSS Modules directly in that directory. `SiteHeader` composes desktop/mobile navigation; `MobileHeader` is reused inside the modal.
- `src/providers/ThemeProvider.tsx` configures `next-themes`; `src/hooks/shared/use-theme-toggle.ts` supplies hydration-safe control state. The default is dark regardless of device preference, with choices saved under `freemancodz-v7-theme`. Saved preferences render immediately; colour transitions (200ms) and Sun/Moon crossfades (180ms) enable after hydration and turn off for reduced motion. CSS selects logo/icons from the before-paint root attribute.
- `src/hooks/shared/use-mobile-navigation.ts` owns navigation phases and lifecycle; `src/config/navigation.ts` owns destinations/breakpoint. Non-React geometry, CSS animation observation and destination focus live in `src/lib/navigation/`. CSS owns timings; the observer waits only for navigation keyframes, so theme colour/icon fades do not delay exit. Radix stays open until the exit completes. Same-document hashes use smooth scrolling and focus; links from `/work` to home perform real document navigation after mobile restrictions release.
- `.github/workflows/ci.yml` runs `check`, `build` and the browser suite on pull requests and pushes to `main`, retaining browser evidence.
- `AGENTS.md` supplies the scope, readability and global-skill routing instructions.

Keep component styles in colocated CSS Modules with semantic class names and shallow selectors. Reuse or extract styles when there is a concrete pattern, without building a speculative utility framework. No Tailwind dependency is used.

## Design foundations

Use the variables in `src/app/globals.css` by their purpose: `--color-*` for colour roles, `--font-*` for families, paired `--text-*` and `--leading-*` for type sizes and line heights, and `--space-*` for shared spacing. The two foreground whites preserve the approved distinction between general text and Hero/Contact display text.

`--page-gutter` and `--content-max-width` define the content area. `--section-gap` defines the total space between sections; `--section-space` is half that gap, contributed by each adjoining section. Count the spacing once. Contact retains 112px of internal bottom clearance plus the safe area to keep its final links above the existing assistant; no viewport spacer is used.

The default values are mobile-first, with shared desktop values beginning at `64rem` (1024px at the browser's default root size). Sizes use `rem` and tracking uses `em`; the root font size remains the browser default.

Inter supplies default copy and labels; Manrope supplies headings and other approved section typography. Built-in `next/font/google` downloads the Latin variable fonts during builds and serves them locally to visitors, so builds require network access to the font provider. The root HTML classes expose both font variables to the global stylesheet.

The hero uses the approved Paper typography and naturally proportioned transparent slope-v3 portrait, stored under `public/images/hero/`. Desktop crops its lower edge; mobile clothing reaches the hero bottom. Only the portrait scales and brightens with normal scrolling. Section-specific type sizes, watermark opacity, artwork colours, control treatments and measurements such as the Work grid gap remain local until their sections are implemented. The shell adds the approved light palette and component-owned motion.

## Design and milestones

The approved [Paper landing-page composition](https://app.paper.design/file/01M5VJC7VWD8F9QYARYR43X33M/p-8-0) provides the visual reference. Pages 01–07 preserve the individual sections and motion storyboards.

Ask for `milestone-authoring` to turn an approved plan into a contract. **Run Active Milestone** or **Resume Active Milestone** invokes `milestone-workflow` against this checkout's `.agents/milestones/active.md`; only the human merges. **Sync After Merge** verifies the merged PR and synchronizes the base without starting new work.

The active contract is locally excluded through Git's `info/exclude`. The authoring skill prepares that exclusion in each new checkout; this bootstrap does not create an active contract.

Commits follow Conventional Commits. Ordinary commits and pushes require authorization. The Assistant uses the server-only `/api/assistant` endpoint; production activation follows the human merge and the linked Vercel Git workflow.

## Browser verification

```bash
npx playwright install chromium webkit
npm run check
npm run test:server
npm run build
npm run test:e2e
```

`npm run test:e2e` invokes Playwright against two managed production servers from the same build: ordinary application on port 3100 (`ASSISTANT_UI_FIXTURES=0`) and the explicitly enabled fixture host on port 3101 (`ASSISTANT_UI_FIXTURES=1`). Stop `next dev` before building its shared `.next` directory. The test server never reuses an existing server. Run one group with `npm run test:e2e -- tests/e2e/navigation`.

Tests use Playwright fixtures directly, grouped under `tests/e2e/{theme,navigation,header,hero,work,services,experience,testimonials,contact,assistant}`. Contact cases cover confirmed native links, initial/no-JavaScript content, responsive artwork and social rows, page-end/assistant clearance, entrance recovery and reduced motion. Testimonials cases cover exact copy, carousel accessibility, natural short/long heights, independent entrance, reversible word colour and layout rebasing. Experience cases cover employment semantics, responsive summary/row alignment, staged entrance, skipped/later-row recovery and initial/direct-anchor focus. Services cases cover native keyboard/touch disclosures, hover cancellation, progressive rendering, responsive preview clearance and interruptible motion. Work cases cover both datasets, filters, genuine artwork, responsive rows, viewport/reflow interruption and cross-document navigation. Hero cases cover initial HTML/no-JavaScript availability, focus, responsive composition, staged entrances, reversible scrolling and reduced-motion changes. Representative captures and sequence videos accompany the browser report. They cover startup before hydration, storage failure, anchor focus, modal accessibility through exit, interrupted/reduced motion, responsive cleanup, geometry and backdrop rendering. Patterned backdrop content exists only in its test fixture. Screenshots are attached to the HTML report under `playwright-report/`; failures retain screenshots and traces in `test-results/`. CI installs Chromium/WebKit with system dependencies and uploads browser evidence. These generated directories are ignored.

The logo assets under `public/images/brand/` preserve the approved Paper SVG paths; the light variant changes only the colours.

M01 contract version 2 uses inspected representative backdrop captures instead of PNG-byte inequality. Chromium visibly demonstrates blur. WebKit checks cover configuration, readability, controls and opaque fallback; its blur appearance remains **unverified**, an explicitly approved cosmetic limitation. Playwright WebKit captures do not verify actual Safari blur.

## Assistant interface

The persistent root `Assistant` owns four focused hooks in `src/hooks/shared/assistant/`: surface/focus lifecycle, conversation/cancellation, visual-viewport measurement and transcript following. The three dialog presentation components own their colocated CSS; immutable welcome copy and the small optional `requestReply(messages, { signal, onChunk })` callback contract stay separate. Closing preserves messages, draft and in-flight replies; a reload clears the visit. No browser history store is used.

The [approved Assistant composition](https://app.paper.design/file/01M5VJC7VWD8F9QYARYR43X33M/p-9-0) now connects its existing conversation hook to the M09 browser transport. The hook still owns messages, draft, Stop, Retry and visit continuity. Missing server configuration returns a safe HTTP 503 and the designed failure/Retry state.

`/test-fixtures/assistant` calls Next.js `connection()` before checking the server-only flag at request time and defaults to 404. Only the exact value `1` renders its test-only host; query parameters can then select a known scenario. Never enable the flag in deployment configuration. Fixture modules and deterministic replies are absent from the normal root Assistant import path. Tests operate the real dialog/controllers with Playwright's clock, using the 3101 host for controlled chunks/failure/late cancellation and 3100 for ordinary integration/isolation.

After `npm run build`, run `npm run test:e2e -- tests/e2e/assistant` or the full suite. Layout captures and motion recordings are retained with the browser report. The keyboard-bound case simulates VisualViewport geometry; it does not establish physical iOS keyboard behavior or live AI delivery.

## Assistant messaging

`src/modules/assistant/schemas.ts` defines strict Zod request/event/error contracts and shared limits. `client.ts` selects recent whole turns, posts through the existing reply callback and validates UTF-8 NDJSON. It delivers first text immediately, batches later fragments about every 50ms and flushes on confirmed completion. Broken or incomplete streams fail while retaining displayed text. Browser cancellation clears pending batching and aborts HTTP.

`AssistantService` validates independently and supplies instructions built from the approved records in `src/data/`. The injected `AssistantModel` keeps the service independent of OpenAI. `src/infrastructure/openai/` owns request-time key validation, pinned settings and SDK event translation; browser imports never reach these modules. `route.ts` owns bounded body reading, HTTP errors, streaming headers and the 30-second request deadline. Provider errors and transcripts are never logged or forwarded as diagnostics.

`POST /api/assistant` accepts `{ messages: [{ role: "user" | "assistant", text: string }] }`. Unknown fields, blank text and a final non-user message are rejected. Limits are 64KiB while reading HTTP bytes, 20 messages, 12,000 total text characters and 4,000 per user question (JavaScript string units). Recent history is dropped at turn boundaries; the current question is never truncated. Delivery is one strict JSON event per line: `{ type: "delta", text }`, `{ type: "complete" }` or `{ type: "error", error: { code, message } }`. HTTP errors use the same error object. Codes are `invalid_request`, `unavailable` and `reply_failed`.

Configure the existing `OPENAI_API_KEY` securely for the linked project's Preview and Production environments. `.env.example` documents the variable without a credential. Do not put it in public variables, source, chat, logs or commits. The key is read only when a request arrives, so builds work without it. Generation uses the [OpenAI Responses API](https://developers.openai.com/api/docs/guides/streaming-responses) with [gpt-6-luna](https://developers.openai.com/api/docs/models/gpt-6-luna), reasoning `none`, at most 800 output tokens, `store: false` and zero SDK retries. The route's single 30-second lifecycle budget includes body reading and provider work; the SDK safeguard cannot extend it. No retrieval service, provider tools, persistence or automatic retry queue is used.

`npm run test:server` uses the installed Playwright runner in Node with fake model/SDK transports, including deadline and disconnection cases. Both browser servers explicitly clear `OPENAI_API_KEY`; CI also disables it and runs the server suite. The new messaging browser cases route actual browser HTTP to a test-owned stream server, preserving the real client/decoder and UI. All automated verification is isolated from paid provider access. M08's gated callback fixtures remain available only on the explicitly enabled fixture server.

Before merge, separately verify the actual preview's three presets, one grounded follow-up, one unknown-fact question and Stop; inspect desktop/mobile and record the tested commit/environment without full transcript logging. Confirm secure Production key configuration and the Vercel rule for exactly `POST /api/assistant`: 10 requests per 60 seconds per IP. Vercel's counters are regional, so this is basic abuse protection rather than a global spending cap. Preserve existing rules. Public-site smoke verification follows the human merge; preview evidence does not establish production activation.
