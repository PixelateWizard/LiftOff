---
name: repo-workflow
description: Project repo task discipline for the compact CLAUDE.md bootstrap, routed agent playbooks, validation, and CHANGELOG.md updates. Use for every task in this repository.
---

# Repo Workflow

Use this skill for every task in the LiftOff repository.

## Start

1. Read the repository-root `CLAUDE.md` fully.
2. Replace its `## ⚡ Active Task` block with a short description of the requested work and scope before implementation.
3. Read `.agents/docs/README.md` and select only the relevant domain playbooks.
4. Inspect the current source anchors named by those playbooks. Source code and configuration win if documentation has drifted.
5. If the user supplied only a Markdown file, treat it as a project proposal.

## Finish

1. Run the validation required by `CLAUDE.md` and the selected playbooks.
2. Reopen `CLAUDE.md` and rewrite Active Task to describe the delivered state and any remaining gate.
3. Update a domain playbook only when a durable rule, architecture fact, warning, or validation pattern changed.
4. Add the shipped behavior or developer-workflow change to the latest `CHANGELOG.md` section unless the user explicitly requested otherwise.
5. Put unresolved exact failures and hardware gates in `.agents/docs/known-issues.md`; do not accumulate completed-session history in `CLAUDE.md`.

## Documentation Ownership

- `CLAUDE.md`: bootstrap, global rules, routing, and live Active Task.
- `.agents/docs/README.md`: task router.
- Domain playbooks: durable guidance.
- Source/config/tests: current implementation truth.
- `CHANGELOG.md`: shipped history.
- `.agents/docs/archive/`: historical evidence only; never a default read.

## Validation

- Baseline: `npm run build` and `git diff --check`.
- Add `cargo check` and targeted Rust tests for backend work.
- Add task-specific browser/native/hardware checks without overstating mocked coverage.
- Before final handoff, run `npm run docs:check` if the task changed `CLAUDE.md`, `AGENTS.md`, anything under `.agents/docs/`, or either repo-workflow skill copy. Do not wire it into CI, Git hooks, builds, or normal tests.
