# LiftOff Agent Instructions

`CLAUDE.md` is the single source of truth for project context, constraints, and the active task.

Before starting any task:

1. Read `CLAUDE.md` fully.
2. Update the `## ⚡ Active Task` block in `CLAUDE.md`.

At the end of every update, add the shipped change to the latest release section in `CHANGELOG.md` unless asked otherwise.

If the user sends only a `.md` file, treat it as a project proposal and carry it out while following `CLAUDE.md`.
