# Grounded Register

Grounded Register is a Claude Code plugin that preserves important engineering findings discovered outside the current task without allowing them to derail delivery.

It gives AI-assisted development a durable place for:

> This is not what I was asked to work on, but it matters.

## The problem

Coding agents often notice latent bugs, weak observability, performance issues, evaluation limitations, genericity risks or multilingual gaps while working on something else.

Two responses are harmful:

1. Fix everything immediately and lose control of scope.
2. Ignore the observation and lose useful engineering intelligence.

Grounded Register records the finding with evidence, keeps the current task bounded, validates the register and requires Claude to disclose new entries in its final response.

## What the plugin contains

- **Capture skill:** decides whether an incidental observation qualifies.
- **SessionStart hook:** injects the operating contract into every session.
- **SubagentStart hook:** tells delegated agents to return structured candidates rather than fix unrelated issues.
- **Stop hook:** validates new entries, regenerates the report and checks that changed finding IDs appear in the final response.
- **Deterministic CLI:** creates IDs, validates evidence, checks file-and-line references and renders the Markdown report.
- **Standalone skill:** a lighter version for users who do not want hooks.

## Core contract

A finding is recorded only when it is:

- outside the requested scope;
- material enough to matter;
- grounded by a file-and-line reference, test, trace, log, runtime observation or documented invariant;
- not a duplicate of an existing root cause.

An incidental finding is logged and left unfixed. Work continues.

A finding that makes the current task unsafe or materially incorrect is logged as blocking P0. The affected work stops and Claude surfaces it.

## Repository structure

```text
.
├── .claude-plugin/marketplace.json
├── plugins/grounded-register/
│   ├── .claude-plugin/plugin.json
│   ├── hooks/hooks.json
│   ├── skills/
│   ├── scripts/
│   ├── schema/finding.schema.json
│   ├── standalone/grounded-register/SKILL.md
│   └── tests/
└── docs/
```

## Requirements

- Claude Code with plugin support
- Node.js 18 or later
- Git is recommended but not required

The plugin uses Node.js built-ins only. It has no runtime package dependencies and sends no project data to an external service.

## Install from GitHub

Run these commands inside Claude Code:

```text
/plugin marketplace add William-Harvey/grounded-register
/plugin install grounded-register@grounded-register-marketplace
```

Then open the project where you want to use Grounded Register and run:

```text
/grounded-register:initialise
```

Repository: [https://github.com/William-Harvey/grounded-register](https://github.com/William-Harvey/grounded-register)

## Test a local clone

Clone the repository and load the plugin directly:

```bash
git clone https://github.com/William-Harvey/grounded-register.git
cd grounded-register
claude --plugin-dir ./plugins/grounded-register
```

Then initialise it inside a disposable test repository:

```text
/grounded-register:initialise
```

## Skills

| Skill | Purpose |
|---|---|
| `/grounded-register:initialise` | Create project configuration, findings storage and report |
| `/grounded-register:capture` | Capture an evidence-backed incidental finding |
| `/grounded-register:validate` | Validate entries and evidence references |
| `/grounded-register:report` | Regenerate and summarise the Markdown report |
| `/grounded-register:triage` | Review evidence, duplicates, impact and readiness without fixing code |
| `/grounded-register:resolve` | Close a finding with verification evidence |

Only `capture` is available for automatic model invocation. The other workflows require explicit user invocation.

## Files created in the user's project

```text
.grounded-register/
├── config.json
├── .gitignore
└── findings/
    ├── .gitkeep
    └── GR-20260709-7F3C.json

docs/
└── system-risk-improvement-register.md
```

Each finding is stored separately to reduce merge conflicts. The Markdown report is generated from those JSON records and should not be edited directly.

## Entry shape

Every finding records:

- what was found;
- finding type and category;
- incidental or blocking relationship;
- exact evidence;
- impact: critical, high or moderate;
- effort: S, M or L;
- priority: P0–P3;
- status;
- production, evaluation or both;
- relationship to the current task;
- why it was not fixed inline;
- bounded next step;
- creation and update metadata;
- resolution evidence when closed.

## Reporting behaviour

When entries change, Claude's final response must include a **Grounded Register** section naming each changed ID, title, impact, scope and whether work continued or stopped.

See a generated example in [`docs/SAMPLE_REPORT.md`](docs/SAMPLE_REPORT.md).

The generated repository report includes:

- executive totals;
- P0/P1 immediate attention;
- full evidence-backed open findings;
- fixed, accepted and dismissed history;
- register controls and quality references.

## CLI

```bash
node plugins/grounded-register/scripts/grounded-register.mjs help
```

Available commands:

```text
init
new-id
template
add
validate
render
summary
list
doctor
```

## Validation controls

The deterministic validator rejects:

- missing required fields;
- invalid IDs and filenames;
- broken or unsafe file references;
- line ranges outside the referenced file;
- missing evidence;
- P0 findings that are not blocking;
- blocking findings that are not P0;
- secrets or likely credentials;
- closed entries without resolution evidence;
- fixed entries without test or runtime verification.

It warns about duplicate titles, unsupported fields, weakly grounded speculative language and questionable impact/priority combinations.

## Configuration

Edit `.grounded-register/config.json` in the user's repository:

```json
{
  "schema_version": 1,
  "register_title": "System Risk & Improvement Register",
  "findings_path": ".grounded-register/findings",
  "report_path": "docs/system-risk-improvement-register.md",
  "strict_stop_validation": true,
  "require_commit_reference": false,
  "require_resolution_test": true,
  "quality_reference_files": []
}
```

Project-specific quality examples can be listed in `quality_reference_files`. The public plugin does not hard-code DMCI or Staysure references.

## Important limitation

The plugin cannot read Claude's hidden reasoning or guarantee that every possible issue is noticed. It governs findings Claude explicitly identifies during visible work. It makes those findings structured, grounded, durable and difficult to omit from the final report.

## Development

```bash
npm test
npm run check
```

With Claude Code installed:

```bash
claude plugin validate ./plugins/grounded-register --strict
claude --plugin-dir ./plugins/grounded-register
```

## Similar projects

See [`docs/COMPARISON.md`](docs/COMPARISON.md). The nearest projects perform intentional audits, create architecture risk registers or preserve general session memory. Grounded Register focuses on governing incidental findings discovered during unrelated work.

## Publishing

See [`docs/PUBLISHING.md`](docs/PUBLISHING.md) for the GitHub release and installation workflow.

## Licence

MIT
