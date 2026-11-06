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

`npm run assistant:index` deliberately creates and indexes a new OpenAI store; it requires a securely configured key and is never part of automated verification.

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

`--page-gutter` and `--content-max-width` define the content area. `--section-gap` defines 160px desktop / 96px mobile total space between sections; `--section-space` is half that gap, contributed by each adjoining section. Count the spacing once. Contact retains 112px of internal bottom clearance plus the safe area to keep its final links above the existing assistant; no viewport spacer is used.

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

`npm run test:e2e` runs Chromium and WebKit against one managed production server on port 3100, with real OpenAI credentials disabled. Stop `next dev` before building its shared `.next` directory. Run one group with `npm run test:e2e -- tests/e2e/assistant`.

Tests use Playwright fixtures directly, grouped under `tests/e2e/{theme,navigation,header,hero,work,services,experience,testimonials,contact,assistant}`. Contact cases cover confirmed native links, initial/no-JavaScript content, responsive artwork and social rows, page-end/assistant clearance, entrance recovery and reduced motion. Testimonials cases cover exact copy, carousel accessibility, natural short/long heights, independent entrance, reversible word colour and layout rebasing. Experience cases cover employment semantics, responsive summary/row alignment, staged entrance, skipped/later-row recovery and initial/direct-anchor focus. Services cases cover native keyboard/touch disclosures, hover cancellation, progressive rendering, responsive preview clearance and interruptible motion. Work cases cover both datasets, filters, genuine artwork, responsive rows, viewport/reflow interruption and cross-document navigation. Hero cases cover initial HTML/no-JavaScript availability, focus, responsive composition, staged entrances, reversible scrolling and reduced-motion changes. Representative captures and sequence videos accompany the browser report. They cover startup before hydration, storage failure, anchor focus, modal accessibility through exit, interrupted/reduced motion, responsive cleanup, geometry and backdrop rendering. Patterned backdrop content exists only in its test fixture. Screenshots are attached to the HTML report under `playwright-report/`; failures retain screenshots and traces in `test-results/`. CI installs Chromium/WebKit with system dependencies and uploads browser evidence. These generated directories are ignored.

The logo assets under `public/images/brand/` preserve the approved Paper SVG paths; the light variant changes only the colours.

M01 contract version 2 uses inspected representative backdrop captures instead of PNG-byte inequality. Chromium visibly demonstrates blur. WebKit checks cover configuration, readability, controls and opaque fallback; its blur appearance remains **unverified**, an explicitly approved cosmetic limitation. Playwright WebKit captures do not verify actual Safari blur.

## Assistant interface

The persistent root `Assistant` composes the dialog and focused hooks for conversation, surface/focus, mobile viewport sizing and simple scrolling to new messages. Closing preserves messages, draft and pending requests; reloading clears the visit.

The conversation hook calls `src/modules/assistant/client.ts`, which selects recent history, posts to `/api/assistant`, decodes fragmented UTF-8/SSE frames and validates application events. The API route validates input once, wires `AssistantService` to `OpenAIClient` and forwards `delta`, `complete` (with sources) or safe terminal `error` events. Pre-stream failures use JSON `{ error: { code, message } }`. Zod owns wire schemas; UI messages remain in `src/types/assistant.ts`.

The service owns private grounding instructions. `knowledge.ts` derives twelve documents from existing public portfolio records: one per project and one each for Services, Experience, Testimonials and Contact. It also owns deterministic filenames and approved source links. OpenAI file search is the only tool and is required for each answer. Citation annotations must match a filename and file ID in that response's retrieval results before their approved metadata can appear under Sources. Sources identify cited portfolio material; they are not proof of every generated claim. Unknown citations are omitted with a content-free diagnostic.

The adapter owns SDK streaming, citation interpretation and explicit indexing. Configuration is server-only and read at request/command time; builds need no key or store. Generation retains gpt-6-luna, reasoning none, 800 output tokens, `store: false`, disabled retries and 30-second SDK/server/browser limits. There is no artificial text pacing. A provider-confirmed nonempty successful response is required; malformed, incomplete or truncated streams fail. Close/reopen preserves generation; unmount or disconnection cancels it.

Input limits remain 20 messages, 12,000 total text characters and 4,000 per user question. The 64KiB encoded byte limit is checked after buffering the body. Oldest turns are dropped without truncating the current question. Thinking… stays visible until the first text; fragments update one answer without repeated entrance animations or screen-reader announcements. Drafting remains possible while Send is disabled. Failures retain visible partial text and a safe notice, exclude the partial answer from subsequent history, and clear it on the next manual submission. There are no Stop, Retry, Latest message, automatic resubmission or persistence controls.

### Index and configure

Configure `OPENAI_API_KEY` securely in the existing OpenAI project. The standalone indexing command uses the process environment, does not load secret files, and requires no previous store ID:

```bash
npm run assistant:index
```

Node 22 runs the TypeScript entry point directly using type stripping. The command creates a new versioned store, uploads the approved documents, waits for each to finish indexing and prints `Ready: vs_…` only on full success. Failure exits unsuccessfully and prints only created resource IDs needed for manual cleanup. It never activates configuration or deletes prior stores; keep prior stores for manual rollback. Do not run indexing during requests, builds or deployment.

After successful indexing, set the non-secret `OPENAI_VECTOR_STORE_ID` to the ready ID in the existing Vercel project's Preview environment, alongside its existing secret `OPENAI_API_KEY`. The store must belong to a project accessible to that key. Redeploy Preview and verify project/follow-up/services/unknown-fact questions, progressive text and actual cited links. Before the human production release, configure the same ready store ID in Production alongside its existing server-only key, then deploy the merged commit and smoke-test. Missing store configuration returns an explicit unavailable response; no full-corpus fallback exists. Preserve the existing endpoint firewall protection.

`.env.example` documents names/placeholders only. For local Next.js development, configure both values privately and restart the dev server; the indexing command needs the existing key in its process environment. Never expose keys, transcripts or raw provider diagnostics.

`npm run test:server` uses inline fake model/SDK transports. Assistant browser tests use the actual UI and a test-scoped native HTTP stream, holding completion until incremental text is observed; buffered fixtures cover layout only. CI/test servers disable real credentials and never make paid calls or uploads. Mocked tests do not establish live-provider availability. Required verification is `test:server`, `check`, `build`, the focused assistant browser suite and the full browser suite.
