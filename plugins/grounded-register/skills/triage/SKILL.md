---
name: triage
description: Review open Grounded Register entries for duplicates, evidence quality, impact, effort, priority and next-step readiness without implementing fixes.
disable-model-invocation: true
argument-hint: "[optional finding ID or category]"
---

# Triage Grounded Register

Review the open JSON entries in `.grounded-register/findings/`.

For each relevant entry:

1. Confirm that the claim remains no broader than its evidence.
2. Check for duplicate symptoms sharing one root cause.
3. Reassess impact independently from priority.
4. Confirm effort is a realistic order-of-magnitude estimate.
5. Decide whether the entry remains `spotted`, is sufficiently understood for `scoped`, or has approved work for `planned`.
6. Tighten the recommended next step into bounded acceptance criteria.
7. Preserve original evidence and history.

Do not fix the underlying code. Do not mark an entry `fixed` without independent resolution evidence. Validate and regenerate the report after any register edits.
