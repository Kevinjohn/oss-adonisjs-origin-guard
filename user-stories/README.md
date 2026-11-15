# User story catalogue

Source baseline: `c748e5d63dd34385ee441001b07e07bca0749fca` (origin/main, 2026-11-14). Scope: the public exports in `index.ts`: the cross-site write guard and its decision function, public and trusted origin parsing, and the private-peer check. Source-reviewed only; no runtime journeys were exercised for this catalogue.

## Index

| Story                                                    | Action                             | Status   |
| -------------------------------------------------------- | ---------------------------------- | -------- |
| [US-ORIGIN-01](US-ORIGIN-01-refuse-cross-site-writes.md) | Refuse cross-site writes           | Current  |
| [US-ORIGIN-02](US-ORIGIN-02-validate-public-origin.md)   | Validate the public origin         | Operator |
| [US-ORIGIN-03](US-ORIGIN-03-parse-trusted-origins.md)    | Parse the trusted origin list      | Operator |
| [US-ORIGIN-04](US-ORIGIN-04-trust-private-proxy.md)      | Trust a proxy on a private network | Operator |

## Files

- [Template and maintenance rules](TEMPLATE.md)
- [Roles, interfaces and source map](REFERENCE.md)
- [Capability coverage](COVERAGE.md)
- [Decision gaps](GAPS.md)
