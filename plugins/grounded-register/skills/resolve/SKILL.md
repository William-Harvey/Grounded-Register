---
name: resolve
description: Close a Grounded Register finding as fixed, accepted or dismissed with durable verification evidence and retained history.
disable-model-invocation: true
argument-hint: "<finding ID> <fixed|accepted|dismissed>"
---

# Resolve a finding

Parse `$ARGUMENTS` as a finding ID and target closed status.

Read the matching JSON record. Do not delete it.

For `fixed`:

- describe the correction;
- record the verification date, verifier and commit when available;
- include a reproducible test or runtime verification in `resolution.evidence`;
- update `status` and `updated_at`.

For `accepted` or `dismissed`:

- record the decision or dismissal reason;
- identify who verified or approved it;
- retain supporting evidence;
- update `status` and `updated_at`.

Then run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grounded-register.mjs" validate --id <ID>
node "${CLAUDE_PLUGIN_ROOT}/scripts/grounded-register.mjs" render
```

Do not close an entry merely because code changed. Closure requires evidence.
