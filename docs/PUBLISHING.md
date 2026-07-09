# Publishing

## 1. GitHub repository

The public repository is:

[https://github.com/William-Harvey/grounded-register](https://github.com/William-Harvey/grounded-register)

Push release changes to this repository.

The repository URLs are configured in:

```text
plugins/grounded-register/.claude-plugin/plugin.json
```

Recommended fields:

```json
{
  "homepage": "https://github.com/William-Harvey/grounded-register#readme",
  "repository": "https://github.com/William-Harvey/grounded-register"
}
```

## 2. Validate

```bash
npm run check
claude plugin validate ./plugins/grounded-register --strict
claude --plugin-dir ./plugins/grounded-register
```

Run `/grounded-register:initialise` in a disposable repository and test one incidental and one blocking finding.

## 3. Tag the release

```bash
git tag -a v0.1.0 -m "Grounded Register v0.1.0"
git push origin main --tags
```

The version in the marketplace entry and plugin manifest must match the release.

## 4. Share installation instructions

```text
/plugin marketplace add William-Harvey/grounded-register
/plugin install grounded-register@grounded-register-marketplace
```

## 5. Later marketplace submission

After external testing, submit the plugin to an appropriate Claude community marketplace. Independent GitHub distribution does not require Anthropic approval.
