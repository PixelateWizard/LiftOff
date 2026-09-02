# LiftOff Agent Bootstrap

This file is intentionally compact. Read it fully at the start of every task, then route to only the relevant playbooks in [`.agents/docs/README.md`](.agents/docs/README.md).

## ⚡ Active Task

- **Delivered — Details section-label contrast:** About/Media-style Game Details headings now use the active theme's primary foreground at a deliberately subdued but legible opacity instead of dimming an inherited browser color; a component regression test covers both labels. The full frontend test suite, production build, docs check, and diff validation pass; native WebView2 review across the full theme gallery remains the visual gate.

## Start-of-Task Workflow

1. Read this file fully.
2. Replace the Active Task above with a short description of the requested work and its scope before implementation.
3. Open [`.agents/docs/README.md`](.agents/docs/README.md) and select the smallest relevant playbook set.
4. Inspect the current source anchors named by those playbooks. Source code and configuration are authoritative if documentation has drifted.
5. Preserve unrelated user changes in a dirty worktree.

If the user sends only a `.md` file, treat it as a project proposal and carry it out through this workflow.

## Non-Negotiable Rules

1. **English-only code comments.** Respond in the user's language, but keep every code comment in English.
2. **Persisted Rust fields require serde defaults.** Every new field in `Settings` or another persisted Rust struct needs `#[serde(default)]` or `#[serde(default = "...")]` and a matching default initializer.
3. **Mirror shipped settings across layers.** Keep Rust settings/defaults, TypeScript types/defaults, Settings UI, and locales aligned unless the request explicitly scopes a backend-only foundation.
4. **No unapproved Xbox branding in shipped UI.** Do not ship the Xbox logo or the word “Xbox” in user-facing UI without Microsoft trademark approval; use generic account/gamepad visuals. Technical source identifiers may remain internal.
5. **Secrets stay out of source, JSON, logs, and DOM.** SGDB and Spotify identifiers remain user-supplied where required; refresh tokens belong in Windows Credential Manager.
6. **Honor scope boundaries.** Do not expand a narrowly requested backend, frontend, theme, mode, or validation task into adjacent work.
7. **Validate the real surface.** Browser mocks and compilation do not prove WebView2/Tauri IPC, native windows, launcher integration, FSE handoff, controller feel, haptics, or real account behavior.
8. **Do not overwrite unrelated work.** Never revert or reformat user changes outside the task.

## Project Essentials

- **Product:** LiftOff, a Windows controller-first game/app launcher.
- **Stack:** Tauri 2, Rust backend, React frontend, incremental TypeScript adoption.
- **Identifier:** `com.taylo.liftoff`.
- **Current version:** `2.0.0-alpha-6`; app-owned version markers must move together for releases.
- **Frontend root:** `src/App.jsx`, with domain hooks, views, components, contexts, and theme helpers under `src/`.
- **Backend root:** `src-tauri/src/lib.rs`, with specialized modules in `src-tauri/src/`.
- **Development:** `npm run dev` plus `npm run tauri -- dev`.
- **Installer:** use the NSIS bundle from `src-tauri/target/release/bundle/nsis/` for release testing, not the raw executable.

## Documentation Routing

Start at [the router](.agents/docs/README.md). The durable playbooks are:

- [Architecture](.agents/docs/architecture.md)
- [Settings and persistence](.agents/docs/settings-persistence.md)
- [Library and launching](.agents/docs/library-launching.md)
- [Controller and navigation](.agents/docs/controller-navigation.md)
- [Home, art, and media](.agents/docs/home-art-media.md)
- [Themes, surfaces, and motion](.agents/docs/themes-surfaces-motion.md)
- [Integrations](.agents/docs/integrations.md)
- [Testing and release](.agents/docs/testing-release.md)
- [Known issues and validation gates](.agents/docs/known-issues.md)

Do not routinely read [the frozen legacy handoff](.agents/docs/archive/claude-handoff-legacy-2026-08-15.md). It exists only for historical investigation and may be stale.

## Source-of-Truth Boundaries

- This file owns global rules, project essentials, routing, and the live Active Task.
- `.agents/docs/README.md` owns task-to-playbook routing.
- Domain playbooks own durable constraints and validation patterns, not session history.
- Source code, manifests, and tests own current implementation truth.
- `CHANGELOG.md` owns shipped history.
- `.agents/docs/known-issues.md` owns unresolved exact failures, deferred mechanisms, and hardware gates.

## Validation Baseline

- Run `npm run build` and `git diff --check` for every implementation task.
- Add `cargo check` and targeted Rust tests for `src-tauri` changes.
- Use `npm run test` for Vitest, `npm run test:e2e` for mocked-Tauri Playwright, and `npm run test:all` for both when relevant.
- Run `npm run docs:check` before final handoff after changing `CLAUDE.md`, `AGENTS.md`, anything under `.agents/docs/`, or either repo-workflow skill copy.
- Record skipped runtime/hardware gates honestly; never convert them into passing claims.

## End-of-Task Workflow

1. Run the relevant validation and inspect the final diff.
2. Rewrite Active Task to match what actually shipped and list any remaining gate briefly.
3. Update the applicable playbook only if durable guidance changed.
4. Add shipped behavior or developer-workflow changes to the latest `CHANGELOG.md` section unless the user asked otherwise.
5. Keep unresolved work in `known-issues.md`, not in release notes or an accumulating completed-session block here.
