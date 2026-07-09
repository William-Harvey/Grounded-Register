---
name: grounded-register
description: Preserve material, evidence-backed out-of-scope engineering findings without expanding the current task.
---

# Grounded Register — standalone skill

While working, record important observations outside the current task in `docs/system-risk-improvement-register.md`.

A finding qualifies only when it is material, outside scope, non-duplicate and grounded by an exact file-and-line reference, trace, log, runtime observation, documented invariant or reproducible test.

Each entry must contain: what; code path or other evidence; impact (🔴/🟠/🟡); effort (S/M/L); priority; status; production/evaluation scope; relationship to the current task; why it was not fixed; and a bounded next step.

Do not record speculation, generic advice, preferences or ordinary in-scope work. Do not fix incidental findings inline. If a finding makes the current task unsafe or incorrect, record it, stop the affected work and surface it.

At completion, report every entry added or updated. Say “no new entries were logged” when applicable, not “no other issues exist”.
