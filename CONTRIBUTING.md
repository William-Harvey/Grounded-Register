# Contributing

Contributions should preserve the central contract:

- grounded evidence only;
- no speculative wish-list padding;
- no inline scope expansion;
- blocking findings stop unsafe work;
- closed findings retain history.

Run before submitting changes:

```bash
npm run check
```

When Claude Code is available, also run:

```bash
claude plugin validate ./plugins/grounded-register --strict
```

Add tests for every validator, hook or report behaviour change.
