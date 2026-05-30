---
name: repo-workflow
description: Project repo task discipline — keeping CLAUDE.md and CHANGELOG.md current on every task. Use this skill whenever starting, working on, or finishing ANY task inside this project repo, even if the user doesn't mention CLAUDE.md or the changelog. Trigger it at the start of every new task (to read context and log the current task), at the end of every task (to record changes in the changelog), and whenever the user sends a bare .md file with little or no other instruction (treat that file as a project proposal to execute). When in doubt about whether a request counts as a "task" in this repo, assume it does and use this skill.
---

# Repo Workflow

This skill enforces a consistent task discipline for this project repo. Follow it on every task so that `CLAUDE.md` always reflects what's currently being worked on and `CHANGELOG.md` always reflects what's been done.

## At the start of every task

Do these two things before writing any code or making changes:

1. **Read `CLAUDE.md` fully.** It holds project context, conventions, and the current task state. Read it even if you think you already know the project — it may have changed since your last task. If there's no `CLAUDE.md` at the repo root, create one (see structure below).

2. **Update the "Current Task" section of `CLAUDE.md`** to describe what you're about to do. Replace the previous current task — this section reflects the active task, not a history (history lives in the changelog). Keep it short: what the task is and any relevant scope or constraints.

If `CLAUDE.md` has no "Current Task" section yet, add one near the top.

## At the end of every task

**Update `CHANGELOG.md`.** Add an entry describing what changed. Put it under the **latest release section** unless the user explicitly says otherwise (e.g. "start a new release", "put this under v2.0"). If `CHANGELOG.md` doesn't exist, create one following the structure below.

Write changelog entries from the reader's perspective — what changed and why it matters — not a literal diff. Group related changes into a single entry rather than one line per file.

## Bare .md file = project proposal

If the user sends **just a `.md` file** (or a `.md` file with little or no accompanying instruction), treat the contents of that file as a **project proposal**: read it, and do what it describes. Apply all the best practices and instructions in this skill while doing so — read and update `CLAUDE.md` at the start, update `CHANGELOG.md` at the end.

## File structure references

### CLAUDE.md

Expected shape (adapt to what already exists — don't clobber existing content):

```markdown
# [Project Name]

## Current Task
[What's being worked on right now. Updated at the start of each task.]

## Overview
[What the project is.]

## Conventions
[Stack, patterns, anything Claude should respect when making changes.]
```

### CHANGELOG.md

Follow Keep a Changelog conventions. Newest release at the top:

```markdown
# Changelog

## [Unreleased] or [latest version]
### Added
- ...
### Changed
- ...
### Fixed
- ...

## [previous version] - YYYY-MM-DD
...
```

"Latest release" means the topmost version section. Add new entries there unless told to start a new one.

## Order of operations recap

**Example — normal task:**
1. Read `CLAUDE.md`
2. Update `CLAUDE.md` → Current Task
3. Do the work
4. Update `CHANGELOG.md` under the latest release

**Example — user sends just `feature-x.md`:**
1. Read `CLAUDE.md`
2. Read `feature-x.md` as the project proposal
3. Update `CLAUDE.md` → Current Task to reflect the proposal
4. Execute the proposal
5. Update `CHANGELOG.md` under the latest release
