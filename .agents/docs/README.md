# LiftOff Agent Documentation Router

This directory contains durable engineering guidance for LiftOff. It is intentionally routed: do not read every playbook for every task.

## Startup Workflow

1. Read the repository-root [`CLAUDE.md`](../../CLAUDE.md) fully.
2. Update its `## ⚡ Active Task` block before implementation.
3. Use the routing table below to select the smallest relevant playbook set.
4. Inspect the current source anchors named by those playbooks. Source code and configuration win if documentation has drifted.
5. Implement and validate the task, then update the applicable durable playbook only when a reusable rule or architecture fact changed.
6. Record shipped work in the latest section of [`CHANGELOG.md`](../../CHANGELOG.md).

If no route is obvious, search this directory with task keywords before opening multiple files:

```powershell
rg -n -i "keyword" .agents/docs --glob "!archive/**"
```

The [`archive/`](archive/) directory is historical evidence only and is never part of normal startup.

## Routing Table

| Task cues | Read first | Add when needed |
|---|---|---|
| Repository layout, refactor, ownership, new module, data flow | [Architecture](architecture.md) | [Testing and release](testing-release.md) |
| Settings, defaults, migration, saved JSON, localization | [Settings and persistence](settings-persistence.md) | [Testing and release](testing-release.md) |
| Scanner, library refresh, launch path, process/window lifecycle, FSE | [Library and launching](library-launching.md) | [Controller and navigation](controller-navigation.md), [Known issues](known-issues.md) |
| Gamepad, focus, modal input, scrolling, UI scale, haptics | [Controller and navigation](controller-navigation.md) | [Home, art, and media](home-art-media.md), [Known issues](known-issues.md) |
| Home modes, hero, collections, Details, art, trailers | [Home, art, and media](home-art-media.md) | [Controller and navigation](controller-navigation.md), [Themes and surfaces](themes-surfaces-motion.md) |
| Theme, accent, surface, background, motion, visual performance | [Themes, surfaces, and motion](themes-surfaces-motion.md) | [Controller and navigation](controller-navigation.md), [Known issues](known-issues.md) |
| Steam, Microsoft/Xbox, Spotify, Cloud, SGDB, external account/API | [Integrations](integrations.md) | [Settings and persistence](settings-persistence.md), [Library and launching](library-launching.md) |
| Tests, validation claim, dependency/version change, release notes | [Testing and release](testing-release.md) | [Known issues](known-issues.md) |
| Bug triage, deferred work, warnings, hardware gate, performance measurement | [Known issues](known-issues.md) | The affected domain playbook |

## Source-of-Truth Boundaries

- `CLAUDE.md` is the compact bootstrap, global rule set, and live Active Task.
- This index routes durable domain guidance; domain playbooks do not keep session history.
- `CHANGELOG.md` is the shipped-history record.
- Current source code, configuration, and tests are authoritative for implementation facts.
- [`archive/claude-handoff-legacy-2026-08-15.md`](archive/claude-handoff-legacy-2026-08-15.md) is a frozen pre-migration snapshot for historical investigation only.

## Maintenance Rules

- Prefer behavior and invariants over line numbers, exhaustive symbol lists, or transient implementation narration.
- Put a rule in one playbook and link to it elsewhere instead of duplicating it.
- Preserve exact unresolved errors and hardware gates in [Known issues](known-issues.md), not in `CLAUDE.md` or release notes.
- When adding or renaming a playbook, update this router and run `npm run docs:check`.
- Keep each playbook selective enough that an agent can read it with one related task, not as a replacement monolith.
