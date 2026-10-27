# Freemancodz V7

A small Next.js App Router foundation using TypeScript and CSS Modules. The portfolio sections and design system will be implemented through separately approved work.

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

- `src/app/layout.tsx` owns the root HTML document, metadata and global stylesheet import.
- `src/app/page.tsx` renders the neutral homepage. `page.module.css` owns its scoped styles.
- `src/app/globals.css` contains only application-wide base styles. Future design tokens need separate approval.
- `next.config.ts` disables automatic framework additions to our curated `AGENTS.md`. `tsconfig.json` enables strict TypeScript; `@/*` resolves into `src/`.
- `eslint.config.mjs` combines the Next.js rules, Prettier compatibility and three readability rules: required braces, no nested ternaries and one variable declaration per statement.
- `.prettierrc.json` selects Prettier's defaults. `.editorconfig` specifies UTF-8, LF endings, two-space indentation and a final newline. The ignore files exclude generated output and secret-bearing files.
- `.github/workflows/ci.yml` installs from the lockfile and runs `check` and `build` on pull requests and pushes to `main`.
- `AGENTS.md` supplies the scope, readability and global-skill routing instructions.

Keep component styles in colocated CSS Modules with semantic class names and shallow selectors. Reuse or extract styles when there is a concrete pattern, without building a speculative utility framework. No Tailwind dependency is used.

## Design and milestones

The approved [Paper landing-page composition](https://app.paper.design/file/01M5VJC7VWD8F9QYARYR43X33M/p-8-0) provides the visual reference. Pages 01–07 preserve the individual sections and motion storyboards.

Ask for `milestone-authoring` to turn an approved plan into a contract. **Run Active Milestone** invokes `milestone-workflow` against this checkout's `.agents/milestones/active.md`; only the human merges.

The active contract is locally excluded through Git's `info/exclude`. The authoring skill prepares that exclusion in each new checkout; this bootstrap does not create an active contract.

Commits follow Conventional Commits. Ordinary commits and pushes require authorization. This foundation includes no deployment, backend, assistant integration or test framework.
