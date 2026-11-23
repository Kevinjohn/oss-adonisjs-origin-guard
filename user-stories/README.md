# User story catalogue

Reviewed against source commit `b33d133515cf9f90ca9f3ab0017c3906299e6cf5`, including package entry points, host integration, and startup and request refusal paths.

## Index

| Story                                                    | Action                                                            | Status   |
| -------------------------------------------------------- | ----------------------------------------------------------------- | -------- |
| [US-ORIGIN-01](US-ORIGIN-01-refuse-cross-site-writes.md) | Refuse cross-site writes                                          | Current  |
| [US-ORIGIN-02](US-ORIGIN-02-validate-public-origin.md)   | Validate the public origin                                        | Operator |
| [US-ORIGIN-03](US-ORIGIN-03-parse-trusted-origins.md)    | Parse the trusted origin list                                     | Operator |
| [US-ORIGIN-04](US-ORIGIN-04-trust-private-proxy.md)      | Trust a proxy on a private network                                | Operator |
| [US-ORIGIN-05](US-ORIGIN-05-install-and-start.md)        | Install the origin-check middleware and validate settings at boot | Operator |

## Files

- [Template and maintenance rules](TEMPLATE.md)
- [Roles, interfaces and source map](REFERENCE.md)
- [Capability coverage](COVERAGE.md)
- [Decision gaps](GAPS.md)
