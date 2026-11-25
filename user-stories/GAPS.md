# Decision gaps

The [integration decisions](../DECISIONS.md) record the fresh-install setup for the unreleased
source. The [v0.4.0 README](https://github.com/Kevinjohn/oss-adonisjs-origin-guard/blob/v0.4.0/README.md)
covers the published release.

| Boundary                        | Contract and source                                                                                                                               | Catalogue treatment                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Exact origin match              | [isTrustedUnsafeOrigin](../src/origin_check.ts) compares `Origin` as sent with no normalisation and never reads `Host` or the protocol.           | US-ORIGIN-01 relies on US-ORIGIN-02/03 to supply origins in serialized form; it does not promise matching of other spellings. |
| Clients without browser headers | A write with neither `Origin` nor `Sec-Fetch-Site: same-origin` is refused ([origin check](../src/origin_check.ts)).                              | US-ORIGIN-01 states that scripts and other non-browser clients must send `Origin`.                                            |
| Shield CSRF                     | The package does not configure or disable Shield ([README](../README.md#refuse-cross-site-writes)).                                               | US-ORIGIN-01 leaves turning off token-based CSRF to the host.                                                                 |
| Scope of origin enforcement     | [OriginGuardMiddleware](../src/origin_guard_middleware.ts) skips GET, HEAD and OPTIONS and makes only an origin decision for other methods.       | US-ORIGIN-01 leaves safe-method semantics, authentication and authorisation to the host.                                      |
| Different parser policies       | [origins](../src/origins.ts) validates the public value strictly, but the list parser normalises parsed origins and has no environment check.     | US-ORIGIN-02 and US-ORIGIN-03 distinguish these validation policies.                                                          |
| Private networks only           | [isPrivatePeer](../src/private_peer.ts) covers loopback, RFC 1918 IPv4 ranges, `::1` and `fc00::/7`; link-local and other ranges are not trusted. | US-ORIGIN-04 leaves deployments with other proxy addresses to a host-written `trustProxy`.                                    |

The [installation story](US-ORIGIN-05-install-and-start.md) describes the installation example and the exports targeted by the packed consumer check.
