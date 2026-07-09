# Security

Grounded Register runs locally and uses Node.js built-ins only.

It does not send findings, code or telemetry to an external service.

The validator rejects common private-key and credential patterns. This is defence in depth, not a complete secret scanner. Register entries should store concise observations and stable references, not full logs, environment dumps, customer data or credentials.

## Reporting a vulnerability

Report security issues privately to the repository maintainer before opening a public issue. Add a security contact before publishing the repository.
