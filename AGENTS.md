# Working agreements

Human instructions and the approved scope take precedence over the framework guidance below. That guidance informs version-specific Next.js implementation; it does not authorize additional features, dependencies, commits, pushes or merges.

## Scope and skills

- Implement only the approved plan or milestone. Propose material additions before implementing them.
- Use the global `cohesive-architecture` skill for meaningful code and configuration changes. Reference it rather than duplicating its architecture rules here.
- Use the global `milestone-authoring` skill when asked to create or revise an approved milestone.
- Use the global `milestone-workflow` skill for **Run Active Milestone**. Read the current working copy's `.agents/milestones/active.md`; only the human merges.
- Keep the active contract locally ignored through Git's `info/exclude`, not the project `.gitignore`. Do not create a placeholder contract or run milestones for ordinary setup work.
- Preserve unrelated work. Ordinary commits and pushes require explicit authorization; an authorized milestone follows its skill's Git workflow. Use Conventional Commits, such as `feat: add project filters` or `chore: initialize Next.js workspace`.

## Human-readable code

- Use descriptive names such as `selectedProject`, `isNavigationOpen` and `handleNavigationClose`. Avoid vague names and unexplained abbreviations.
- Separate meaningful stages with a blank line: declarations, validation, derived values, effects and rendering. Keep closely related statements together.
- Use braces for control-flow blocks, avoid nested ternaries and name intermediate values when an expression becomes difficult to follow.
- Use one variable declaration per statement; related destructuring is appropriate.
- Keep functions and components focused. Split at meaningful responsibility boundaries, without arbitrary line limits or extracting trivial helpers just to shorten a file.
- Keep JSX readable through clear conditional branches and semantic CSS class names.
- Colocate component-specific CSS Modules with their owner. Keep global CSS for application-wide base styles and future approved tokens. Prefer shallow selectors; avoid unused declarations, repeated overrides and speculative utility classes.
- Before finishing, review naming, logical grouping, control flow, responsibility boundaries and CSS ownership. Automated checks do not replace this review.

## Verification and safety

- Use npm and Node 22.x. Run `npm run check` and `npm run build` before reporting completion; add appropriate browser and behavioural verification when implementing features.
- `npm run format` applies formatting. Linting, type checking and builds are supplementary checks, not behavioural tests. Do not add a placeholder test command.
- Never read, inspect, print or copy `.env`, `.env.local` or other secret-bearing files. Non-secret example files may be inspected. Never expose credentials or dump environment variables.
- Keep design-system components, portfolio sections and integrations out of scope until separately approved. The approved Paper composition is linked in the README; its source pages hold the motion specifications.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
