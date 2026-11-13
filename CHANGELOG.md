# Changelog

## Unreleased

## 0.1.0 - 2026-11-13

First release.

- `parseOrigins(list)` and `resolvePublicOrigin(value, environment, variable)`: bare HTTP(S) origin
  parsing, with HTTPS required in production and outside loopback.
- `createOriginGuard(config)`: a server middleware that refuses cross-site writes from `Origin` and
  `Sec-Fetch-Site` with 403 `Cross-site request rejected.`, and its evaluator
  `isTrustedUnsafeOrigin`.
- `isPrivatePeer(address)`: loopback and private-network check for `trustProxy`.
