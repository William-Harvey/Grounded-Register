# Design

## Design goal

Preserve material out-of-scope findings without turning them into unapproved work.

## Judgement versus enforcement

Claude handles contextual judgement:

- whether an observation is material;
- whether it is outside scope;
- whether evidence supports the claim;
- whether it is incidental or blocking;
- whether an existing entry has the same root cause.

Deterministic scripts enforce what can be checked reliably:

- schema and enum values;
- file existence and line ranges;
- ID and filename consistency;
- evidence presence;
- status transition requirements;
- report generation;
- end-of-task disclosure of changed IDs.

The plugin does not claim that a hook can inspect hidden reasoning or discover every missed issue.

## Storage model

One JSON file per finding is the source of truth. A stable Markdown file is generated for humans.

This reduces merge conflicts, supports validation and allows future integrations without parsing prose.

## Session lifecycle

### SessionStart

- detects an existing register;
- snapshots current finding hashes in `${CLAUDE_PLUGIN_DATA}`;
- injects the operating contract;
- does not create repository files merely because a session started.

### Capture

- searches for duplicates;
- generates a draft;
- validates it before adding it to the register;
- regenerates the report;
- returns to the original task unless blocking.

### SubagentStart

- injects a compact contract;
- asks subagents to return a `GROUNDED_REGISTER_CANDIDATE` to the parent;
- avoids assuming every subagent has permission to edit the register.

### Stop

- validates all findings;
- regenerates the report when valid;
- detects finding deletion;
- compares finding hashes with the session baseline;
- asks Claude to name changed IDs in the final response;
- limits repeated feedback types to prevent a Stop-hook loop.

## Status model

- `spotted`: grounded but not formally scoped;
- `scoped`: root cause and likely remediation are understood;
- `planned`: approved work exists;
- `fixed`: corrected and independently verified;
- `accepted`: risk deliberately accepted with evidence and reason;
- `dismissed`: disproved, duplicate or no longer applicable.

Entries are closed rather than deleted so the engineering history survives.

## Impact and priority

Impact and priority are separate.

- Impact describes the consequence if the finding manifests.
- Priority describes when it should receive approved attention.

P0 is reserved for findings that block safe or correct completion of the current work.
