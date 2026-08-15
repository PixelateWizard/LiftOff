import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsRoot = path.join(repoRoot, ".agents", "docs");

const playbooks = [
  "architecture.md",
  "settings-persistence.md",
  "library-launching.md",
  "controller-navigation.md",
  "home-art-media.md",
  "themes-surfaces-motion.md",
  "integrations.md",
  "testing-release.md",
  "known-issues.md",
];

const checkedMarkdown = [
  "CLAUDE.md",
  "AGENTS.md",
  ".agents/docs/README.md",
  ...playbooks.map((name) => `.agents/docs/${name}`),
];

const requiredPlaybookSections = [
  "## Purpose",
  "## Read When",
  "## Durable Constraints",
  "## Current Source Anchors",
  "## Common Failure Modes",
  "## Validation",
];

const errors = [];

function read(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function requireSections(relativePath, content, sections) {
  for (const section of sections) {
    if (!content.includes(section)) {
      errors.push(`${relativePath}: missing required section "${section}"`);
    }
  }
}

function checkLocalLinks(relativePath, content) {
  const sourceDir = path.dirname(path.join(repoRoot, relativePath));
  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

  for (const match of content.matchAll(linkPattern)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (
      !rawTarget ||
      rawTarget.startsWith("#") ||
      /^[a-z][a-z0-9+.-]*:/i.test(rawTarget)
    ) {
      continue;
    }

    const withoutFragment = rawTarget.split("#", 1)[0];
    let decodedTarget = withoutFragment;
    try {
      decodedTarget = decodeURIComponent(withoutFragment);
    } catch {
      errors.push(`${relativePath}: link is not valid URI text: ${rawTarget}`);
      continue;
    }

    const resolvedTarget = path.resolve(sourceDir, decodedTarget);
    const relativeTarget = path.relative(repoRoot, resolvedTarget);
    if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
      errors.push(`${relativePath}: link escapes the repository: ${rawTarget}`);
      continue;
    }
    if (!fs.existsSync(resolvedTarget)) {
      errors.push(`${relativePath}: broken local link: ${rawTarget}`);
    }
  }
}

const claude = read("CLAUDE.md");
const claudeLineCount =
  claude.split(/\r?\n/).length - (/\r?\n$/.test(claude) ? 1 : 0);
if (claudeLineCount > 200) {
  errors.push(`CLAUDE.md: ${claudeLineCount} lines exceeds the 200-line ceiling`);
}
requireSections("CLAUDE.md", claude, [
  "## ⚡ Active Task",
  "## Start-of-Task Workflow",
  "## Non-Negotiable Rules",
  "## Documentation Routing",
  "## Source-of-Truth Boundaries",
  "## Validation Baseline",
  "## End-of-Task Workflow",
]);

const agents = read("AGENTS.md");
if (!agents.includes("Before final handoff, run `npm run docs:check`")) {
  errors.push("AGENTS.md: missing the path-triggered final-handoff docs check rule");
}

const router = read(".agents/docs/README.md");
requireSections(".agents/docs/README.md", router, [
  "## Startup Workflow",
  "## Routing Table",
  "## Source-of-Truth Boundaries",
  "## Maintenance Rules",
]);

for (const playbook of playbooks) {
  const relativePath = `.agents/docs/${playbook}`;
  const content = read(relativePath);
  requireSections(relativePath, content, requiredPlaybookSections);
  if (!router.includes(`](${playbook})`)) {
    errors.push(`.agents/docs/README.md: missing route to ${playbook}`);
  }
}

for (const relativePath of checkedMarkdown) {
  checkLocalLinks(relativePath, read(relativePath));
}

const agentSkill = read(".agents/skills/repo-workflow/SKILL.md");
const claudeSkill = read(".claude/skills/repo-workflow/SKILL.md");
if (agentSkill !== claudeSkill) {
  errors.push("Repo-workflow skill copies are not byte-identical");
}

const archivePath = ".agents/docs/archive/claude-handoff-legacy-2026-08-15.md";
const archive = read(archivePath);
if (!archive.includes("Archive only. Do not read this file during normal task startup.")) {
  errors.push(`${archivePath}: missing frozen archive warning`);
}

if (errors.length > 0) {
  console.error("Agent documentation check failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Agent documentation check passed (${claudeLineCount} CLAUDE.md lines, ${playbooks.length} routed playbooks).`,
  );
}
