# Changelog

## Unreleased

### Breaking changes

- Removed `createOriginGuard` and `createOriginCheck`. Use the package-root `defineConfig` in
  `config/origin_guard.ts` and register the server middleware from
  `@kevinjohn/adonisjs-origin-guard/origin_guard_middleware`.
- `defineConfig` takes a required `publicOrigin`, an optional comma-separated `allowedOrigins`
  list and an explicit `environment` (`development`, `production` or `test`). The app supplies
  the public origin explicitly. The package never infers it from request headers or grants
  default trust to additional origins.
- Origin settings now validate eagerly whenever AdonisJS boots the application, including web
  and console processes. Previously, eager validation followed the host's HTTP kernel preload
  and could be scoped to web boot. Set valid values for Ace commands that boot the app, too.
- The request decision and standalone helpers are unchanged. `GET`, `HEAD` and `OPTIONS` still
  pass through, and rejected writes still return `403` with
  `{ "error": "Cross-site request rejected." }`.

### Install and adopt

- To try the unreleased setup, run `pnpm build && pnpm pack` in this repository, then install the
  resulting tarball in the app with `pnpm add /absolute/path/to/archive.tgz`. For a fresh
  middleware setup, run `node ace configure @kevinjohn/adonisjs-origin-guard` with
  `@adonisjs/assembler` installed in the app. It creates `config/origin_guard.ts`, adds validation
  for `ORIGIN_GUARD_PUBLIC_ORIGIN` and `ORIGIN_GUARD_ALLOWED_ORIGINS` to `start/env.ts`, and
  prepends the middleware to the server stack. It adds blank placeholders to existing `.env` and
  `.env.example` files only for keys absent from both. Fill in the public origin and any additional
  write origins before booting the app. The scaffold passes `NODE_ENV` as `environment`.
- Capacity Lens and the Starter Examples remain on the released v0.4.0 tarball until they
  choose to update their pins after the next release.
- For the manual Capacity Lens migration, add `apps/backend/config/origin_guard.ts` and call
  `defineConfig` with
  `publicOrigin: publicOrigin.origin` from `#config/public_origin`,
  `allowedOrigins: corsOrigins.join(',')` using `corsOrigins` from `#config/cors`, and
  `environment: env.get('NODE_ENV')` with `env` from `#start/env`. These inputs reuse
  `CAPACITYLENS_PUBLIC_URL` or `APP_URL` and the CORS or development origins. This migration
  needs no `ORIGIN_GUARD_*` settings or Ace configure step.
- Register the middleware manually in Capacity Lens to preserve its position. Replace the local
  import in `apps/backend/start/kernel.ts` with
  `() => import('@kevinjohn/adonisjs-origin-guard/origin_guard_middleware')` in the existing
  server-stack slot after security headers. Remove the factory wrapper at
  `apps/backend/app/middleware/origin_guard_middleware.ts` and keep a single registration.
- The API, Hypermedia, Inertia React and Inertia Vue Starter Examples use the standalone
  `resolvePublicOrigin` helper. Their pin update requires no Origin Guard config, Ace configure
  step or middleware change.

See [Consumer adoption](https://github.com/Kevinjohn/oss-adonisjs-origin-guard/blob/8d3a782f587a11ef69a7a7e6b007e6ae284ecba7/DECISIONS.md#consumer-adoption)
for the integration details.

### Maintenance

- Require successful main CI for the release commit before packaging the GitHub release archive.

## 0.4.0 - 2026-11-24

- `parseOrigins` and `resolvePublicOrigin` now throw AdonisJS core's `InvalidArgumentsException`
  in place of a bare `Error` for invalid configuration.
- Add application examples to all public functions, including both middleware factory names.

## 0.3.3 - 2026-11-24

- Document how the public origin parser normalises entries, ignores blanks and reports invalid or wildcard origins.

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
