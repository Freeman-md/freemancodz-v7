# Working agreements

Human instructions and the approved scope take precedence over the framework guidance below. That guidance informs version-specific Next.js implementation; it does not authorize additional features, dependencies, commits, pushes or merges.

## Scope and skills

- Implement only the approved plan or milestone. Propose material additions before implementing them.
- Use the global `cohesive-architecture` skill for meaningful code and configuration changes. Reference it rather than duplicating its architecture rules here.
- Use the global `milestone-authoring` skill when asked to create or revise an approved milestone.
- Use the global `milestone-workflow` skill for **Run Active Milestone** or **Resume Active Milestone**. Both inspect the current working copy's `.agents/milestones/active.md` and existing PR evidence; resume preserves the branch, PR and review count. Only the human merges.
- Use the same skill for **Sync After Merge** to verify the active contract's merged PR and fast-forward/switch to its base while preserving local changes. This command does not start implementation, commit, push or delete branches.
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

## Shell ownership and naming

- Group section components and matching CSS Modules under `src/components/sections/<section>/`, such as `hero/`; keep section composition server-rendered and add client boundaries only for interaction.
- Shared components live directly in `src/components/shared/`, beside matching PascalCase CSS Modules; providers use PascalCase files in `src/providers/`.
- Hooks use kebab-case filenames in `src/hooks/` and `useCamelCase` exports. Shared configuration lives in `src/config/`; non-React navigation operations live in `src/lib/navigation/`, with lowercase hyphenated filenames.
- Components own presentation, hooks coordinate interactive state and lifecycle, and CSS owns motion timing. Keep `layout.tsx` and `page.tsx` as Server Components.

## Verification and safety

- Use npm and Node 22.x. Run `npm run check` and `npm run build` before reporting completion; add appropriate browser and behavioural verification when implementing features.
- `npm run format` applies formatting. Linting, type checking and builds are supplementary checks, not behavioural tests. Do not add a placeholder test command.
- Never read, inspect, print or copy `.env`, `.env.local` or other secret-bearing files. Non-secret example files may be inspected. Never expose credentials or dump environment variables.
- Keep additional design-system components, portfolio sections and integrations out of scope until separately approved. The approved Paper composition is linked in the README; its source pages hold the motion specifications.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
