---
name: capture
description: Capture a material, evidence-backed engineering risk, limitation, latent bug or improvement discovered outside the current task. Use when the observation matters but should not expand the current scope.
argument-hint: "[short finding title]"
---

# Capture a grounded incidental finding

Use this skill only when an observation is outside the requested task and deserves to survive the session.

## Eligibility gate

Capture the finding only when all conditions are true:

1. It is outside the current acceptance criteria.
2. It has material impact on correctness, data integrity, security, privacy, compliance, reliability, performance, observability, maintainability, evaluation quality, genericity, multilingual operation, accessibility or future delivery.
3. It is supported by inspectable evidence.
4. It is not already represented by the same root cause in the register.
5. Recording it will not be used to justify expanding the current task.

Do not capture:

- speculation or unsupported possibilities;
- generic best-practice advice;
- stylistic preferences;
- ordinary work required by the current task;
- duplicate symptoms of an existing root cause;
- secrets, credentials, personal data or large raw logs.

## Decide whether work continues

Use `incidental` when the requested work remains safe and correct. Record the finding, leave it unfixed and continue.

Use `blocking` only when continuing would produce an incorrect result, corrupt or conceal data, create a material security or compliance risk, invalidate the requested evaluation, or make the change unsafe to merge or rely upon. Blocking findings must use P0. Record the finding, stop the affected work and surface it immediately.

## Evidence standard

Every finding needs at least one of:

- an exact repository-relative file and line range;
- a reproducible command or test with the observed result;
- a stable trace, log or artefact reference;
- a runtime observation;
- a deterministic contradiction with a documented invariant.

A code reference proves only what the cited code shows. Do not overstate runtime impact.

## Workflow

1. If `.grounded-register/config.json` does not exist, run:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/grounded-register.mjs" init
   ```

2. Search `.grounded-register/findings/*.json` for the same title, code path, invariant and root cause. Update an existing entry only when the new evidence materially strengthens it.

3. Choose a concise title. Use `$ARGUMENTS` when it contains a usable title; otherwise derive one from the grounded observation. Generate a draft with that title:

   ```bash
   mkdir -p .grounded-register/drafts
   node "${CLAUDE_PLUGIN_ROOT}/scripts/grounded-register.mjs" template --title "CHOSEN TITLE" > .grounded-register/drafts/finding.json
   ```

4. Replace every placeholder with grounded content. Keep the claim no broader than the evidence.

5. Add it through the deterministic validator:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/grounded-register.mjs" add --file .grounded-register/drafts/finding.json
   rm -f .grounded-register/drafts/finding.json
   ```

6. Continue the original task unless the finding is blocking.

## Required entry shape

The entry must include:

- what was found;
- exact code path, test, trace, log, runtime observation or invariant;
- impact: critical, high or moderate;
- effort: S, M or L;
- priority: P0–P3;
- status: spotted, scoped, planned, fixed, accepted or dismissed;
- production, evaluation or both;
- relationship to the current task;
- why it was not fixed inline;
- bounded next step;
- timestamps and creator;
- resolution evidence when closed.

## Final communication

When a finding is added or materially updated, the final task response must name its ID and title, impact, production/evaluation scope, whether work continued or stopped, and confirm that incidental findings were not fixed inline.
