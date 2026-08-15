# Testing and Release

## Purpose

Define honest validation claims, baseline commands, documentation updates, and release/version handling.

## Read When

Read before reporting completion, adding tests, changing dependencies or versions, preparing a release, or updating handoff/changelog material.

## Durable Constraints

- Baseline validation is `npm run build` plus `git diff --check`.
- Add `cargo check` and targeted Rust tests whenever `src-tauri` changes.
- `npm run test` is Vitest/jsdom coverage; `npm run test:e2e` is a mocked-Tauri Playwright browser smoke; `npm run test:all` runs both.
- Mocked browser tests do not validate WebView2 IPC, native windows, launcher-mediated launch, FSE, haptics, controller feel, or real account/client integrations.
- Use `npm.cmd run tauri -- dev` and hands-on Ally validation for native/controller/visible handoff behavior.
- Update `CLAUDE.md` Active Task at task start and rewrite it at completion to reflect delivered state, not the initial plan.
- Update durable domain docs only for reusable rules or architecture. Put shipped reader-facing history in the latest `CHANGELOG.md` section and unresolved exact failures in `known-issues.md`.
- Version releases consistently across `src/constants.ts`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`/lock, and `package.json`/lock. Do not update website-facing version copy for alpha-only releases unless requested.
- Do not overwrite or revert unrelated user changes in a dirty worktree.

## Current Source Anchors

- `package.json`, `vitest.config.ts`, `playwright.config.ts`: test/build commands.
- `src/**/*.test.*`, `tests/e2e/`: automated coverage.
- `.github/workflows/ci.yml`: current CI behavior; the agent-doc checker is intentionally not wired into CI.
- `CHANGELOG.md`, release-note files, version manifests: release-facing records.
- `.agents/skills/repo-workflow/SKILL.md` and `.claude/skills/repo-workflow/SKILL.md`: agent task discipline.

## Common Failure Modes

- Reporting compilation as device validation.
- Describing a rejected/intermediate approach in release notes.
- Updating the Active Task only before work and leaving it describing a stale plan afterward.
- Running a formatter that rewrites unrelated existing drift.
- Adding a new version marker in one manifest while leaving the other app-owned markers stale.

## Validation

- Run the task-appropriate checks and report warnings or skipped hardware gates explicitly.
- For documentation harness changes, run `npm run docs:check`, `npm run build`, and `git diff --check`.
- Inspect `git diff --stat` and `git status --short` before handoff.
- Confirm release notes contain validated shipped behavior only.
