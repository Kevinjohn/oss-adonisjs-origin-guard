# Changelog

## Unreleased

## 0.3.2 - 2026-11-23

- Correction to 0.3.0, whose entry lists documentation only: 0.3.0 also added `createOriginCheck`,
  the same function as `createOriginGuard`, and the `@kevinjohn/adonisjs-origin-guard/types` entry
  for `OriginGuardConfig`, `PublicOrigin` and `UnsafeRequestHeaders`. Request behaviour, the 403
  body and the existing exports did not change.
- The `./types` entry now has a runtime module, so a side-effect import, a re-export or an inline
  type import kept at runtime resolves instead of failing with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- The package description calls the write check origin-check middleware instead of a guard.

## 0.3.1 - 2026-11-22

- Document the shipped `createOriginCheck` alias and the public `/types` entry, and use the alias
  in the middleware registration example.

## 0.3.0 - 2026-11-21

- Document and verify the package user stories and implementation flows.

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
