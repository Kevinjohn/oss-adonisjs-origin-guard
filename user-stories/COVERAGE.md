# Capability coverage

Each row links an observable package or host action to its implementation and test evidence.

| Story                                                    | Action                                                                                                         | Access                                             | Status   | Catalogue |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------- | --------- |
| [US-ORIGIN-01](US-ORIGIN-01-refuse-cross-site-writes.md) | Refuse writes unless `Origin` is trusted, or `Origin` is absent or empty and `Sec-Fetch-Site` is `same-origin` | Every request through the host's server middleware | Current  | Reviewed  |
| [US-ORIGIN-02](US-ORIGIN-02-validate-public-origin.md)   | Validate the served origin and report whether it is HTTPS                                                      | Host code at startup                               | Operator | Reviewed  |
| [US-ORIGIN-03](US-ORIGIN-03-parse-trusted-origins.md)    | Parse a comma-separated list into exact trusted origins                                                        | Host code at startup                               | Operator | Reviewed  |
| [US-ORIGIN-04](US-ORIGIN-04-trust-private-proxy.md)      | Trust forwarded headers only from loopback or private peers                                                    | AdonisJS `trustProxy`                              | Operator | Reviewed  |
| [US-ORIGIN-05](US-ORIGIN-05-install-and-start.md)        | Install, wire and validate the origin-check middleware before HTTP startup                                     | Host application developer                         | Operator | Added     |

Public exports mapped: `createOriginCheck` (alias of `createOriginGuard`), `isTrustedUnsafeOrigin`, `OriginGuardConfig` and `UnsafeRequestHeaders` (US-ORIGIN-01); `resolvePublicOrigin` and `PublicOrigin` (US-ORIGIN-02); `parseOrigins` (US-ORIGIN-03); `isPrivatePeer` (US-ORIGIN-04). The package has root and `./types` export paths, no provider and no `configure` hook. US-ORIGIN-05 covers the packed entry points and, from the source, the host boot sequence.
