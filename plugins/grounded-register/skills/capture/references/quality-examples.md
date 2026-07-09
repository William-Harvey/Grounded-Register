# Grounded Register quality examples

## Good: bounded code-path finding

**Claim:** The export reader does not apply the active snapshot predicate used by the report reader.

**Evidence:** Exact line ranges for both query builders and a regression test returning rows from two snapshot IDs.

**Why it qualifies:** It is specific, reproducible and outside the layout task in which it was discovered.

## Good: multilingual evaluation limitation

**Claim:** The German evaluation path falls back to English labels when the locale-specific catalogue lookup misses.

**Evidence:** Exact fallback branch, a German fixture and the observed English output.

**Why it qualifies:** It describes the observed failure without claiming that every German output is affected.

## Reject: speculative improvement

“Caching might make this faster.”

No trace, benchmark, hot path or reproducible performance evidence is supplied.

## Reject: in-scope defect

A test fails because the function currently being changed does not meet the requested acceptance criteria.

That belongs to the current task, not the incidental register.

## Block and surface

A migration requested in the current task deletes active rows under a reproducible fixture.

This invalidates safe completion. Record it as blocking P0 and stop the affected work.
