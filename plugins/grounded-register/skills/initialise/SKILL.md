---
name: initialise
description: Initialise Grounded Register in the current repository and create its configuration, findings directory and generated Markdown report.
disable-model-invocation: true
argument-hint: "[optional repository path]"
---

# Initialise Grounded Register

Initialise the repository at `$ARGUMENTS`, or the current repository when no path is supplied.

When `$ARGUMENTS` contains a path, run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grounded-register.mjs" init --root "$ARGUMENTS"
node "${CLAUDE_PLUGIN_ROOT}/scripts/grounded-register.mjs" doctor --root "$ARGUMENTS"
```

When no path is supplied, run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grounded-register.mjs" init
node "${CLAUDE_PLUGIN_ROOT}/scripts/grounded-register.mjs" doctor
```

Report the files created. Do not overwrite an existing configuration.
