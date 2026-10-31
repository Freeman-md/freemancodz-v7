# Freemancodz V7

A Next.js App Router portfolio shell using TypeScript and CSS Modules, with persistent dark/light themes and accessible desktop/mobile navigation. The approved responsive hero introduces Freeman; remaining portfolio sections will follow through separately approved milestones.

## Run locally

Use Node.js 22.x and npm. With nvm installed, `nvm use` selects the declared Node major.

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Stop the development server before building or starting the production application, since both use `.next`.

## Commands

| Command                | What it does                                                                     |
| ---------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`          | Starts the development server with the default bundler.                          |
| `npm run build`        | Creates and validates the production build.                                      |
| `npm run start`        | Serves that production build.                                                    |
| `npm run lint`         | Checks Next.js, React, TypeScript and selected readability rules; warnings fail. |
| `npm run typecheck`    | Generates route types, then checks TypeScript without emitting JavaScript.       |
| `npm run format`       | Applies Prettier formatting.                                                     |
| `npm run format:check` | Checks formatting without changing files.                                        |
| `npm run test:e2e`     | Exercises the production shell in Chromium and WebKit on port 3100.              |
| `npm run check`        | Runs format checking, linting and type checking.                                 |

ESLint catches rule violations; TypeScript checks types; Prettier formats code. They do not prove that a feature behaves correctly. Playwright exercises the production shell in Chromium and WebKit.

## File responsibilities

- `src/app/layout.tsx` owns the root HTML document, metadata, font loading and composition of the single theme provider, site header and disabled floating assistant.
- `src/app/page.tsx` composes the server-rendered Hero and temporary Work, Experience and Contact anchors. These intentionally plain sections provide scrolling and focus targets until their content milestones replace them. Anchors scroll smoothly, or immediately under reduced motion; mobile journeys begin after modal exit. `page.module.css` constrains the remaining placeholder sections. The logo returns to the actual page-top hero section.
- `src/app/globals.css` owns the shared foundation variables and application-wide base styles.
- `next.config.ts` keeps framework defaults. Next.js maintains its version-specific guidance in `AGENTS.md` alongside the project rules; human instructions and approved scope take precedence. `tsconfig.json` enables strict TypeScript; `@/*` resolves into `src/`.
- `eslint.config.mjs` combines the Next.js rules, Prettier compatibility and three readability rules: required braces, no nested ternaries and one variable declaration per statement.
- `.prettierrc.json` selects Prettier's defaults. `.editorconfig` specifies UTF-8, LF endings, two-space indentation and a final newline. The ignore files exclude generated output and secret-bearing files.
- `src/components/sections/hero/Hero.tsx` owns hero copy, reserved entrance slots and lower labels. Colocated CSS owns its finite entrance sequence and responsive layout. `HeroPortrait` is the small client boundary in the same directory; `use-hero-scroll.ts` remains in `src/hooks/` and updates its separate scroll layer through one scheduled animation frame, without React renders on scroll. Reduced motion bypasses entrance and scroll effects, including preference changes during a visit.
- `src/components/shared/ActionLink.tsx` owns the pill link and intercepts only existing same-page targets through the navigation helper. Other destinations and modified clicks retain native behaviour. `AssistantButton` is a single disabled presentation control; it has no panel, state or backend.
- `src/components/shared/` owns the shell presentation, with PascalCase components and matching CSS Modules directly in that directory. `SiteHeader` composes desktop/mobile navigation; `MobileHeader` is reused inside the modal.
- `src/providers/ThemeProvider.tsx` configures `next-themes`; `src/hooks/use-theme-toggle.ts` supplies hydration-safe control state. The default is dark regardless of device preference, with choices saved under `freemancodz-v7-theme`. Saved preferences render immediately; colour transitions (200ms) and Sun/Moon crossfades (180ms) enable after hydration and turn off for reduced motion. CSS selects logo/icons from the before-paint root attribute.
- `src/hooks/use-mobile-navigation.ts` owns navigation phases and lifecycle; `src/config/navigation.ts` owns destinations/breakpoint. Non-React geometry, CSS animation observation and destination focus live in `src/lib/navigation/`. CSS owns timings; the observer waits only for navigation keyframes, so theme colour/icon fades do not delay exit. Radix stays open until the exit completes.
- `.github/workflows/ci.yml` runs `check`, `build` and the browser suite on pull requests and pushes to `main`, retaining browser evidence.
- `AGENTS.md` supplies the scope, readability and global-skill routing instructions.

Keep component styles in colocated CSS Modules with semantic class names and shallow selectors. Reuse or extract styles when there is a concrete pattern, without building a speculative utility framework. No Tailwind dependency is used.

## Design foundations

Use the variables in `src/app/globals.css` by their purpose: `--color-*` for colour roles, `--font-*` for families, paired `--text-*` and `--leading-*` for type sizes and line heights, and `--space-*` for shared spacing. The two foreground whites preserve the approved distinction between general text and Hero/Contact display text.

`--page-gutter` and `--content-max-width` define the content area. `--section-gap` defines the total space between sections; `--section-space` is half that gap, contributed by each adjoining section. Count the spacing once. The temporary anchor sections provide one viewport of vertical space each.

The default values are mobile-first, with shared desktop values beginning at `64rem` (1024px at the browser's default root size). Sizes use `rem` and tracking uses `em`; the root font size remains the browser default.

Inter supplies default copy and labels; Manrope supplies headings and other approved section typography. Built-in `next/font/google` downloads the Latin variable fonts during builds and serves them locally to visitors, so builds require network access to the font provider. The root HTML classes expose both font variables to the global stylesheet.

The hero uses the approved Paper typography and naturally proportioned transparent slope-v3 portrait, stored under `public/images/hero/`. Desktop crops its lower edge; mobile clothing reaches the hero bottom. Only the portrait scales and brightens with normal scrolling. Section-specific type sizes, watermark opacity, artwork colours, control treatments and measurements such as the Work grid gap remain local until their sections are implemented. The shell adds the approved light palette and component-owned motion.

## Design and milestones

The approved [Paper landing-page composition](https://app.paper.design/file/01M5VJC7VWD8F9QYARYR43X33M/p-8-0) provides the visual reference. Pages 01–07 preserve the individual sections and motion storyboards.

Ask for `milestone-authoring` to turn an approved plan into a contract. **Run Active Milestone** or **Resume Active Milestone** invokes `milestone-workflow` against this checkout's `.agents/milestones/active.md`; only the human merges. **Sync After Merge** verifies the merged PR and synchronizes the base without starting new work.

The active contract is locally excluded through Git's `info/exclude`. The authoring skill prepares that exclusion in each new checkout; this bootstrap does not create an active contract.

Commits follow Conventional Commits. Ordinary commits and pushes require authorization. This shell includes no deployment, backend or assistant integration.

## Browser verification

```bash
npx playwright install chromium webkit
npm run check
npm run build
npm run test:e2e
```

`npm run test:e2e` invokes Playwright against a managed production server on dedicated port 3100. Stop `next dev` before building its shared `.next` directory. The test server never reuses an existing server. Run one group with `npm run test:e2e -- tests/e2e/navigation`.

Tests use Playwright fixtures directly, grouped under `tests/e2e/{theme,navigation,header,hero}`. Hero cases cover initial HTML/no-JavaScript availability, focus, responsive composition, staged entrances, reversible scrolling and reduced-motion changes. Representative captures and sequence videos accompany the browser report. They cover startup before hydration, storage failure, anchor focus, modal accessibility through exit, interrupted/reduced motion, responsive cleanup, geometry and backdrop rendering. Patterned backdrop content exists only in its test fixture. Screenshots are attached to the HTML report under `playwright-report/`; failures retain screenshots and traces in `test-results/`. CI installs Chromium/WebKit with system dependencies and uploads browser evidence. These generated directories are ignored.

The logo assets under `public/images/brand/` preserve the approved Paper SVG paths; the light variant changes only the colours.

M01 contract version 2 uses inspected representative backdrop captures instead of PNG-byte inequality. Chromium visibly demonstrates blur. WebKit checks cover configuration, readability, controls and opaque fallback; its blur appearance remains **unverified**, an explicitly approved cosmetic limitation. Playwright WebKit captures do not verify actual Safari blur.
