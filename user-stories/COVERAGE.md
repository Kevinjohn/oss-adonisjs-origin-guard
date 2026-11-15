# Capability coverage

“New” means newly documented, not newly implemented. Test links identify useful source evidence; no runtime tests were run for this catalogue.

| Story                                                    | Action                                                          | Access                                             | Status   | Catalogue |
| -------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------- | -------- | --------- |
| [US-ORIGIN-01](US-ORIGIN-01-refuse-cross-site-writes.md) | Refuse writes whose `Origin` or `Sec-Fetch-Site` is not trusted | Every request through the host's server middleware | Current  | New       |
| [US-ORIGIN-02](US-ORIGIN-02-validate-public-origin.md)   | Validate the served origin and report whether it is HTTPS       | Host code at startup                               | Operator | New       |
| [US-ORIGIN-03](US-ORIGIN-03-parse-trusted-origins.md)    | Parse a comma-separated list into exact trusted origins         | Host code at startup                               | Operator | New       |
| [US-ORIGIN-04](US-ORIGIN-04-trust-private-proxy.md)      | Trust forwarded headers only from loopback or private peers     | AdonisJS `trustProxy`                              | Operator | New       |

Public exports mapped: `createOriginGuard`, `isTrustedUnsafeOrigin`, `OriginGuardConfig` and `UnsafeRequestHeaders` (US-ORIGIN-01); `resolvePublicOrigin` and `PublicOrigin` (US-ORIGIN-02); `parseOrigins` (US-ORIGIN-03); `isPrivatePeer` (US-ORIGIN-04). The package has one export path (`.`), no provider and no `configure` hook. No prior story catalogue existed; all rows are newly documented.
