# Similar Claude projects

Search reviewed: 9 July 2026.

A targeted search did not identify an exact equivalent to Grounded Register. Several projects are adjacent:

| Project | What it does | Difference from Grounded Register |
|---|---|---|
| [fastruby/tech-debt-skill](https://github.com/fastruby/tech-debt-skill) | Runs an intentional technical-debt audit for Ruby and Rails and compiles a report | Audit is the requested task; it does not primarily govern incidental findings discovered during unrelated work |
| [muthuspark/identify-tech-debt](https://github.com/muthuspark/identify-tech-debt) | Audits projects for hidden technical debt and separates confirmed findings from investigation leads | Proactive audit rather than an always-on scope-control contract |
| [navraj007in/architecture-cowork-plugin](https://github.com/navraj007in/architecture-cowork-plugin) | Includes an architecture risk-register command | Produces architecture risk artefacts on request rather than capturing incidental engineering observations across ordinary tasks |
| [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) | Preserves broad project context and observations between sessions | General memory system; it does not require this evidence schema, prevent inline fixes or enforce finding disclosure |
| [everyinc/compound-engineering-plugin](https://github.com/everyinc/compound-engineering-plugin) | Captures learning so future engineering work benefits | Broader engineering methodology rather than a dedicated risk/improvement ledger |

## Differentiator

Existing tools commonly ask Claude to look for problems, create a risk register or remember prior work.

Grounded Register governs what happens when Claude notices a separate material issue while doing something else:

1. Ground it with evidence.
2. Check for an existing root cause.
3. Record it durably.
4. Do not fix it inline.
5. Continue the requested task unless unsafe.
6. Disclose it at task completion.

This comparison is not an exhaustive catalogue. New plugins appear frequently.
