# Changelog

## Unreleased

## 0.2.1 - 2026-11-19

- Verify the packed release in a consumer before writing release outputs.
- Pass changed filenames literally to the formatter and reap timed-out check process groups.

## 0.2.0 - 2026-11-16

- Document eager HTTP startup validation, the required host environment setting, normalized origin
  parsing, direct guard configuration, proxy trust boundaries and the contributor runtime.
- Report invalid configured origins by entry position without echoing their values.
- Bound changed-check settlement after timeouts and interrupts, including failed signals and
  nonclosing output pipes.
- Reject test selections that execute only skipped or todo cases, and stop release packaging when
  a valid SHA-256 digest cannot be calculated.
- Check formatting for lockfile changes, avoid package builds for story-only edits, remove unused
  changed-check options and use the supported bundle source-map setting.
- Strengthen process-fixture readiness, cleanup, environment isolation, output collection and
  assertions against checks running after interruption.

## 0.1.0 - 2026-11-13

First release.

- `parseOrigins(list)` and `resolvePublicOrigin(value, environment, variable)`: bare HTTP(S) origin
  parsing, with HTTPS required in production and outside loopback.
- `createOriginGuard(config)`: a server middleware that refuses cross-site writes from `Origin` and
  `Sec-Fetch-Site` with 403 `Cross-site request rejected.`, and its evaluator
  `isTrustedUnsafeOrigin`.
- `isPrivatePeer(address)`: loopback and private-network check for `trustProxy`.
