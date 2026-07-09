---
name: validate
description: Validate every Grounded Register entry, its evidence references and report integrity without changing finding content.
disable-model-invocation: true
argument-hint: "[optional finding ID]"
---

# Validate Grounded Register

Run one of:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grounded-register.mjs" validate
```

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grounded-register.mjs" validate --id "$ARGUMENTS"
```

Then run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grounded-register.mjs" doctor
```

Report errors separately from warnings. Do not weaken evidence or classification rules merely to make validation pass.
