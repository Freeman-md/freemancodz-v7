# Freemancodz V7

A small Next.js App Router foundation using TypeScript and CSS Modules, with shared colour, typography and spacing variables. The portfolio sections and reusable components will be implemented through separately approved work.

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
| `npm run check`        | Runs format checking, linting and type checking.                                 |

ESLint catches rule violations; TypeScript checks types; Prettier formats code. They do not prove that a feature behaves correctly. Meaningful behavioural tests will be introduced with the features they protect.

## File responsibilities

- `src/app/layout.tsx` owns the root HTML document, metadata, font loading and global stylesheet import.
- `src/app/page.tsx` renders the neutral homepage. `page.module.css` owns its scoped styles.
- `src/app/globals.css` owns the shared foundation variables and application-wide base styles.
- `next.config.ts` keeps framework defaults. Next.js maintains its version-specific guidance in `AGENTS.md` alongside the project rules; human instructions and approved scope take precedence. `tsconfig.json` enables strict TypeScript; `@/*` resolves into `src/`.
- `eslint.config.mjs` combines the Next.js rules, Prettier compatibility and three readability rules: required braces, no nested ternaries and one variable declaration per statement.
- `.prettierrc.json` selects Prettier's defaults. `.editorconfig` specifies UTF-8, LF endings, two-space indentation and a final newline. The ignore files exclude generated output and secret-bearing files.
- `.github/workflows/ci.yml` installs from the lockfile and runs `check` and `build` on pull requests and pushes to `main`.
- `AGENTS.md` supplies the scope, readability and global-skill routing instructions.

Keep component styles in colocated CSS Modules with semantic class names and shallow selectors. Reuse or extract styles when there is a concrete pattern, without building a speculative utility framework. No Tailwind dependency is used.

## Design foundations

Use the variables in `src/app/globals.css` by their purpose: `--color-*` for colour roles, `--font-*` for families, paired `--text-*` and `--leading-*` for type sizes and line heights, and `--space-*` for shared spacing. The two foreground whites preserve the approved distinction between general text and Hero/Contact display text.

`--page-gutter` and `--content-max-width` define the content area. `--section-gap` defines the total space between sections; `--section-space` is half that gap, contributed by each adjoining section. Count the spacing once. These variables establish the contract; the placeholder does not render section wrappers.

The default values are mobile-first, with shared desktop values beginning at `64rem` (1024px at the browser's default root size). Sizes use `rem` and tracking uses `em`; the root font size remains the browser default.

Inter supplies default copy and labels; Manrope supplies headings and other approved section typography. Built-in `next/font/google` downloads the Latin variable fonts during builds and serves them locally to visitors, so builds require network access to the font provider. The root HTML classes expose both font variables to the global stylesheet.

The neutral homepage demonstrates the foundation wiring. Section-specific type sizes, watermark opacity, artwork colours, control treatments and measurements such as the Work grid gap remain local until their sections are implemented. Shared components, light-theme behaviour and motion tokens are deferred.

## Design and milestones

The approved [Paper landing-page composition](https://app.paper.design/file/01M5VJC7VWD8F9QYARYR43X33M/p-8-0) provides the visual reference. Pages 01–07 preserve the individual sections and motion storyboards.

Ask for `milestone-authoring` to turn an approved plan into a contract. **Run Active Milestone** invokes `milestone-workflow` against this checkout's `.agents/milestones/active.md`; only the human merges.

The active contract is locally excluded through Git's `info/exclude`. The authoring skill prepares that exclusion in each new checkout; this bootstrap does not create an active contract.

Commits follow Conventional Commits. Ordinary commits and pushes require authorization. This foundation includes no deployment, backend, assistant integration or test framework.
