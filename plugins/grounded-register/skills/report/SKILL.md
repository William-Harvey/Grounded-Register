---
name: report
description: Validate Grounded Register and regenerate its human-readable Markdown report from the structured finding records.
disable-model-invocation: true
---

# Regenerate the register report

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grounded-register.mjs" render
node "${CLAUDE_PLUGIN_ROOT}/scripts/grounded-register.mjs" summary
```

Return the report path and concise totals for open findings, impact and production/evaluation scope. Do not edit the generated Markdown directly.
