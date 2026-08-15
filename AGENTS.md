# LiftOff Agent Instructions

`CLAUDE.md` is the compact bootstrap for every task. Read it fully, update its `## ⚡ Active Task` block, then use `.agents/docs/README.md` to select only the relevant domain playbooks.

Source code and configuration are authoritative when routed documentation has drifted. Shipped history belongs in `CHANGELOG.md`; unresolved gates belong in `.agents/docs/known-issues.md`.

Before final handoff, run `npm run docs:check` if the task changed `CLAUDE.md`, `AGENTS.md`, anything under `.agents/docs/`, or either repo-workflow `SKILL.md` copy. This is agent validation only; do not add it to CI, Git hooks, builds, or normal test commands.

At the end of each task, follow the validation and documentation workflow in `CLAUDE.md`. If the user sends only a `.md` file, treat it as a project proposal and carry it out through that workflow.
